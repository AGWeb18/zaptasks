import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";
import { ShieldCheck, LifeBuoy, MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "How are providers verified?",
    answer:
      "All providers complete Stripe Identity verification, agree to our code of conduct, and must maintain a rating above 4.3. We manually spot-check insurance certificates for higher-risk trades.",
  },
  {
    question: "What happens if there is a dispute?",
    answer:
      "Contact support within 24 hours. We pause the remaining 50% payout and gather documentation from both sides. Most disputes resolve in under 48 hours thanks to our mediation checklist.",
  },
  {
    question: "Can I get a refund on the deposit?",
    answer:
      "Deposits are fully refundable if the provider cancels or if you revoke approval before work begins. After work starts, we follow the scope agreed to in writing between you and the provider.",
  },
  {
    question: "How do payouts work for providers?",
    answer:
      "Stripe Connect releases funds to your bank account within two business days once a job is marked complete. You can track transfers in the provider dashboard under Payments.",
  },
  {
    question: "Do you offer support on weekends?",
    answer:
      "Yes. Live chat is monitored Monday to Saturday (8am–8pm EST) and on-call escalation covers urgent weekend disputes.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white text-slate-800 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1 max-w-4xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-blue-700 text-xs font-semibold uppercase tracking-wide shadow-sm">
            <ShieldCheck className="h-4 w-4" /> Trust & Support
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-4">Frequently asked questions</h1>
          <p className="mt-3 text-slate-600">
            Everything you need to know about ZapTasks security, the 50/50 payment structure, and how we support the Kawarthas & GTA community.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{faq.question}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-3">
            <LifeBuoy className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Need a human?</h3>
              <p className="text-blue-900/80">
                Email hello@zaptasks.com or start an Intercom chat. Our support team is based in Ontario and typically responds within an hour.
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex gap-3">
            <MessageCircle className="h-8 w-8 text-emerald-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Provider community</h3>
              <p className="text-slate-600">
                Join our private Discord to swap tips, share equipment, and receive early job alerts in your neighbourhood.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
