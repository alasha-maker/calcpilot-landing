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
              <div className="text-lg font-bold tracking-tight">Calc.Pilot</div>
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
          <span>© 2026 Calc.Pilot. All rights reserved.</span>
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

export default function TermsOfService() {
  return (
    <PolicyLayout title="Terms of Service" lastUpdated="May 2026">
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Calc.Pilot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users, including individuals and organizations in Qatar, the GCC region, and internationally.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>
          Calc.Pilot is a cloud-based electrical engineering tool that helps engineers design load schedules, calculate voltage drop, size cables and breakers, generate single-line diagrams (SLD), and produce project reports. The Service is provided on a subscription basis.
        </p>
      </Section>

      <Section title="3. Account Registration">
        <p>
          You must create an account to use Calc.Pilot. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to provide accurate, current, and complete information during registration and to keep it updated.
        </p>
      </Section>

      <Section title="4. Subscription Plans">
        <p>
          Calc.Pilot offers monthly and annual subscription plans. By subscribing, you authorize us to charge your payment method on a recurring basis at the then-current subscription rate. Prices are listed in USD and may be subject to local taxes depending on your jurisdiction.
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li>Monthly plans renew automatically every 30 days.</li>
          <li>Annual plans renew automatically every 12 months.</li>
          <li>You may cancel your subscription at any time from your account settings.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-400">
          <li>Use the Service for any unlawful purpose or in violation of applicable regulations.</li>
          <li>Attempt to reverse-engineer, decompile, or extract source code from the platform.</li>
          <li>Share your account credentials with unauthorized third parties.</li>
          <li>Upload or transmit malicious code, viruses, or disruptive data.</li>
          <li>Resell or sublicense access to the Service without written consent.</li>
        </ul>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          All content, features, algorithms, and design elements within Calc.Pilot are the intellectual property of Calc.Pilot and are protected by international copyright and intellectual property laws. Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service for your own professional purposes.
        </p>
      </Section>

      <Section title="7. Disclaimer of Warranties">
        <p>
          Calc.Pilot is provided "as is" without warranties of any kind, either express or implied. While we strive for accuracy, calculation results should always be reviewed by a qualified licensed engineer before use in any submission, construction, or regulatory filing. Calc.Pilot does not replace professional engineering judgment.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, Calc.Pilot and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to errors in calculations, project delays, or regulatory non-compliance.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          We reserve the right to suspend or terminate your account if you violate these Terms or engage in conduct that we determine, in our sole discretion, is harmful to other users, the Service, or third parties. You may also terminate your account at any time.
        </p>
      </Section>

      <Section title="10. Governing Law">
        <p>
          These Terms are governed by internationally recognized principles of commercial law. Any disputes shall be resolved through good-faith negotiation. If unresolved, disputes may be submitted to binding international arbitration under the rules of a mutually agreed arbitration body.
        </p>
      </Section>

      <Section title="11. Changes to Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes via email or an in-app notice. Continued use of the Service after changes take effect constitutes your acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:info@calcpilot.com" className="text-cyan-400 hover:underline">info@calcpilot.com</a>.
        </p>
      </Section>
    </PolicyLayout>
  );
}
