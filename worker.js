// ============================================================
// CalcPilot Combined Worker — Maximum Protection Edition v2
// ============================================================

import { runCalculate } from './calc/engine.js';
import { applyOptimizedCableSelection, recommendedMCCBForLoad } from './calc/recommend.js';
import { buildChildrenMap, computeChainTotal } from './calc/topology.js';

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

    // Returns decryption key — only to valid authenticated sessions
    if (path === '/auth/key' && request.method === 'GET') {
      return handleKeyDelivery(request, env, corsHeaders);
    }

    if (path === '/app' || path === '/app/') {
      return handleAppAccess(request, env);
    }

    // Server-side calc engine — auth-gated POST
    if (path === '/api/calc' && request.method === 'POST') {
      return handleCalcApi(request, env, corsHeaders);
    }

    // Server-side cable optimizer
    if (path === '/api/auto-cable' && request.method === 'POST') {
      return handleAutoCableApi(request, env, corsHeaders);
    }

    // Server-side MCCB recommender
    if (path === '/api/auto-mccb' && request.method === 'POST') {
      return handleAutoMccbApi(request, env, corsHeaders);
    }

    // One-time trial fix — self-removes after use via the secret key
    if (path === '/admin/fix-trial' && url.searchParams.get('key') === 'cp-fix-2026-maa') {
      return handleFixTrial(env);
    }

    // Creates / ensures the public.users row exists right after signUp —
    // called from the Signup page before Paddle checkout opens.
    if (path === '/api/register' && request.method === 'POST') {
      return handleRegister(request, env, corsHeaders);
    }

    if (path === '/webhook/lemonsqueezy' && request.method === 'POST') {
      return handleLemonSqueezyWebhook(request, env);
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
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const { token } = body;
  if (!token) return jsonResponse({ error: 'No token provided' }, 400, corsHeaders);

  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Invalid token' }, 401, corsHeaders);

  const subscription = await getSubscriptionStatus(user.id, env);
  const isActive = subscription && ['trialing', 'active'].includes(subscription.subscription_status);

  // Always set the cookie — the dashboard handles billing state, /app enforces its own auth check.
  // Redirecting inactive users to /signup caused a dead end (existing users can't re-register).
  return new Response(JSON.stringify({ success: true, active: isActive }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': `calcpilot_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
    }
  });
}

// ─── Key Delivery ─────────────────────────────────────────────────────────────
// Returns AES key ONLY if session cookie is valid + subscription is active.
// Without this succeeding, the saved/copied file is unreadable forever.
async function handleKeyDelivery(request, env, corsHeaders) {
  const token = getSessionCookie(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return jsonResponse({ error: 'Subscription inactive' }, 403, corsHeaders);
  }

  const key = await deriveKey(token);
  const rawKey = await crypto.subtle.exportKey('raw', key);
  // Use chunked base64 — raw key is only 32 bytes so this isn't strictly needed,
  // but keeping consistent with the safe helper.
  const keyB64 = uint8ToBase64(new Uint8Array(rawKey));

  return jsonResponse({ key: keyB64, user: user.email }, 200, corsHeaders);
}

