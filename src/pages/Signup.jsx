import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp" // sb_pub... key
);

// Paddle Price IDs
const PRICES = {
  monthly: "pri_01kr62rgnmggyxdtad8hcwqjr9",
  annual: "pri_01kr62vzsjmh3a6ft9465zkeeh",
};

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // Create Supabase account
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Redirect to Paddle checkout
    // Paddle Billing checkout URL with customer email pre-filled
    const priceId = PRICES[plan];
    const checkoutUrl = `https://buy.paddle.com/product/${priceId}?email=${encodeURIComponent(email)}&success_url=${encodeURIComponent("https://calcpilot.cc/dashboard")}`;
    window.location.href = checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-800">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">CalcPilot</h1>
          <p className="text-gray-400 mt-2 text-sm">Start your 30-day free trial</p>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${plan === "monthly"
                ? "border-blue-500 bg-blue-900/30"
                : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
          >
            <div className="text-white font-semibold">Monthly</div>
            <div className="text-gray-400 text-sm mt-1">Flexible billing</div>
            <div className="text-blue-400 font-bold mt-2">$1/mo*</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan("annual")}
            className={`p-4 rounded-xl border-2 text-left transition-all relative ${plan === "annual"
                ? "border-blue-500 bg-blue-900/30"
                : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
          >
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              SAVE
            </div>
            <div className="text-white font-semibold">Annual</div>
            <div className="text-gray-400 text-sm mt-1">Best value</div>
            <div className="text-blue-400 font-bold mt-2">$500/yr*</div>
          </button>
        </div>
        <p className="text-gray-500 text-xs text-center mb-6">
          * Pricing will be updated soon. 30-day free trial, no charge today.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? "Creating account..." : "Start Free Trial →"}
          </button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-4">
          By signing up you agree to our Terms of Service. Cancel anytime.
        </p>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
