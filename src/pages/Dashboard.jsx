import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "../../landing-new.css";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp"
);

const STORE = "calcpilot";
const VARIANTS = {
  monthly: "93d2c450-10b6-4fff-b8f5-4a94dd473291",
  annual:  "404236b2-e1db-4af8-b365-6f60c20f1c66",
};

function loadLemonSqueezy() {
  return new Promise((resolve, reject) => {
    if (window.LemonSqueezy) { resolve(window.LemonSqueezy); return; }
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => { window.createLemonSqueezy(); resolve(window.LemonSqueezy); };
    script.onerror = () => reject(new Error("Failed to load LemonSqueezy"));
    document.head.appendChild(script);
  });
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const cameFromExpired = searchParams.get("expired") === "1";

  const [user, setUser]           = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [plan, setPlan]           = useState("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }

      setUser(session.user);

      // Ensure users row exists (safe no-op if already there)
      try {
        await fetch("https://calcpilot.cc/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: session.access_token }),
        });
      } catch (_) {}

      // Refresh the session cookie every time dashboard loads.
      // The cookie has a finite Max-Age — refreshing here means LAUNCH APP
      // will always have a valid cookie immediately after viewing the dashboard.
      try {
        await fetch("https://calcpilot.cc/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: session.access_token }),
        });
      } catch (_) {}

      const { data } = await supabase
        .from("users")
        .select("subscription_status, trial_end, subscription_end, stripe_customer_id")
        .eq("id", session.user.id)
        .single();

      setSubscription(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleLaunchApp = async () => {
    // Client-side expiry guard — no redirect needed, just scroll to upgrade
    if (trialExpiredByDate || !canLaunch) {
      document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Always get the freshest possible token from Supabase (client auto-refreshes
    // if the stored JWT is near-expiry) and immediately stamp a new session cookie.
    // This fixes cases where the background refresh on page load failed silently.
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession?.access_token) {
        await fetch("https://calcpilot.cc/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: freshSession.access_token }),
        });
      }
    } catch (_) {}

    window.location.href = `/app?s=${Date.now()}`;
  };

  const handleSubscribe = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const checkoutUrl = `https://${STORE}.lemonsqueezy.com/checkout/buy/${VARIANTS[plan]}?checkout[email]=${encodeURIComponent(user.email)}&checkout[success_url]=https://calcpilot.cc/dashboard`;
      await loadLemonSqueezy();
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } catch {
      setCheckoutError("Failed to open checkout. Please try again.");
    }
    setCheckoutLoading(false);
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  if (loading) {
    return (
      <div style={{ background: '#06080b', minHeight: '100vh', fontFamily: '"Inter Tight", system-ui, sans-serif' }}
           className="flex items-center justify-center">
        <div className="mono text-zinc-500" style={{ fontSize: '11px', letterSpacing: '0.15em' }}>LOADING...</div>
      </div>
    );
  }

  const status      = subscription?.subscription_status;
  const isTrialing  = status === "trialing" || status === "on_trial";
  const isActive    = isTrialing || status === "active";
  const hasBilling  = !!subscription?.stripe_customer_id;
  const trialDays   = daysLeft(subscription?.trial_end);

  // Client-side date check — DB may still say "trialing" even after trial_end has passed
  const trialExpiredByDate = isTrialing && subscription?.trial_end
    && new Date(subscription.trial_end) < new Date();

  // canLaunch = subscription is active AND (if trialing) trial hasn't expired yet
  const canLaunch       = isActive && !trialExpiredByDate;
  const needsUpgrade    = isTrialing && !hasBilling && !trialExpiredByDate; // on trial, no card, not yet expired
  const needsReactivate = !isActive || trialExpiredByDate;                  // expired or canceled

  // Urgency colour for trial countdown
  const trialColour = trialDays === null ? '#94a3b8'
    : trialDays <= 3  ? '#f87171'
    : trialDays <= 7  ? '#fb923c'
    : trialDays <= 14 ? '#fbbf24'
    : '#4ade80';

  return (
    <div style={{ background: '#06080b', minHeight: '100vh', fontFamily: '"Inter Tight", system-ui, sans-serif', color: '#e6e7e9' }}
         className="flex flex-col">

      {/* ── NAV ── */}
      <header className="border-b rule" style={{ background: 'rgba(6,8,11,0.95)' }}>
        <div className="wrap flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
            <div className="mono font-bold tracking-tight flex items-center gap-1.5" style={{ fontSize: '16px' }}>
              <span className="text-cyan-300">SLD</span><span className="text-zinc-700">·</span><span className="text-pink-400">VD</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-zinc-800"></div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold tracking-tight">CalcPilot</div>
              <div className="mono text-zinc-500" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>EE DESIGN PLATFORM</div>
            </div>
          </Link>
          <div className="flex items-center gap-6">
            <span className="mono text-zinc-500 hidden sm:block" style={{ fontSize: '11px' }}>{user?.email}</span>
            <button onClick={handleLogout}
              className="mono text-zinc-400 hover:text-white transition-colors"
              style={{ fontSize: '11px', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}>
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      <main className="wrap py-12 space-y-6" style={{ maxWidth: '720px' }}>

        {/* ── Welcome ── */}
        <div className="mb-2">
          <div className="eyebrow mb-3"><span className="num">[01]</span>Dashboard</div>
          <h1 className="display text-white" style={{ fontSize: '40px' }}>Welcome back.</h1>
        </div>

        {/* ── Trial Expired Alert — shown when user tried to launch the app ── */}
        {(cameFromExpired || needsReactivate) && (
          <div className="px-5 py-5 flex items-start gap-4"
               style={{ background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.35)' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>🔒</span>
            <div className="flex-1">
              <div className="font-semibold text-red-400" style={{ fontSize: '15px' }}>
                {cameFromExpired ? 'Your free trial has ended' : 'Subscription inactive'}
              </div>
              <div className="text-zinc-400 mt-1" style={{ fontSize: '13px', lineHeight: '1.55' }}>
                {cameFromExpired
                  ? 'Access to the app requires an active subscription. Choose a plan below to continue — setup takes under 2 minutes.'
                  : 'Your subscription is no longer active. Reactivate below to restore full access.'}
              </div>
              <button
                onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="mono mt-3 inline-block"
                style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#f87171', background: 'none', border: '1px solid rgba(248,81,73,0.4)', padding: '6px 14px', cursor: 'pointer' }}>
                VIEW PLANS ↓
              </button>
            </div>
          </div>
        )}

        {/* ── Trial Banner — only when trial is actively running (>0 days left) ── */}
        {needsUpgrade && trialDays !== null && trialDays > 0 && (
          <div className="px-5 py-4 flex items-center justify-between gap-4"
               style={{ background: 'rgba(251,191,36,0.06)', border: `1px solid ${trialColour}40` }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '18px' }}>{trialDays <= 7 ? '⚠' : '⏱'}</span>
              <div>
                <div className="font-semibold text-white" style={{ fontSize: '14px' }}>
                  Free trial — <span style={{ color: trialColour }}>{trialDays} day{trialDays !== 1 ? 's' : ''} remaining</span>
                </div>
                <div className="text-zinc-500" style={{ fontSize: '12px', marginTop: '2px' }}>
                  Add a payment method below to keep access after your trial ends.
                </div>
              </div>
            </div>
            <button
              onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="mono text-white flex-shrink-0 px-4 py-2 transition-colors"
              style={{ background: trialColour, fontSize: '10px', letterSpacing: '0.12em', border: 'none', cursor: 'pointer' }}>
              UPGRADE →
            </button>
          </div>
        )}

        {/* ── App Access Card ── */}
        <div className="surface-deep p-8 text-center"
             style={{ border: canLaunch ? '1px solid #1a3a2a' : '1px solid #3a1a1a' }}>
          <div className="mono text-zinc-500 mb-2" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SLD & VOLTAGE DROP MANAGER</div>
          <h2 className="text-white font-bold mb-1" style={{ fontSize: '22px' }}>Professional Electrical Calculations</h2>
          <p className="text-zinc-400 mb-6" style={{ fontSize: '13px' }}>Kahramaa T10/T11 · IEC 60364 · Fault current · Cable optimisation</p>

          {canLaunch ? (
            /* Active trial or paid subscriber — go to app */
            <button onClick={handleLaunchApp} className="btn-primary" style={{ minWidth: '200px' }}>
              LAUNCH APP →
            </button>
          ) : trialExpiredByDate ? (
            /* Trial expired by date — show inline message, no redirect */
            <div>
              <div className="mono text-red-400 mb-3" style={{ fontSize: '13px', letterSpacing: '0.05em' }}>
                🔒 Your free trial has ended
              </div>
              <div className="text-zinc-500 mb-5" style={{ fontSize: '13px' }}>
                Add a payment method below to restore access instantly.
              </div>
              <button
                onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-primary"
                style={{ minWidth: '200px' }}>
                ADD PAYMENT METHOD →
              </button>
            </div>
          ) : (
            /* No subscription at all */
            <div>
              <div className="mono text-red-400 mb-4" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                ⚠ SUBSCRIPTION REQUIRED — ADD BILLING BELOW TO RESTORE ACCESS
              </div>
            </div>
          )}
        </div>

        {/* ── Subscription Status ── */}
        <div className="surface p-6">
          <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SUBSCRIPTION STATUS</div>
          <div className="space-y-0">

            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #1a1f27' }}>
              <span className="text-zinc-400" style={{ fontSize: '14px' }}>Status</span>
              <span className="mono font-bold" style={{
                fontSize: '11px', letterSpacing: '0.1em',
                color: status === 'active' ? '#4ade80'
                  : trialExpiredByDate ? '#f87171'
                  : isTrialing ? '#7ed3f7'
                  : status === 'canceled' ? '#f87171'
                  : status === 'past_due' ? '#fb923c'
                  : '#f87171'
              }}>
                {trialExpiredByDate ? 'TRIAL EXPIRED'
                  : isTrialing ? 'FREE TRIAL'
                  : status === 'active' ? 'ACTIVE'
                  : status === 'canceled' ? 'CANCELED'
                  : status === 'past_due' ? 'PAYMENT DUE'
                  : 'INACTIVE'}
              </span>
            </div>

            {isTrialing && subscription?.trial_end && (
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #1a1f27' }}>
                <span className="text-zinc-400" style={{ fontSize: '14px' }}>Trial expires</span>
                <span className="mono text-zinc-300" style={{ fontSize: '12px' }}>
                  {formatDate(subscription.trial_end)}
                  {trialDays !== null && (
                    <span className="ml-2" style={{ color: trialColour }}>({trialDays}d left)</span>
                  )}
                </span>
              </div>
            )}

            {subscription?.subscription_end && !isTrialing && (
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #1a1f27' }}>
                <span className="text-zinc-400" style={{ fontSize: '14px' }}>Next billing</span>
                <span className="mono text-zinc-300" style={{ fontSize: '12px' }}>{formatDate(subscription.subscription_end)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-3">
              <span className="text-zinc-400" style={{ fontSize: '14px' }}>Payment method</span>
              <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.08em', color: hasBilling ? '#4ade80' : '#f87171' }}>
                {hasBilling ? 'CONFIGURED ✓' : 'NOT SET UP'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Upgrade / Reactivate — trial with no billing, or expired ── */}
        {(needsUpgrade || needsReactivate) && (
          <div id="upgrade-section" className="surface p-6" style={{ border: '1px solid rgba(126,211,247,0.15)' }}>
            <div className="mono mb-1" style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#7ed3f7' }}>
              {needsReactivate ? 'REACTIVATE SUBSCRIPTION' : 'CHOOSE YOUR PLAN'}
            </div>
            <p className="text-zinc-400 mb-6" style={{ fontSize: '13px', lineHeight: '1.65' }}>
              {needsReactivate
                ? 'Your access has lapsed. Subscribe below to restore it immediately.'
                : 'Your free trial is running. Add a payment method now — you won\'t be charged until your trial ends on ' + formatDate(subscription?.trial_end) + '.'}
            </p>

            {/* Plan picker */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Monthly */}
              <button type="button" onClick={() => setPlan("monthly")}
                className="p-5 text-left transition-all"
                style={{
                  background: plan === 'monthly' ? 'linear-gradient(180deg,rgba(126,211,247,0.07),transparent),#0a0d12' : '#0a0d12',
                  border: plan === 'monthly' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                  cursor: 'pointer',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="mono text-zinc-400" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>STANDARD</span>
                  <span className="pill pill-info" style={{ fontSize: '9px' }}>MONTHLY</span>
                </div>
                <div className="display text-white" style={{ fontSize: '34px' }}>
                  $12<span className="text-zinc-500" style={{ fontSize: '14px' }}>/mo</span>
                </div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>BILLED MONTHLY</div>
              </button>

              {/* Annual */}
              <button type="button" onClick={() => setPlan("annual")}
                className="p-5 text-left transition-all relative"
                style={{
                  background: plan === 'annual' ? 'linear-gradient(180deg,rgba(126,211,247,0.07),transparent),#0a0d12' : '#0a0d12',
                  border: plan === 'annual' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                  cursor: 'pointer',
                }}>
                <div className="absolute -top-3 right-4 mono font-bold bg-emerald-400 text-slate-950 px-2 py-0.5"
                     style={{ fontSize: '8px', letterSpacing: '0.12em' }}>SAVE 65%</div>
                <div className="flex items-center justify-between mb-3">
                  <span className="mono text-zinc-400" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>STANDARD</span>
                  <span className="pill pill-pass" style={{ fontSize: '9px' }}>ANNUAL</span>
                </div>
                <div className="display text-white" style={{ fontSize: '34px' }}>
                  $50<span className="text-zinc-500" style={{ fontSize: '14px' }}>/yr</span>
                </div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>~$4.17 / MO EFFECTIVE</div>
              </button>
            </div>

            {needsUpgrade && (
              <div className="flex items-center gap-2 mono text-zinc-500 mb-5" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                NO CHARGE UNTIL TRIAL ENDS · CANCEL ANYTIME
              </div>
            )}

            {checkoutError && (
              <div className="mono px-4 py-3 mb-4" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', color: '#ff8a8a', fontSize: '12px' }}>
                ⚠ {checkoutError}
              </div>
            )}

            <button onClick={handleSubscribe} disabled={checkoutLoading} className="btn-primary w-full"
              style={{ opacity: checkoutLoading ? 0.6 : 1, cursor: checkoutLoading ? 'not-allowed' : 'pointer' }}>
              {checkoutLoading ? "OPENING CHECKOUT..." : needsReactivate ? "REACTIVATE →" : "ADD PAYMENT METHOD →"}
            </button>
          </div>
        )}

        {/* ── Manage Subscription — only for paying subscribers ── */}
        {hasBilling && isActive && (
          <div className="surface p-6">
            <div className="mono text-emerald-400 mb-1" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>MANAGE SUBSCRIPTION</div>
            <p className="text-zinc-400 mb-4" style={{ fontSize: '13px', lineHeight: '1.6' }}>
              To cancel, upgrade, or update your payment method, visit your billing portal or contact support.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://app.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer"
                className="mono transition-colors"
                style={{ fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none', color: '#7ed3f7', border: '1px solid rgba(126,211,247,0.25)', padding: '8px 16px', display: 'inline-block' }}>
                BILLING PORTAL →
              </a>
              <a href="mailto:support@calcpilot.cc"
                className="mono text-zinc-400 hover:text-white transition-colors"
                style={{ fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid #1a1f27', padding: '8px 16px', display: 'inline-block' }}>
                EMAIL SUPPORT
              </a>
            </div>
          </div>
        )}

        {/* ── Support ── */}
        <div className="surface p-6">
          <div className="mono text-zinc-500 mb-2" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SUPPORT</div>
          <p className="text-zinc-400" style={{ fontSize: '13px' }}>
            Questions? Email us at{" "}
            <a href="mailto:support@calcpilot.cc" className="text-cyan-300 hover:text-cyan-200">support@calcpilot.cc</a>
          </p>
        </div>

      </main>
    </div>
  );
}
