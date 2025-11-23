import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";
import { ShieldCheck, MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "How does payment work?",
    answer:
      "Pay 100% upfront into escrow via Stripe (Apple Pay supported). Funds held securely until you mark complete. ZapTasks deducts 10% fee, releases 90% to helper same-day.",
  },
  {
    question: "What is the 10% fee for?",
    answer:
      "Covers Stripe processing (~3%), platform operations, dispute mediation, and community support. Transparent & fixed – no tiers.",
  },
  {
    question: "How do you connect helpers?",
    answer:
      "Anyone signs up. Helpers connect Stripe for payouts. Ratings/reviews build trust. Chat before booking. No formal vetting – community accountability.",
  },
  {
    question: "What if there's a dispute?",
    answer:
      "Pause payout, contact support via chat/email. We review chat logs/photos. Most resolve homeowner/helper agreement.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, before start: full refund. After start: escrow partial release based on work done. Helpers get 24h notice policy.",
  },
  {
    question: "Is my data private?",
    answer:
      "Only you see your jobs/chat/payments. Addresses private until award. Clerk GDPR-compliant auth.",
  },
  {
    question: "How do helpers get paid?",
    answer:
      "Stripe Connect: Direct bank deposit 1-2 days post-completion (CAD). Helpers see earnings minus 10% fee.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white text-slate-800 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1 max-w-4xl">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide shadow-sm">
            <ShieldCheck className="h-4 w-4" /> Simple & Secure
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-4">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Quick answers on payments, helpers, privacy, and how ZapTasks keeps
            things fair for Canadian neighbours.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <h2 className="text-lg font-semibold text-slate-900">
                  {faq.question}
                </h2>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 mt-2 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-slate-500 mb-4">Still have questions?</p>
          <button className="btn btn-primary">
            <MessageCircle className="w-5 h-5 mr-2" />
            Contact Support
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
