import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp" // sb_pub... key
);

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      setUser(session.user);

      // Fetch subscription info
      const { data } = await supabase
        .from("users")
        .select("subscription_status, trial_end, subscription_end")
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
    // Timestamp busts any cached plain-HTML response from before encryption was active
    window.location.href = `/app?s=${Date.now()}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      trialing: "bg-blue-900/50 text-blue-300 border-blue-700",
      active: "bg-green-900/50 text-green-300 border-green-700",
      canceled: "bg-red-900/50 text-red-300 border-red-700",
      past_due: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    };
    const labels = {
      trialing: "Free Trial",
      active: "Active",
      canceled: "Canceled",
      past_due: "Payment Due",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading your dashboard...</div>
      </div>
    );
  }

  const isActive = subscription?.subscription_status === "trialing" ||
    subscription?.subscription_status === "active";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">Calc.Pilot</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-semibold text-white">Welcome back 👋</h2>
          <p className="text-gray-400 mt-1">{user?.email}</p>
        </div>

        {/* Launch App Card */}
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="text-xl font-bold text-white mb-2">
            SLD & Voltage Drop Manager
          </h3>
          <p className="text-gray-300 text-sm mb-6">
            Professional electrical engineering calculations at your fingertips.
          </p>
          {isActive ? (
            <button
              onClick={handleLaunchApp}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-lg shadow-lg shadow-blue-900/40"
            >
              Launch App →
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-300 text-sm">Your subscription is inactive.</p>
              <a
                href="/signup"
                className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
              >
                Reactivate Subscription
              </a>
            </div>
          )}
        </div>

        {/* Subscription Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Status</span>
              {subscription ? getStatusBadge(subscription.subscription_status) : (
                <span className="text-gray-500 text-sm">No subscription found</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Trial ends</span>
              <span className="text-gray-200 text-sm">{formatDate(subscription?.trial_end)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Next billing date</span>
              <span className="text-gray-200 text-sm">{formatDate(subscription?.subscription_end)}</span>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Need help?</h3>
          <p className="text-gray-400 text-sm">
            Contact us at{" "}
            <a href="mailto:support@calcpilot.cc" className="text-blue-400 hover:text-blue-300">
              support@calcpilot.cc
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
