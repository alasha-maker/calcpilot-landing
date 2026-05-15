import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "../../landing-new.css";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp"
);

const STORE = "calcpilot";
const VARIANTS = {
  monthly: "1658160",
  annual:  "1658137",
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
  const [user, setUser]               = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [plan, setPlan]               = useState("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState("");

  useEffect(() => {
    const loadUser = async () => {
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

      const { data } = await supabase
        .from("users")
        .select("subscription_status, trial_end, subscription_end, stripe_customer_id")
        .eq("id", session.user.id)
        .single();

      setSubscription(data);
      setLoading(false);
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleLaunchApp = () => {
    window.location.href = `/app?s=${Date.now()}`;
  };

  const handleSubscribe = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const checkoutUrl = `https://${STORE}.lemonsqueezy.com/checkout/buy/${VARIANTS[plan]}?checkout[email]=${encodeURIComponent(user.email)}&checkout[success_url]=https://calcpilot.cc/dashboard`;
      await loadLemonSqueezy();
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } catch (err) {
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
        <div className="mono text-zinc-500" style={{ fontSize: '11px', letterSpacing: '0.15em' }}>LOADING DASHBOARD...</div>
      </div>
    );
  }

  const status = subscription?.subscription_status;
  const isActive = status === "trialing" || status === "active";
  const hasBilling = !!subscription?.stripe_customer_id;
  const trialDays = daysLeft(subscription?.trial_end);

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

        {/* Welcome */}
        <div className="mb-8">
          <div className="eyebrow mb-3"><span className="num">[01]</span>Dashboard</div>
          <h1 className="display text-white" style={{ fontSize: '40px' }}>Welcome back.</h1>
        </div>

        {/* ── Launch App Card ── */}
        <div className="surface-deep p-8 text-center" style={{ border: isActive ? '1px solid #1a3a2a' : '1px solid #1a1f27' }}>
          <div className="mono text-zinc-500 mb-2" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SLD & VOLTAGE DROP MANAGER</div>
          <h2 className="text-white font-bold mb-1" style={{ fontSize: '22px' }}>Professional Electrical Calculations</h2>
          <p className="text-zinc-400 mb-6" style={{ fontSize: '13px' }}>Kahramaa T10/T11 · IEC 60364 · Fault current · Cable optimisation</p>

          {isActive ? (
            <button onClick={handleLaunchApp} className="btn-primary" style={{ minWidth: '200px' }}>
              LAUNCH APP →
            </button>
          ) : (
            <div>
              <p className="mono text-red-400 mb-4" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                ⚠ SUBSCRIPTION INACTIVE — SET UP BILLING BELOW TO RESTORE ACCESS
              </p>
            </div>
          )}
        </div>

        {/* ── Subscription Status ── */}
        <div className="surface p-6">
          <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SUBSCRIPTION STATUS</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1a1f27' }}>
              <span className="text-zinc-400" style={{ fontSize: '14px' }}>Status</span>
              <span className={`mono font-bold`} style={{
                fontSize: '11px', letterSpacing: '0.1em',
                color: status === 'active' ? '#4ade80' : status === 'trialing' ? '#7ed3f7' : '#f87171'
              }}>
                {status === 'trialing' ? 'FREE TRIAL' : status === 'active' ? 'ACTIVE' : status === 'canceled' ? 'CANCELED' : status === 'past_due' ? 'PAYMENT DUE' : 'INACTIVE'}
              </span>
            </div>

            {status === 'trialing' && subscription?.trial_end && (
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1a1f27' }}>
                <span className="text-zinc-400" style={{ fontSize: '14px' }}>Trial ends</span>
                <span className="mono text-zinc-300" style={{ fontSize: '12px' }}>
                  {formatDate(subscription.trial_end)}
                  {trialDays !== null && (
                    <span className={`ml-2 ${trialDays <= 7 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      ({trialDays}d left)
                    </span>
                  )}
                </span>
              </div>
            )}

            {subscription?.subscription_end && (
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1a1f27' }}>
                <span className="text-zinc-400" style={{ fontSize: '14px' }}>Next billing</span>
                <span className="mono text-zinc-300" style={{ fontSize: '12px' }}>{formatDate(subscription.subscription_end)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-400" style={{ fontSize: '14px' }}>Payment method</span>
              <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.08em', color: hasBilling ? '#4ade80' : '#f87171' }}>
                {hasBilling ? 'CONFIGURED ✓' : 'NOT SET UP'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Billing Setup — show when no payment method OR subscription inactive ── */}
        {(!hasBilling || !isActive) && (
          <div className="surface p-6" style={{ border: '1px solid rgba(126,211,247,0.15)' }}>
            <div className="mono text-cyan-400 mb-1" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>
              {!isActive ? 'REACTIVATE SUBSCRIPTION' : 'SET UP BILLING'}
            </div>
            <p className="text-zinc-400 mb-5" style={{ fontSize: '13px', lineHeight: '1.6' }}>
              {!isActive
                ? 'Your access has lapsed. Subscribe below to restore it immediately.'
                : 'Your free trial is running. Add payment now — you won\'t be charged until the trial ends.'}
            </p>

            {/* Plan picker */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button type="button" onClick={() => setPlan("monthly")}
                className="p-4 text-left transition-all"
                style={{
                  background: plan === 'monthly' ? 'linear-gradient(180deg,rgba(126,211,247,0.06),transparent),#0a0d12' : '#0a0d12',
                  border: plan === 'monthly' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="mono text-zinc-400" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>STANDARD</span>
                  <span className="pill pill-info" style={{ fontSize: '9px' }}>MONTHLY</span>
                </div>
                <div className="display text-white" style={{ fontSize: '28px' }}>$12<span className="text-zinc-500" style={{ fontSize: '13px' }}>/mo</span></div>
              </button>

              <button type="button" onClick={() => setPlan("annual")}
                className="p-4 text-left transition-all relative"
                style={{
                  background: plan === 'annual' ? 'linear-gradient(180deg,rgba(126,211,247,0.06),transparent),#0a0d12' : '#0a0d12',
                  border: plan === 'annual' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                }}>
                <div className="absolute -top-2.5 right-3 mono font-bold bg-emerald-400 text-slate-950 px-2 py-0.5" style={{ fontSize: '8px', letterSpacing: '0.12em' }}>SAVE 65%</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="mono text-zinc-400" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>STANDARD</span>
                  <span className="pill pill-pass" style={{ fontSize: '9px' }}>ANNUAL</span>
                </div>
                <div className="display text-white" style={{ fontSize: '28px' }}>$50<span className="text-zinc-500" style={{ fontSize: '13px' }}>/yr</span></div>
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 mono text-zinc-500 mb-5" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
              1 MONTH FREE TRIAL INCLUDED · NO CHARGE TODAY · CANCEL ANYTIME
            </div>

            {checkoutError && (
              <div className="mono px-4 py-3 mb-4" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', color: '#ff8a8a', fontSize: '12px' }}>
                ⚠ {checkoutError}
              </div>
            )}

            <button onClick={handleSubscribe} disabled={checkoutLoading} className="btn-primary w-full"
              style={{ opacity: checkoutLoading ? 0.6 : 1, cursor: checkoutLoading ? 'not-allowed' : 'pointer' }}>
              {checkoutLoading ? "OPENING CHECKOUT..." : "SUBSCRIBE NOW →"}
            </button>
          </div>
        )}

        {/* Support */}
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