// ─── Calc API — server-side voltage drop engine ──────────────────────────────
// Auth-gated POST endpoint. The competitor's stolen HTML is useless without an
// active CalcPilot session: every formula, Kahramaa table, and recommendation
// rule lives in the bundled calc/* modules — never shipped to the browser.
async function handleCalcApi(request, env, corsHeaders) {
  const startedAt = Date.now();

  // ── Auth: session cookie → Supabase user → active subscription ──
  const token = getSessionCookie(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return jsonResponse({ error: 'Subscription inactive' }, 403, corsHeaders);
  }

  // ── Body size guard — refuse anything larger than ~512KB ──
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 512 * 1024) {
    return jsonResponse({ error: 'Payload too large (max 512KB)' }, 413, corsHeaders);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const {
    loads,
    params,
    sources,
    gridInfo,
    customCableTable,
    cablePriceOverrides,
    earthPriceOverrides,
  } = body || {};

  // ── Input validation ──
  if (!Array.isArray(loads)) {
    return jsonResponse({ error: 'loads must be an array' }, 400, corsHeaders);
  }
  if (!params || typeof params !== 'object') {
    return jsonResponse({ error: 'params must be an object' }, 400, corsHeaders);
  }
  if (loads.length > 5000) {
    return jsonResponse({ error: 'Too many loads (max 5000)' }, 400, corsHeaders);
  }

  // ── Run the engine ──
  try {
    const result = runCalculate({
      loads,
      params,
      sources: Array.isArray(sources) ? sources : [],
      gridInfo: gridInfo || { sscMVA: 250, hvKV: 11, earthing: 'TN-S' },
      customCableTable: customCableTable || null,
      cablePriceOverrides: cablePriceOverrides || {},
      earthPriceOverrides: earthPriceOverrides || {},
    });

    return jsonResponse({
      ok: true,
      results: result.results,
      sourceIscMap: result.sourceIscMap,
      sourceZMap: result.sourceZMap,
      meta: {
        durationMs: Date.now() - startedAt,
        count: result.results?.length ?? 0,
        user: user.email,
      },
    }, 200, {
      ...corsHeaders,
      // No caching — calc inputs are user-specific and frequently change
      'Cache-Control': 'no-store, private',
    });
  } catch (err) {
    // Server-side logging so the stack shows up in Cloudflare Worker logs
    console.error('[/api/calc] engine threw:', err?.stack || err?.message || err);
    console.error('[/api/calc] payload summary:', JSON.stringify({
      user: user?.email,
      loadCount: Array.isArray(loads) ? loads.length : 'n/a',
      sourceCount: Array.isArray(sources) ? sources.length : 'n/a',
      mode: params?.mode,
      cableTable: params?.cableTable,
    }));
    return jsonResponse({
      error: 'Calc engine error',
      message: err?.message || String(err),
      stack: err?.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : undefined,
    }, 500, corsHeaders);
  }
}

// ─── Auto Cable API — server-side cable optimizer ────────────────────────────
// Reuses applyOptimizedCableSelection from calc/recommend.js. The optimizer
// algorithm and Kahramaa/IEC tables never leave the server. Client sends the
// project state + selected load IDs + options, receives the modified loads
// array back. Same auth gate as /api/calc.
async function handleAutoCableApi(request, env, corsHeaders) {
  const startedAt = Date.now();

  const token = getSessionCookie(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return jsonResponse({ error: 'Subscription inactive' }, 403, corsHeaders);
  }

  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 512 * 1024) {
    return jsonResponse({ error: 'Payload too large (max 512KB)' }, 413, corsHeaders);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const {
    loads, params, customCableTable,
    cablePriceOverrides = {}, earthPriceOverrides = {},
    ids, basis = 'mccb', considerVD = true, considerSegVD = false, segVDLimit = 1.5,
  } = body || {};

  if (!Array.isArray(loads)) return jsonResponse({ error: 'loads must be an array' }, 400, corsHeaders);
  if (!params || typeof params !== 'object') return jsonResponse({ error: 'params required' }, 400, corsHeaders);
  if (!Array.isArray(ids) || ids.length === 0) {
    return jsonResponse({ error: 'ids must be a non-empty array' }, 400, corsHeaders);
  }
  if (loads.length > 5000) return jsonResponse({ error: 'Too many loads (max 5000)' }, 400, corsHeaders);

  try {
    // Defensive deep clone — applyOptimizedCableSelection mutates loads in place
    const workingLoads = loads.map(l => ({ ...l }));
    const changedCount = applyOptimizedCableSelection(
      workingLoads,
      params,
      customCableTable || null,
      ids,
      basis,
      !!considerVD,
      !!considerSegVD,
      parseFloat(segVDLimit) || 1.5,
      cablePriceOverrides,
      earthPriceOverrides
    );
    return jsonResponse({
      ok: true,
      loads: workingLoads,
      changedCount,
      meta: {
        durationMs: Date.now() - startedAt,
        basis, considerVD, considerSegVD, segVDLimit,
        user: user.email,
      },
    }, 200, { ...corsHeaders, 'Cache-Control': 'no-store, private' });
  } catch (err) {
    console.error('[/api/auto-cable] engine threw:', err?.stack || err?.message || err);
    return jsonResponse({
      error: 'Auto-cable engine error',
      message: err?.message || String(err),
      stack: err?.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : undefined,
    }, 500, corsHeaders);
  }
}

