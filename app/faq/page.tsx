import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";
import { ShieldCheck, LifeBuoy, MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "How do you vet providers?",
    answer:
      "Providers onboard through Stripe Connect Standard to enable payouts. We review profiles for completeness, encourage in-app messaging before booking, and highlight ratings from homeowners after every job.",
  },
  {
    question: "What happens if there is a dispute?",
    answer:
      "Contact support within 24 hours. We pause any remaining payouts and gather documentation from both sides. Most disputes resolve in under 48 hours thanks to our mediation checklist.",
  },
  {
    question: "Can I get a refund on the deposit?",
    answer:
      "Payments follow our secure milestone model. They are fully refundable if the provider cancels or if you revoke approval before work begins. After work starts, we follow the scope agreed to in writing between you and the provider.",
  },
  {
    question: "How do payouts work for providers?",
    answer:
      "Stripe Connect releases funds to your bank account within two business days once a job is marked complete. You can track transfers in the provider dashboard under Payments.",
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
          <h1 className="text-3xl md:text-4xl font-bold mt-4">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-slate-600">
            Everything you need to know about ZapTasks security, the secure
            payment structure, and how we support Canadian communities.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {faq.question}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
