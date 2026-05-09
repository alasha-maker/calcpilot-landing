// ============================================================
// CalcPilot Combined Worker
// Handles: Auth, App serving (R2), Paddle webhooks, + SPA static assets
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

    // ── Health check ────────────────────────────────────────
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
      }, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── API Routes ──────────────────────────────────────────
    if (path === '/auth/session' && request.method === 'POST') {
      return handleSessionExchange(request, env, corsHeaders);
    }

    if (path === '/auth/verify') {
      return handleVerifySession(request, env, corsHeaders);
    }

    if (path === '/app' || path === '/app/') {
      return handleAppAccess(request, env);
    }

    if (path === '/webhook/paddle' && request.method === 'POST') {
      return handlePaddleWebhook(request, env);
    }

    // ── Static Assets (SPA) ─────────────────────────────────
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

// ─── Verify Session (called by injected app script) ───────────────────────────
async function handleVerifySession(request, env, corsHeaders) {
  const token = getSessionCookie(request);
  if (!token) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const user = await verifySupabaseToken(token, env);
  if (!user) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ valid: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ─── App Access ───────────────────────────────────────────────────────────────
async function handleAppAccess(request, env) {
  const token = getSessionCookie(request);
  if (!token) return Response.redirect('https://calcpilot.cc/login', 302);

  const user = await verifySupabaseToken(token, env);
  if (!user) return Response.redirect('https://calcpilot.cc/login', 302);

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return Response.redirect('https://calcpilot.cc/signup', 302);
  }

  const appFile = await env.APP_BUCKET.get('SLD_VoltDrop_Manager.html');
  if (!appFile) {
    return new Response('App unavailable. Please contact support@calcpilot.cc', { status: 404 });
  }

  // Read HTML and inject protection layer
  let html = await appFile.text();
  const protection = buildProtectionScript(user.email, new Date().toISOString());

  // Inject as first thing inside <head> so it runs before anything else
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + protection);
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', '<html>' + protection);
  } else {
    html = protection + html;
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "frame-ancestors 'self'",
    }
  });
}

// ─── Protection Script Builder ────────────────────────────────────────────────
function buildProtectionScript(userEmail, timestamp) {
  return `<script>
(function(){
  'use strict';

  // ── Session verification ──────────────────────────────────
  // Calls back to server every 5 minutes. If session is gone or
  // subscription canceled, the page is immediately blanked.
  // A saved copy of this file will ALSO fail this check because
  // it can only succeed when served from calcpilot.cc with a valid cookie.
  async function verifySession() {
    try {
      const r = await fetch('https://calcpilot.cc/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });
      if (!r.ok) lockPage('Session expired or subscription inactive.');
    } catch(e) {
      lockPage('Unable to verify session. Please check your connection.');
    }
  }

  function lockPage(msg) {
    document.documentElement.innerHTML = [
      '<html><head><style>',
      '*{margin:0;padding:0;box-sizing:border-box}',
      'body{background:#0f172a;color:#f1f5f9;font-family:system-ui,sans-serif;',
      'display:flex;align-items:center;justify-content:center;',
      'height:100vh;flex-direction:column;gap:20px;text-align:center;padding:24px}',
      'h2{font-size:1.5rem;color:#f87171}',
      'p{color:#94a3b8;max-width:400px;line-height:1.6}',
      'a{padding:12px 28px;background:#3b82f6;color:#fff;border-radius:10px;',
      'text-decoration:none;font-weight:600;display:inline-block}',
      '</style></head><body>',
      '<h2>&#128274; Access Restricted</h2>',
      '<p>' + msg + '</p>',
      '<a href="https://calcpilot.cc/login">Log In Again</a>',
      '</body></html>'
    ].join('');
  }

  // Check immediately on load, then every 5 minutes
  verifySession();
  setInterval(verifySession, 5 * 60 * 1000);

  // ── Block keyboard shortcuts ──────────────────────────────
  document.addEventListener('keydown', function(e) {
    // F12 (DevTools)
    if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl/Cmd + S (Save), U (View Source), P (Print)
    if ((e.ctrlKey || e.metaKey) && ['s','u','p'].includes(e.key.toLowerCase())) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl/Cmd + Shift + I/J/C/K (DevTools panels)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','j','c','k'].includes(e.key.toLowerCase())) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
  }, true);

  // ── Block right-click context menu ───────────────────────
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  }, true);

  // ── DevTools detection — blur and lock page ───────────────
  // Detects when browser window is significantly resized by DevTools panel
  (function detectDevtools() {
    const threshold = 160;
    let devtoolsOpen = false;
    setInterval(function() {
      const widthOpen = window.outerWidth - window.innerWidth > threshold;
      const heightOpen = window.outerHeight - window.innerHeight > threshold;
      if ((widthOpen || heightOpen) && !devtoolsOpen) {
        devtoolsOpen = true;
        document.body.style.filter = 'blur(10px) brightness(0.2)';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
      } else if (!widthOpen && !heightOpen && devtoolsOpen) {
        devtoolsOpen = false;
        document.body.style.filter = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
      }
    }, 500);
  })();

  // ── Console warning + watermark ───────────────────────────
  const _wm = btoa('${userEmail}|${timestamp}');
  setTimeout(function() {
    console.clear();
    console.log('%c⚠ STOP!', 'color:#ef4444;font-size:48px;font-weight:900');
    console.log('%cThis is a private, licensed application.', 'color:#f1f5f9;font-size:16px;font-weight:bold');
    console.log('%cLicensed to: ${userEmail}', 'color:#94a3b8;font-size:13px');
    console.log('%cUnauthorized copying, distribution, or reverse engineering is strictly prohibited.', 'color:#94a3b8;font-size:13px');
    console.log('%cWatermark: ' + _wm, 'color:#1e293b;font-size:1px'); // hidden watermark
  }, 100);

  // Prevent console from being cleared (makes the warning persistent)
  const _cc = console.clear;
  console.clear = function() { _cc(); };

})();
</script>`;
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
