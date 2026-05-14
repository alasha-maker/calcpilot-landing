import { useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "../../landing-new.css";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp"
);

// Paddle Billing Price IDs
const PRICES = {
  monthly: "pri_01kr62rgnmggyxdtad8hcwqjr9",
  annual:  "pri_01kr62vzsjmh3a6ft9465zkeeh",
};

const PADDLE_TOKEN = "live_71ff440e1dfa05180a41f2c0b7b";

function loadPaddle() {
  return new Promise((resolve, reject) => {
    if (window.Paddle) { resolve(window.Paddle); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => { window.Paddle.Initialize({ token: PADDLE_TOKEN }); resolve(window.Paddle); };
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(script);
  });
}

export default function Signup() {
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [plan, setPlan]                     = useState("monthly");
  const [error, setError]                   = useState("");
  const [loading, setLoading]               = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8)          { setError("Password must be at least 8 characters."); return; }
    setLoading(true);

    // Step 1 — Create Supabase auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    const token = signUpData?.session?.access_token;

    if (token) {
      // Step 2 — Create the public.users row (trialing) so the webhook can find it
      try {
        await fetch("https://calcpilot.cc/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        console.warn("Register call failed (non-fatal):", err);
      }

      // Step 3 — Set the calcpilot_session cookie so /app works after checkout
      try {
        await fetch("https://calcpilot.cc/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        console.warn("Session setup failed (non-fatal):", err);
      }
    } else {
      // Email confirmation is enabled in Supabase — user must verify before paying.
      // Direct them to check their inbox instead of opening checkout.
      setError("Account created! Check your inbox to confirm your email, then log in to start your free trial.");
      setLoading(false);
      return;
    }

    // Step 4 — Open Paddle checkout
    try {
      const Paddle = await loadPaddle();
      Paddle.Checkout.open({
        items: [{ priceId: PRICES[plan], quantity: 1 }],
        customer: { email },
        settings: { successUrl: "https://calcpilot.cc/dashboard" },
      });
    } catch (err) {
      setError("Failed to open checkout. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#06080b', minHeight: '100vh', fontFamily: '"Inter Tight", system-ui, sans-serif', color: '#e6e7e9' }}
         className="flex flex-col">

      {/* ── NAV ── */}
      <header className="border-b rule" style={{ background: 'rgba(6,8,11,0.9)' }}>
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
          <Link to="/login" className="mono text-zinc-400 hover:text-white" style={{ fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none' }}>
            LOG IN
          </Link>
        </div>
      </header>

      {/* ── FORM ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full" style={{ maxWidth: '480px' }}>

          {/* Header */}
          <div className="mb-10">
            <div className="eyebrow mb-4"><span className="num">[01]</span>Create your account</div>
            <h1 className="display text-white" style={{ fontSize: '48px' }}>
              Start your<br /><em className="text-cyan-300">free trial.</em>
            </h1>
            <p className="mt-4 text-zinc-400" style={{ fontSize: '14px', lineHeight: '1.65' }}>
              1 month free — no credit card required. Full access to all features.
            </p>
          </div>

          {/* Plan Selector */}
          <div className="mb-2">
            <div className="mono text-zinc-500 mb-3" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>SELECT PLAN</div>
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly */}
              <button type="button" onClick={() => setPlan("monthly")}
                className="p-5 text-left transition-all plan-card"
                style={{
                  background: plan === 'monthly' ? 'linear-gradient(180deg, rgba(126,211,247,0.06), transparent), #0a0d12' : '#0a0d12',
                  border: plan === 'monthly' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="mono text-zinc-400" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>STANDARD</div>
                  <span className="pill pill-info">MONTHLY</span>
                </div>
                <div className="display text-white" style={{ fontSize: '36px' }}>$12<span className="text-zinc-500" style={{ fontSize: '14px' }}>/mo</span></div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>BILLED MONTHLY</div>
              </button>

              {/* Annual */}
              <button type="button" onClick={() => setPlan("annual")}
                className="p-5 text-left transition-all plan-card relative"
                style={{
                  background: plan === 'annual' ? 'linear-gradient(180deg, rgba(126,211,247,0.06), transparent), #0a0d12' : '#0a0d12',
                  border: plan === 'annual' ? '1px solid #7ed3f7' : '1px solid #1a1f27',
                }}>
                <div className="absolute -top-3 right-4 mono font-bold bg-emerald-400 text-slate-950 px-2 py-0.5" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>SAVE 65%</div>
                <div className="flex items-center justify-between mb-3">
                  <div className="mono text-zinc-400" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>STANDARD</div>
                  <span className="pill pill-pass">ANNUAL</span>
                </div>
                <div className="display text-white" style={{ fontSize: '36px' }}>$50<span className="text-zinc-500" style={{ fontSize: '14px' }}>/yr</span></div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>~$4.17 / MO EFFECTIVE</div>
              </button>
            </div>

            {/* Trial note */}
            <div className="mt-3 flex items-center gap-2 mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              1 MONTH FREE TRIAL · NO CHARGE TODAY · CANCEL ANYTIME
            </div>
          </div>

          {/* Divider */}
          <div className="tech-line my-8"></div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mono text-zinc-400 block mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: '#0a0d12', border: '1px solid #1a1f27', fontSize: '14px', fontFamily: '"Inter Tight", sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#7ed3f7'}
                onBlur={e => e.target.style.borderColor = '#1a1f27'}
              />
            </div>

            <div>
              <label className="mono text-zinc-400 block mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>
                PASSWORD
              </label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: '#0a0d12', border: '1px solid #1a1f27', fontSize: '14px', fontFamily: '"Inter Tight", sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#7ed3f7'}
                onBlur={e => e.target.style.borderColor = '#1a1f27'}
              />
            </div>

            <div>
              <label className="mono text-zinc-400 block mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>
                CONFIRM PASSWORD
              </label>
              <input
                type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: '#0a0d12', border: '1px solid #1a1f27', fontSize: '14px', fontFamily: '"Inter Tight", sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#7ed3f7'}
                onBlur={e => e.target.style.borderColor = '#1a1f27'}
              />
            </div>

            {error && (
              <div className="mono px-4 py-3" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', color: '#ff8a8a', fontSize: '12px', letterSpacing: '0.05em' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2" style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? "CREATING ACCOUNT..." : "START FREE TRIAL →"}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center mono text-zinc-500" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            By signing up you agree to our{' '}
            <Link to="/terms" className="text-zinc-400 hover:text-cyan-300">Terms of Service</Link>.
          </div>
          <div className="mt-3 text-center" style={{ fontSize: '14px' }}>
            <span className="text-zinc-500">Already have an account? </span>
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200 font-medium">Sign in</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
