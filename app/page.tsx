"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  CreditCard,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import LottieWrapper from "./components/LottieWrapper";
import heroAnimation from "./animations/HeroAnimation.json";
import yardworkAnimation from "./animations/YardWork.json";
import handymanAnimation from "./animations/Handyman.json";
import paintingAnimation from "./animations/Painting.json";
import bookingAnimation from "./animations/Booking.json";
import cleaningAnimation from "./animations/cleaningAnimation.json";
import Navbar from "./components/NavBar";
import ServiceSearchBar from "./components/ServiceSearchBar";
import TestimonialsCarousel, {
  Testimonial,
} from "./components/TestimonialsCarousel";
import SiteFooter from "./components/SiteFooter";

import helpingHandsAnimation from "./animations/HelpingHands.json";

const services = [
  {
    id: "grocery",
    icon: (
      <LottieWrapper
        animationData={helpingHandsAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Grocery Runs",
    description:
      "A friendly neighbour can pick up and deliver your groceries, whether it's a few items or a full list.",
  },
  {
    id: "handyman",
    icon: (
      <LottieWrapper
        animationData={handymanAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "General Help",
    description:
      "Need an extra hand? Get help with small tasks, moving furniture, or assembling items around the house.",
  },
  {
    id: "outdoor",
    icon: (
      <LottieWrapper
        animationData={yardworkAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Yard Work",
    description:
      "From raking leaves to shovelling snow, neighbours can help keep your property looking great year-round.",
  },
];

const bookingSteps = [
  {
    icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
    title: "Post your job",
    copy: "Share what you need done, set your budget, and reach nearby neighbours in under 60 seconds.",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
    title: "Compare offers",
    copy: "Nearby neighbours and helpers apply with their availability. Chat in-app, review ratings, and pick the offer that fits.",
  },
  {
    icon: <CreditCard className="w-6 h-6 text-blue-600" />,
    title: "Secure & finish",
    copy: "Lock in the booking with the right escrow milestone via Stripe Connect, then release the rest once the job is signed off.",
  },
];

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Marisa P.",
    role: "Cottage owner",
    rating: 5,
    quote:
      "ZapTasks lined up a snow removal crew within an hour. The tiered escrow made paying and tipping straightforward.",
    location: "Muskoka, ON",
  },
  {
    id: "2",
    name: "Devon S.",
    role: "Licensed electrician",
    rating: 5,
    quote:
      "Provider onboarding took minutes. Stripe payouts hit fast so I can focus on the work, not chasing invoices.",
    location: "Winnipeg, MB",
  },
  {
    id: "3",
    name: "Nadia L.",
    role: "Downtown homeowner",
    rating: 4,
    quote:
      "Loved the in-app chat. I booked a deep clean and follow-up touch-ups without digging through emails.",
    location: "Vancouver, BC",
  },
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <section className="flex flex-col-reverse lg:flex-row items-center gap-12 mb-16">
          <div className="w-full lg:w-1/2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm">
              🇨🇦 Proudly Canadian • Built for local communities
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Need a hand? Post a task and get help from a neighbour.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              ZapTasks is the Canadian marketplace where you can post any
              task—from grocery runs to yard work—and find trusted neighbours to
              help. Compare offers, chat before booking, and pay securely.
            </p>
            <div className="mt-6">
              <ServiceSearchBar />
              <p className="mt-2 text-xs text-slate-500">
                We use your selections to pre-fill the job post so you can
                publish and get offers faster.
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Tiered escrow with every booking
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                In-app chat before you commit
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/booking"
                className="btn btn-primary btn-lg text-white"
              >
                Post a Job & Get Offers
              </Link>
              <Link
                href="/pro/jobs"
                className="btn btn-outline btn-lg border-2 border-blue-200 hover:border-blue-500"
              >
                Find Local Jobs
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Every hire earns a public review, so you can build a shortlist of
              neighbours you trust for future projects.
            </p>
          </div>
          <div className="w-full lg:w-1/2 flex justify-center">
            <LottieWrapper
              animationData={heroAnimation}
              width="100%"
              height="400px"
            />
          </div>
        </section>

        <section className="mb-16">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Popular tasks neighbours are helping with
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              From coastal cottages to downtown condos across Canada, ZapTasks
              connects you with friendly neighbours for everyday help.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-full flex justify-center mb-4">
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {service.name}
                </h3>
                <p className="text-sm text-slate-600">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mb-16">
          <h3
            id="how-it-works-title"
            className="text-3xl font-bold mb-8 text-center"
          >
            <a href="#how-it-works-title" className="anchor-link">
              How the Marketplace Works
            </a>
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="md:w-1/2">
              <ol className="space-y-6">
                {bookingSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex items-start gap-4 bg-white rounded-xl shadow-sm p-5 border border-slate-100"
                  >
                    <span className="flex items-center justify-center rounded-full bg-blue-50 w-12 h-12 flex-shrink-0">
                      {step.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Step {index + 1}: {step.title}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <LottieWrapper
                animationData={bookingAnimation}
                width="100%"
                height="400px"
              />
            </div>
          </div>
          <div className="mt-8 bg-gray-100 p-6 rounded-lg">
            <h4 id="payment-structure" className="text-xl font-semibold mb-2">
              <a href="#payment-structure" className="anchor-link">
                Marketplace Payment Structure
              </a>
            </h4>
            <p>
              ZapTasks keeps peer-to-peer work transparent with tiered escrow
              that adapts to the size of every job:
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>Jobs under $100: 100% held in escrow until completion.</li>
              <li>
                Jobs from $100–$500: 50% deposit before work, 50% on approval.
              </li>
              <li>
                Jobs over $500: milestone plan (30%/30%/40%) with progress
                payments.
              </li>
              <li>
                ZapTasks deducts a 10% platform fee (8% on larger trades) once
                funds are released.
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-16">
          <TestimonialsCarousel
            testimonials={testimonials}
            className="bg-gradient-to-br from-white via-blue-50/50 to-white"
          />
        </section>

        <section className="mb-16">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-2/3">
              <h3 className="text-2xl font-semibold text-blue-900">
                Marketplace trust for Canadian communities
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-900/80">
                <li>
                  • Tiered Stripe escrow handles deposits, progress payments,
                  and completion releases.
                </li>
                <li>
                  • Transparent 10% platform fee (8% on large trades) keeps
                  payouts, insurance guidance, and support running.
                </li>
                <li>
                  • Dispute desk with 24-hour triage and community-friendly
                  resolution playbooks.
                </li>
              </ul>
            </div>
            <div className="md:w-1/3 space-y-3">
              <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-lg font-semibold text-blue-900">
                  Flat 10% marketplace fee
                </p>
                <p className="text-xs text-blue-900/70 mt-2">
                  Every job supports escrow-style payments, dispute resolution,
                  and local customer success with one transparent 10% ZapTasks
                  fee (8% for eligible large projects).
                </p>
              </div>
              <Link
                href="/faq"
                className="btn btn-outline w-full border-blue-300"
              >
                See Trust & Safety FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