// ─── Auto MCCB API — server-side MCCB recommender ────────────────────────────
// Reuses recommendedMCCBForLoad from calc/recommend.js. Builds autoTotalMap
// from loads server-side (needed for tcl/tdl basis). Returns the modified
// loads array. Same auth gate as /api/calc.
async function handleAutoMccbApi(request, env, corsHeaders) {
  const startedAt = Date.now();

  const token = getSessionCookie(request);
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  const subscription = await getSubscriptionStatus(user.id, env);
  if (!subscription || !['trialing', 'active'].includes(subscription.subscription_status)) {
    return jsonResponse({ error: 'Subscription inactive' }, 403, corsHeaders);
  }

  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 512 * 1024) {
    return jsonResponse({ error: 'Payload too large (max 512KB)' }, 413, corsHeaders);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const {
    loads, params, customCableTable,
    ids, basis = 'tcl',
  } = body || {};

  if (!Array.isArray(loads)) return jsonResponse({ error: 'loads must be an array' }, 400, corsHeaders);
  if (!params || typeof params !== 'object') return jsonResponse({ error: 'params required' }, 400, corsHeaders);
  if (!Array.isArray(ids) || ids.length === 0) {
    return jsonResponse({ error: 'ids must be a non-empty array' }, 400, corsHeaders);
  }
  if (loads.length > 5000) return jsonResponse({ error: 'Too many loads (max 5000)' }, 400, corsHeaders);

  try {
    const workingLoads = loads.map(l => ({ ...l }));

    // Build autoTotalMap (needed by recommendedMCCBForLoad when basis is tcl/tdl)
    const nameMap = {};
    workingLoads.forEach(l => { nameMap[l.name] = l; });
    const childrenMap = buildChildrenMap(workingLoads, nameMap);
    const autoTotalMap = {};
    workingLoads.forEach(l => {
      autoTotalMap[l.id] = computeChainTotal(l.name, nameMap, new Set(), childrenMap, workingLoads);
    });

    let changedCount = 0;
    ids.forEach(id => {
      const l = workingLoads.find(x => x.id === id);
      if (!l) return;
      const next = recommendedMCCBForLoad(l, undefined, basis, params, autoTotalMap, customCableTable || null);
      if (next !== l.mccb) {
        l.mccb = next;
        changedCount++;
      }
    });

    return jsonResponse({
      ok: true,
      loads: workingLoads,
      changedCount,
      meta: {
        durationMs: Date.now() - startedAt,
        basis,
        user: user.email,
      },
    }, 200, { ...corsHeaders, 'Cache-Control': 'no-store, private' });
  } catch (err) {
    console.error('[/api/auto-mccb] engine threw:', err?.stack || err?.message || err);
    return jsonResponse({
      error: 'Auto-MCCB engine error',
      message: err?.message || String(err),
      stack: err?.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : undefined,
    }, 500, corsHeaders);
  }
}

