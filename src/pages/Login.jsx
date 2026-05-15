import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "../../landing-new.css";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp"
);

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // If already signed in, go straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/dashboard";
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Step 1 — Authenticate with Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    const token = data.session.access_token;

    // Step 2 — Ensure public.users row exists (safe no-op if already there)
    try {
      await fetch("https://calcpilot.cc/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
    } catch (_) {}

    // Step 3 — Set the secure session cookie
    try {
      await fetch("https://calcpilot.cc/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
    } catch (_) {}

    // Step 4 — Always go to dashboard (dashboard handles all subscription states)
    window.location.href = "/dashboard";
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
          <Link to="/signup" className="mono text-zinc-400 hover:text-white" style={{ fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none' }}>
            SIGN UP
          </Link>
        </div>
      </header>

      {/* ── FORM ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full" style={{ maxWidth: '440px' }}>

          {/* Header */}
          <div className="mb-10">
            <div className="eyebrow mb-4"><span className="num">[01]</span>Welcome back</div>
            <h1 className="display text-white" style={{ fontSize: '48px' }}>
              Sign in to<br /><em className="text-cyan-300">CalcPilot.</em>
            </h1>
            <p className="mt-4 text-zinc-400" style={{ fontSize: '14px', lineHeight: '1.65' }}>
              Enter your credentials to access your account.
            </p>
          </div>

          {/* Divider */}
          <div className="tech-line mb-8"></div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2"
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? "SIGNING IN..." : "SIGN IN →"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center" style={{ fontSize: '14px' }}>
            <span className="text-zinc-500">Don't have an account? </span>
            <Link to="/signup" className="text-cyan-300 hover:text-cyan-200 font-medium">Start free trial</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
