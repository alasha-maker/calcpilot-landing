// ============================================================
// CalcPilot Combined Worker
// Handles: Auth, App serving (R2), Paddle webhooks, + SPA static assets
// ============================================================
//
// Required Environment Variables (set in Workers dashboard → Settings → Variables):
//   SUPABASE_URL          → https://tmzxuffhdmvfkahxgcfp.supabase.co
//   SUPABASE_ANON_KEY     → your Supabase anon/public key
//   SUPABASE_SERVICE_KEY  → your Supabase service_role key
//   PADDLE_WEBHOOK_SECRET → your Paddle webhook signing secret
//
// Required R2 Binding (Workers dashboard → Settings → Bindings):
//   Variable name: APP_BUCKET  → Bucket: calcpilot-app
//
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://calcpilot.cc',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── Health check (remove after debugging) ───────────────
    if (path === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        env: {
          SUPABASE_URL: !!env.SUPABASE_URL,
          SUPABASE_ANON_KEY: !!env.SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_KEY: !!env.SUPABASE_SERVICE_KEY,
          PADDLE_WEBHOOK_SECRET: !!env.PADDLE_WEBHOOK_SECRET,
          APP_BUCKET: !!env.APP_BUCKET,
        }
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── API Routes ──────────────────────────────────────────
    if (path === '/auth/session' && request.method === 'POST') {
      return handleSessionExchange(request, env, corsHeaders);
    }

    if (path === '/app' || path === '/app/') {
      return handleAppAccess(request, env);
    }

    if (path === '/webhook/paddle' && request.method === 'POST') {
      return handlePaddleWebhook(request, env);
    }

    // ── Static Assets (SPA) ─────────────────────────────────
    // Try serving the static file; fall back to index.html for SPA routing
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url).toString()));
    }
    return assetResponse;
  }
};

// ─── Session Exchange ─────────────────────────────────────────────────────────
async function handleSessionExchange(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { token } = body;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const user = await verifySupabaseToken(token, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return new Response(JSON.stringify({ error: 'No active subscription', redirect: '/signup' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': `calcpilot_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
    }
  });
}

// ─── App Access ───────────────────────────────────────────────────────────────
async function handleAppAccess(request, env) {
  const token = getSessionCookie(request);

  if (!token) {
    return Response.redirect('https://calcpilot.cc/login', 302);
  }

  const user = await verifySupabaseToken(token, env);
  if (!user) {
    return Response.redirect('https://calcpilot.cc/login', 302);
  }

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return Response.redirect('https://calcpilot.cc/signup', 302);
  }

  const appFile = await env.APP_BUCKET.get('SLD_VoltDrop_Manager.html');
  if (!appFile) {
    return new Response('App unavailable. Please contact support@calcpilot.cc', { status: 404 });
  }

  return new Response(appFile.body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
    }
  });
}

// ─── Paddle Webhook ───────────────────────────────────────────────────────────
async function handlePaddleWebhook(request, env) {
  const signature = request.headers.get('Paddle-Signature');
  if (!signature) return new Response('Unauthorized', { status: 401 });

  const body = await request.text();
  const isValid = await verifyPaddleSignature(body, signature, env.PADDLE_WEBHOOK_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(body);

  switch (event.event_type) {
    case 'transaction.completed':
      await linkCustomerToUser(event.data, env);
      break;
    case 'subscription.created':
    case 'subscription.updated':
      await updateSubscription(event.data, env);
      break;
    case 'subscription.canceled':
      await updateUserField(event.data.customer_id, { subscription_status: 'canceled' }, env);
      break;
    case 'subscription.past_due':
      await updateUserField(event.data.customer_id, { subscription_status: 'past_due' }, env);
      break;
  }

  return new Response('OK', { status: 200 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/calcpilot_session=([^;]+)/);
  return match ? match[1] : null;
}

async function verifySupabaseToken(token, env) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': env.SUPABASE_ANON_KEY,
    }
  });
  if (!res.ok) return null;
  return res.json();
}

async function getSubscriptionStatus(userId, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=subscription_status,trial_end`,
    {
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_KEY,
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function linkCustomerToUser(data, env) {
  const email = data.customer?.email;
  const customerId = data.customer_id;
  if (!email) return;

  await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        stripe_customer_id: customerId,
        subscription_status: 'trialing',
      })
    }
  );
}

async function updateSubscription(data, env) {
  await updateUserField(data.customer_id, {
    subscription_status: data.status,
    trial_end: data.trial_dates?.ends_at || null,
    subscription_end: data.current_billing_period?.ends_at || null,
  }, env);
}

async function updateUserField(customerId, fields, env) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?stripe_customer_id=eq.${customerId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(fields)
    }
  );
}

async function verifyPaddleSignature(body, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('='))
  );
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${ts}:${body}`));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === h1;
}
