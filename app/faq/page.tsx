"use client";
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
      "You pay the full job amount upfront, which is held securely in escrow through Stripe. Funds are only released to your helper once you mark the job as complete. ZapTasks deducts a 10% platform fee and releases the remainder to the helper — typically within 1–2 business days.",
  },
  {
    question: "What is the 10% platform fee for?",
    answer:
      "The fee covers Stripe payment processing (roughly 3%), platform operations, secure escrow management, and dispute mediation. It's a flat, transparent rate with no hidden tiers or surprises.",
  },
  {
    question: "How do I find a helper?",
    answer:
      "Post your job and local helpers will apply. You can review their profiles and ratings, message them through the platform before accepting, and choose who you're most comfortable with. Once you accept an application, the job is locked in.",
  },
  {
    question: "What happens if there's a dispute?",
    answer:
      "Contact our support team within 24 hours of the issue — we'll pause any remaining payouts while we review the situation. Submit photos, chat transcripts, and any receipts you have. We aim to mediate and reach a resolution within 48 hours. Outcomes may include a partial refund, rework, or payout release depending on the evidence.",
  },
  {
    question: "Can I cancel a job?",
    answer:
      "If you cancel before the helper starts work, you'll receive a full refund. Once work has begun, any escrow release will be proportional to the work completed. Helpers also have a 24-hour notice policy — please communicate early if plans change.",
  },
  {
    question: "Is my personal information kept private?",
    answer:
      "Only you can see your jobs, messages, and payment history. Your exact address is kept private and only shared with a helper after you've accepted their application. Authentication is handled by Clerk, which is fully GDPR-compliant.",
  },
  {
    question: "How and when do helpers get paid?",
    answer:
      "Helpers receive payment through Stripe Connect, deposited directly to their bank account in Canadian Dollars (CAD). Payouts typically arrive 1–2 business days after you mark the job complete. Helpers see their net earnings after the 10% platform fee.",
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
            Answers to common questions about payments, helpers, privacy, and
            how ZapTasks keeps things fair for Canadian neighbours.
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
          <a href="mailto:myzaptasks@gmail.com" className="btn btn-primary">
            <MessageCircle className="w-5 h-5 mr-2" />
            Contact Support
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