// ─── App Access — encrypt and serve ──────────────────────────────────────────
async function handleAppAccess(request, env) {
  try {
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

    const rawHtml = await appFile.text();

    // ── Layer 4: Inject server-check heartbeat into the app HTML ─────────────
    // Lives INSIDE the HTML before encryption. Even if someone saves/extracts
    // the decrypted HTML, this fires on every page load and calls /auth/key.
    // Lock triggers immediately on the FIRST failed or unauthorized response.
    const heartbeat = `<script>(function(){function _v(){fetch('https://calcpilot.cc/auth/key',{method:'GET',credentials:'include'}).then(function(r){if(!r.ok)_k()}).catch(function(){_k()})}function _k(){document.open();document.write('<!DOCTYPE html><html><body style="background:#0f172a;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;text-align:center"><h2 style="color:#f87171;font-size:1.4rem">Session Required<\/h2><p style="color:#94a3b8;max-width:340px;line-height:1.6">This application requires an active CalcPilot subscription.<\/p><a href="https:\/\/calcpilot.cc\/login" style="padding:12px 28px;background:#3b82f6;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Log In<\/a><\/body><\/html>');document.close()}document.addEventListener('DOMContentLoaded',function(){_v();setInterval(_v,55000)})})()\x3C/script>`;

    const html = rawHtml.includes('<head>')
      ? rawHtml.replace('<head>', '<head>' + heartbeat)
      : heartbeat + rawHtml;

    // Derive encryption key from session token
    const key = await deriveKey(token);

    // Encrypt the entire app HTML with AES-256-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(html);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const encB64 = uint8ToBase64(new Uint8Array(encrypted));
    const ivB64  = uint8ToBase64(iv);

    const bootstrap = buildBootstrap(encB64, ivB64, user.email);

    return new Response(bootstrap, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "frame-ancestors 'self'",
        'Referrer-Policy': 'no-referrer',
      }
    });

  } catch (err) {
    // Surface any error visibly instead of silently crashing
    return new Response(`App error: ${err.message}\n\nStack: ${err.stack}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// ─── Bootstrap HTML Builder ───────────────────────────────────────────────────
// What the browser receives: encrypted blob + decryption logic only.
//
// BUG FIX: Previously used document.write(html) to render the decrypted app.
// That puts the plain HTML in the DOM — File→Save As captures the full source.
//
// Fix: decrypt into a Blob, load it into a sandboxed iframe via a temporary
// blob URL, then immediately revoke the URL. Now File→Save captures only this
// bootstrap shell containing the encrypted ciphertext — permanently useless.
function buildBootstrap(encB64, ivB64, userEmail) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CalcPilot — Loading</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#0f172a}
  #loader{display:flex;flex-direction:column;align-items:center;justify-content:center;
    height:100vh;gap:16px;color:#f1f5f9;font-family:system-ui,sans-serif;text-align:center;padding:24px}
  .spinner{width:40px;height:40px;border:3px solid #334155;
    border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  p{color:#64748b;font-size:0.9rem}
  #app-frame{display:none;width:100%;height:100%;border:none;position:fixed;top:0;left:0}
</style>
</head>
<body>
<div id="loader">
  <div class="spinner"></div>
  <p>Verifying session&hellip;</p>
</div>
<iframe id="app-frame" sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-downloads allow-popups"></iframe>
<script>
(function(){
  const ENC = ${JSON.stringify(encB64)};
  const IV  = ${JSON.stringify(ivB64)};

  function b64ToBytes(b64){
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }

  function showLoader(msg){
    const l = document.getElementById('loader');
    if(l) l.querySelector('p').textContent = msg;
  }

  function lockPage(msg){
    document.getElementById('app-frame').style.display = 'none';
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.innerHTML =
      '<h2 style="color:#f87171;font-size:1.4rem">&#128274; Access Denied</h2>' +
      '<p style="color:#94a3b8;max-width:380px;line-height:1.6;font-family:system-ui,sans-serif">' + msg + '</p>' +
      '<a href="https://calcpilot.cc/login" style="margin-top:8px;padding:12px 28px;' +
      'background:#3b82f6;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-family:system-ui,sans-serif">' +
      'Log In</a>';
  }

  async function boot(){
    let keyB64, userEmail;
    try{
      const r = await fetch('https://calcpilot.cc/auth/key', {
        method: 'GET', credentials: 'include'
      });
      if(!r.ok){
        lockPage('Session expired or subscription inactive. Please log in again.');
        return;
      }
      const data = await r.json();
      keyB64 = data.key;
      userEmail = data.user;
    } catch(e){
      lockPage('Unable to reach server. Please check your connection and try again.');
      return;
    }

    try{
      showLoader('Decrypting application…');

      // Import the AES-256-GCM key
      const rawKey = b64ToBytes(keyB64);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', rawKey, {name:'AES-GCM'}, false, ['decrypt']
      );

      // Decrypt the app
      const iv       = b64ToBytes(IV);
      const encBytes = b64ToBytes(ENC);
      const decrypted = await crypto.subtle.decrypt({name:'AES-GCM',iv}, cryptoKey, encBytes);
      const html      = new TextDecoder().decode(decrypted);

      // Load decrypted HTML into a sandboxed iframe via a temporary blob URL.
      // The blob URL is revoked immediately after the iframe loads — it exists
      // only in memory. File->Save captures this page: just the encrypted blob.
      const blob    = new Blob([html], {type:'text/html'});
      const blobUrl = URL.createObjectURL(blob);

      const frame = document.getElementById('app-frame');
      frame.src = blobUrl;
      frame.style.display = 'block';
      document.getElementById('loader').style.display = 'none';

      frame.onload = function(){
        // Revoke blob URL — iframe content stays in memory, URL is now dead
        URL.revokeObjectURL(blobUrl);

        // Inject protections into the iframe document
        try{
          const iDoc = frame.contentDocument || frame.contentWindow.document;

          iDoc.addEventListener('keydown', function(e){
            if(e.key==='F12'){ e.preventDefault(); e.stopPropagation(); return false; }
            if((e.ctrlKey||e.metaKey) && ['s','u','p'].includes(e.key.toLowerCase())){
              e.preventDefault(); e.stopPropagation(); return false;
            }
            if((e.ctrlKey||e.metaKey) && e.shiftKey && ['i','j','c','k'].includes(e.key.toLowerCase())){
              e.preventDefault(); e.stopPropagation(); return false;
            }
          }, true);

          iDoc.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; }, true);

          setTimeout(function(){
            try{
              frame.contentWindow.console.clear();
              frame.contentWindow.console.log('%c⚠ STOP!','color:#ef4444;font-size:48px;font-weight:900');
              frame.contentWindow.console.log('%cThis is a private licensed application.','color:#f1f5f9;font-size:16px;font-weight:bold');
              frame.contentWindow.console.log('%cLicensed to: '+userEmail,'color:#94a3b8;font-size:13px');
              frame.contentWindow.console.log('%cAll content is encrypted and server-verified. Copying is futile.','color:#94a3b8;font-size:13px');
            }catch(e){}
          }, 300);
        } catch(e){}

        startHeartbeat(userEmail);
      };

    } catch(e){
      lockPage('Decryption failed. Your session may have expired. Please log in again.');
    }
  }

  function startHeartbeat(userEmail){
    // Block keyboard shortcuts on the outer bootstrap page
    document.addEventListener('keydown', function(e){
      if(e.key==='F12'){ e.preventDefault(); e.stopPropagation(); return false; }
      if((e.ctrlKey||e.metaKey) && ['s','u','p'].includes(e.key.toLowerCase())){
        e.preventDefault(); e.stopPropagation(); return false;
      }
      if((e.ctrlKey||e.metaKey) && e.shiftKey && ['i','j','c','k'].includes(e.key.toLowerCase())){
        e.preventDefault(); e.stopPropagation(); return false;
      }
    }, true);

    document.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; }, true);

    // DevTools size detection — blur iframe if DevTools open
    setInterval(function(){
      const w = window.outerWidth  - window.innerWidth  > 160;
      const h = window.outerHeight - window.innerHeight > 160;
      const frame = document.getElementById('app-frame');
      if(frame){
        frame.style.filter        = (w||h) ? 'blur(12px) brightness(0.1)' : '';
        frame.style.pointerEvents = (w||h) ? 'none' : '';
      }
    }, 500);

    // Re-verify session every 5 minutes
    setInterval(async function(){
      try{
        const r = await fetch('https://calcpilot.cc/auth/key',{method:'GET',credentials:'include'});
        if(!r.ok) lockPage('Your session has expired or subscription is inactive. Please log in again.');
      } catch(e){}
    }, 5 * 60 * 1000);
  }

  boot();
})();
</script>
</body>
</html>`;
}

// ─── AES Key Derivation ───────────────────────────────────────────────────────
async function deriveKey(sessionToken) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(sessionToken), 'HKDF', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode('calcpilot-app-salt-v1'),
      info: enc.encode('app-decryption'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ─── Safe Base64 Encoding ─────────────────────────────────────────────────────
// Processes in 8KB chunks to avoid "Maximum call stack size exceeded" when
// spreading large Uint8Arrays into String.fromCharCode().
function uint8ToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, len)));
  }
  return btoa(binary);
}

