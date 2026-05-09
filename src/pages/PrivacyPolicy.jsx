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

export default function PrivacyPolicy() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="May 2026">
      <p className="text-slate-400 -mt-4">
        CalcPilot respects your privacy. This policy explains what data we collect, how we use it, and your rights — in plain language.
      </p>

      <Section title="1. Who We Are">
        <p>
          CalcPilot is an electrical engineering software platform. When we say "we," "us," or "CalcPilot," we mean the team operating the Service. For privacy inquiries, contact us at{" "}
          <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>.
        </p>
      </Section>

      <Section title="2. What Data We Collect">
        <p>We collect only what is necessary to provide the Service:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li><strong className="text-slate-200">Account data:</strong> Name, email address, and password (hashed).</li>
          <li><strong className="text-slate-200">Project data:</strong> Load schedules, cable configurations, and calculation inputs you save within the app.</li>
          <li><strong className="text-slate-200">Billing data:</strong> Subscription plan and payment status. Full card details are handled by our payment processor — we do not store card numbers.</li>
          <li><strong className="text-slate-200">Usage data:</strong> Pages visited, features used, and session duration — used to improve the platform.</li>
          <li><strong className="text-slate-200">Technical data:</strong> IP address, browser type, and device information for security and diagnostics.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc list-inside space-y-2 text-slate-400">
          <li>To provide, maintain, and improve the Service.</li>
          <li>To process payments and manage your subscription.</li>
          <li>To send transactional emails (receipts, password resets, feature updates).</li>
          <li>To respond to support requests.</li>
          <li>To detect and prevent fraud or abuse.</li>
        </ul>
        <p className="mt-4">We do not sell your personal data to third parties.</p>
      </Section>

      <Section title="4. GCC & Regional Compliance">
        <p>
          CalcPilot operates in compliance with applicable data protection laws, including Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016) and the UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection. Users in these jurisdictions have the right to:
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li>Access personal data we hold about them.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of their data (subject to legal retention obligations).</li>
          <li>Withdraw consent for non-essential data processing.</li>
        </ul>
        <p className="mt-4">To exercise these rights, email <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>.</p>
      </Section>

      <Section title="5. Data Sharing">
        <p>We share data only with trusted third-party providers who help us operate the Service:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li><strong className="text-slate-200">Payment processors</strong> (e.g. Stripe) — for billing.</li>
          <li><strong className="text-slate-200">Cloud hosting providers</strong> — for data storage and app delivery.</li>
          <li><strong className="text-slate-200">Analytics tools</strong> — for usage insights (anonymized where possible).</li>
        </ul>
        <p className="mt-4">All third-party providers are bound by data processing agreements.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          We retain your account and project data for as long as your account is active. If you close your account, we will delete your personal data within 90 days, except where retention is required by law.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We use industry-standard security practices including encrypted connections (HTTPS), hashed passwords, and access controls to protect your data. No system is 100% secure; please use a strong, unique password for your account.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          CalcPilot uses essential cookies to keep you logged in and remember your preferences. We may also use analytics cookies to understand how the platform is used. You can disable non-essential cookies in your browser settings.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy periodically. We will notify you of significant changes via email or an in-app notice at least 14 days before they take effect.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Privacy questions or data requests:{" "}
          <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>
        </p>
      </Section>
    </PolicyLayout>
  );
}
