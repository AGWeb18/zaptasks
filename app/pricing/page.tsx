import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";

const tiers = [
  {
    name: "Homeowners",
    price: "Free",
    description: "Post unlimited jobs with 50% deposit protection.",
    benefits: [
      "No posting fees or subscription",
      "Stripe-secured 50/50 payment flow",
      "In-app chat & dispute support",
      "Favourite providers for repeat work",
    ],
  },
  {
    name: "Providers – Standard",
    price: "15% platform fee",
    description: "Pay-as-you-go for every completed job.",
    benefits: [
      "Stripe Connect payouts within 2 business days",
      "Stripe Identity verification badge",
      "Job board access & instant alerts",
      "Dashboard for invoices and repeat clients",
    ],
  },
  {
    name: "Providers – Priority",
    price: "$9/mo + 10%",
    description: "Boosted visibility for power providers.",
    benefits: [
      "Priority placement in local searches",
      "Auto-responders & saved quotes",
      "Hot leads routed to SMS and email",
      "Monthly performance insights",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white text-slate-800 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white shadow-sm text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Transparent fees
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-4">Keep more of every booking with Stripe-powered payouts</h1>
          <p className="mt-4 text-slate-600">
            We operate as a Canadian marketplace with a simple 50/50 escrow payment model. Stripe Connect manages deposits, releases the remainder, and ensures providers meet compliance requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 flex flex-col">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{tier.name}</h2>
                <p className="text-3xl font-bold text-blue-700 mt-2">{tier.price}</p>
                <p className="text-sm text-slate-600 mt-3">{tier.description}</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {tier.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <span>•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-outline mt-6">
                Talk to our team
              </button>
            </div>
          ))}
        </div>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
            <h3 className="text-xl font-semibold text-blue-900">How the 50/50 model works</h3>
            <ol className="mt-4 space-y-3 text-sm text-blue-900/80 list-decimal list-inside">
              <li>Homeowner books and pays a 50% deposit. Funds sit in a Stripe Connect escrow balance.</li>
              <li>Provider completes the job and requests sign-off. Homeowner approves inside ZapTasks.</li>
              <li>Remaining 50% releases automatically to the provider, less the platform fee.</li>
            </ol>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <h3 className="text-xl font-semibold text-slate-900">Why we charge a platform fee</h3>
            <p className="text-sm text-slate-600 mt-2">
              We invest in vetting, dispute mediation, insurance compliance, and Canadian-based support. Providers only pay when they earn, and homeowners enjoy a safer local marketplace than informal groups.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Bulk or enterprise pricing is available for property managers booking 10+ jobs per month—reach out to hello@zaptasks.com.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