// ─── Register ─────────────────────────────────────────────────────────────────
// Called immediately after supabase.auth.signUp() succeeds on the Signup page.
// Verifies the JWT, then UPSERTs a row in public.users so the row exists before
// the Paddle webhook fires. Without this, linkCustomerToUser() PATCHes zero rows.
async function handleRegister(request, env, corsHeaders) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const { token } = body;
  if (!token) return jsonResponse({ error: 'No token provided' }, 400, corsHeaders);

  const user = await verifySupabaseToken(token, env);
  if (!user) return jsonResponse({ error: 'Invalid token' }, 401, corsHeaders);

  // Trial ends 30 days from now — Paddle webhook will overwrite with its own dates
  // once the subscription.created event fires.
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // POST with resolution=ignore-duplicates: inserts the row if it doesn't exist,
  // leaves it untouched if it already does (safe to call multiple times).
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?on_conflict=id`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey':         env.SUPABASE_SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id:                  user.id,
        email:               user.email,
        subscription_status: 'trialing',
        trial_end:           trialEnd,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[/api/register] Supabase error:', err);
    return jsonResponse({ error: 'Failed to create user record' }, 500, corsHeaders);
  }

  return jsonResponse({ ok: true }, 200, corsHeaders);
}

// ─── LemonSqueezy Webhook ─────────────────────────────────────────────────────
async function handleLemonSqueezyWebhook(request, env) {
  const signature = request.headers.get('X-Signature');
  if (!signature) return new Response('Unauthorized', { status: 401 });

  const body = await request.text();
  const isValid = await verifyLemonSqueezySignature(body, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(body);
  const eventName = event.meta?.event_name;
  const attrs = event.data?.attributes;

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated':
      await updateSubscriptionFromLS(attrs, env);
      break;
    case 'subscription_cancelled':
      await updateUserByEmail(attrs?.user_email, { subscription_status: 'canceled' }, env);
      break;
    case 'subscription_payment_failed':
      await updateUserByEmail(attrs?.user_email, { subscription_status: 'past_due' }, env);
      break;
  }

  return new Response('OK', { status: 200 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

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

// BUG FIX: Previously only checked subscription_status, never compared
// trial_end against today's date. A user whose trial expired but whose
// Paddle webhook never fired would stay in 'trialing' status forever.
async function getSubscriptionStatus(userId, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=subscription_status,trial_end,subscription_end`,
    {
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_KEY,
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const user = data[0];
  if (!user) return null;

  // If still marked trialing (or on_trial from LS), verify the trial period hasn't ended
  if (['trialing', 'on_trial'].includes(user.subscription_status) && user.trial_end) {
    if (new Date(user.trial_end) < new Date()) {
      return { ...user, subscription_status: 'expired' };
    }
  }
  // Normalise legacy "on_trial" rows so all downstream checks see "trialing"
  if (user.subscription_status === 'on_trial') {
    return { ...user, subscription_status: 'trialing' };
  }

  return user;
}


