import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

function PolicyLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">CalcPilot</div>
              <div className="text-xs text-slate-400">SLD · Voltage Drop Manager</div>
            </div>
          </Link>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">← Back to Home</Link>
        </div>
      </header>

      <main className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-cyan-400 font-medium mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          <div className="mt-12 space-y-10 text-slate-300 leading-8">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-slate-500 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <span>© 2026 CalcPilot. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/refund" className="hover:text-white">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function RefundPolicy() {
  return (
    <PolicyLayout title="Refund & Cancellation Policy" lastUpdated="May 2026">
      <p className="text-slate-400 -mt-4">
        We want you to be satisfied with CalcPilot. Here is how refunds and cancellations work — straightforwardly.
      </p>

      <Section title="1. Free Trial">
        <p>
          CalcPilot offers a free trial period so you can evaluate the platform before committing to a paid plan. No payment is required during the trial. You will only be charged once you choose to upgrade to a paid subscription.
        </p>
      </Section>

      <Section title="2. Cancellation">
        <p>
          You can cancel your subscription at any time from your account settings — no need to contact support. When you cancel:
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li>Your access continues until the end of the current billing period (monthly or annual).</li>
          <li>You will not be charged again after cancellation.</li>
          <li>Your project data is retained for 30 days after the subscription ends, then permanently deleted.</li>
        </ul>
      </Section>

      <Section title="3. Refunds — Monthly Plans">
        <p>
          Monthly subscriptions are billed at the start of each cycle. We offer a <strong className="text-white">7-day refund window</strong> from the date of each charge. If you cancel within 7 days of being billed and have not made extensive use of the Service during that period, contact us and we will issue a full refund for that cycle.
        </p>
      </Section>

      <Section title="4. Refunds — Annual Plans">
        <p>
          Annual subscriptions are eligible for a <strong className="text-white">14-day full refund</strong> from the initial purchase date. After 14 days, annual plans are non-refundable, but you may cancel to prevent renewal and retain access through the end of the paid year.
        </p>
      </Section>

      <Section title="5. Non-Refundable Situations">
        <p>Refunds will not be issued in the following cases:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li>Requests made after the refund window has passed.</li>
          <li>Accounts suspended due to violation of the Terms of Service.</li>
          <li>Partial months or unused days on monthly plans (beyond the 7-day window).</li>
          <li>Upgrades or plan changes within an active billing period.</li>
        </ul>
      </Section>

      <Section title="6. Plan Changes">
        <p>
          If you upgrade your plan, the new rate takes effect immediately and the remaining credit from your current plan is applied as a proration. Downgrades take effect at the next billing cycle.
        </p>
      </Section>

      <Section title="7. Payment Failures">
        <p>
          If a payment fails, we will retry the charge and notify you by email. If payment is not resolved within 7 days, your account may be downgraded to a limited access state until the outstanding balance is settled.
        </p>
      </Section>

      <Section title="8. How to Request a Refund">
        <p>
          Email us at{" "}
          <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>{" "}
          with the subject line <em>"Refund Request"</em> and include your account email and the reason for the request. We aim to respond within 2 business days and process approved refunds within 5–10 business days depending on your payment provider.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          For billing or cancellation questions:{" "}
          <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>
        </p>
      </Section>
    </PolicyLayout>
  );
}
