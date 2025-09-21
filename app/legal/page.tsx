import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";

const lastUpdated = new Date().toLocaleDateString("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white text-slate-800 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1 max-w-4xl space-y-10">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Legal centre</h1>
          <p className="text-sm text-slate-500 mt-2">Updated {lastUpdated}</p>
        </header>

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Terms of Service</h2>
          <p className="text-sm text-slate-600">
            ZapTasks Inc. (&quot;ZapTasks&quot;, &quot;we&quot;, &quot;us&quot;) operates a Canadian marketplace connecting homeowners with independent service providers.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">1. Acceptance</h3>
          <p className="text-sm text-slate-600">
            By using ZapTasks, you agree to these terms, our Privacy Policy, and any supplemental policies posted on the platform. If you do not agree, do not use the service.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">2. Marketplace role</h3>
          <p className="text-sm text-slate-600">
            We facilitate bookings, escrow-style payments, verification, and dispute support. Providers are independent contractors responsible for their work, insurance, and compliance with Ontario regulations.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">3. Fees</h3>
          <p className="text-sm text-slate-600">
            Homeowners pay no booking fee. Providers pay a 15% platform fee on completed jobs, or 10% + $9/month for the Priority plan. Fees are deducted automatically from Stripe Connect payouts.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">4. Deposits & releases</h3>
          <p className="text-sm text-slate-600">
            A 50% deposit is collected at booking and held via Stripe Connect. The remaining 50% is released upon homeowner approval. ZapTasks may pause payouts during disputes until resolution.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">5. Liability</h3>
          <p className="text-sm text-slate-600">
            We are not liable for indirect or consequential damages. Our aggregate liability is limited to fees paid to us in the preceding 12 months.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Privacy policy</h2>
          <p className="text-sm text-slate-600">
            We collect personal information needed to operate the marketplace, verify providers, process payments, and deliver support.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">1. Data collection</h3>
          <p className="text-sm text-slate-600">
            We collect account information, booking details, communications, and payment identifiers. Provider identity documents are processed and stored by Stripe.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">2. Usage</h3>
          <p className="text-sm text-slate-600">
            Data is used for matching, messaging, analytics, marketing (with consent), and compliance reporting. We retain data only as long as necessary.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">3. Sharing</h3>
          <p className="text-sm text-slate-600">
            We share relevant information with providers/homeowners involved in a booking, payment processors, analytics tools, and law enforcement if required.
          </p>
          <h3 className="text-lg font-semibold text-slate-900">4. Security</h3>
          <p className="text-sm text-slate-600">
            We use HTTPS, role-based access, audit logging, and Stripe Connect to protect sensitive data. Notify us immediately at privacy@zaptasks.com if you suspect unauthorized access.
          </p>
        </section>

        <section className="bg-blue-50 border border-blue-100 rounded-3xl p-8 text-sm text-blue-900/90">
          <h2 className="text-xl font-semibold text-blue-900">Dispute resolution</h2>
          <ol className="list-decimal list-inside space-y-2 mt-3">
            <li>Contact support within 24 hours of the issue. We pause the remaining 50% payout.</li>
            <li>Submit photos, chat transcripts, and receipts. Providers may propose a fix or refund.</li>
            <li>ZapTasks mediates within 48 hours. Possible outcomes include partial refund, rework, or payout release.</li>
          </ol>
          <p className="mt-4">Escalations: hello@zaptasks.com • 1-888-ZAP-TASK (voicemail)</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