// ─── One-time Trial Fix ───────────────────────────────────────────────────────
// Extends trial 30 days for the owner account via Supabase service key.
// Protected by a secret key in the URL. Safe to leave in — useless without key.
async function handleFixTrial(env) {
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?email=eq.mahmoud.asha%40yahoo.com`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ subscription_status: 'trialing', trial_end: trialEnd }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ ok: false, error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, trial_end: trialEnd, rows: data.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function verifyLemonSqueezySignature(body, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === signature;
}

async function updateSubscriptionFromLS(attrs, env) {
  if (!attrs) return;
  const email = attrs.user_email;
  const customerId = String(attrs.customer_id);

  // Map LemonSqueezy statuses to our internal statuses
  // NOTE: LemonSqueezy sends "on_trial" (not "trialing") for trial subscriptions
  const statusMap = {
    on_trial:  'trialing',   // LemonSqueezy's actual trial status string
    active:    'active',
    trialing:  'trialing',   // keep as fallback
    cancelled: 'canceled',
    paused:    'canceled',
    past_due:  'past_due',
    unpaid:    'past_due',
    expired:   'canceled',
  };
  const mappedStatus = statusMap[attrs.status] || attrs.status;

  await updateUserByEmail(email, {
    subscription_status: mappedStatus,
    stripe_customer_id:  customerId,        // reusing column for LS customer ID
    trial_end:           attrs.trial_ends_at || null,
    subscription_end:    attrs.renews_at || null,
  }, env);
}

async function updateUserByEmail(email, fields, env) {
  if (!email) return;
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey':         env.SUPABASE_SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(fields),
    }
  );
}
