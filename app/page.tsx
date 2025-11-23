"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  DollarSign,
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
    name: "Senior Support",
    description:
      "Extra help for seniors—from grocery runs to moving heavy items—provided by caring neighbours.",
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
    name: "Landlord & Home Repairs",
    description:
      "Quick fixes for rentals or your own home. Furniture assembly, minor repairs, and maintenance tasks.",
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
    name: "Yard Work & Seasonal",
    description:
      "Snow shovelling, leaf raking, and garden cleanup. Keep your property safe and tidy in every season.",
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
    copy: "Lock in the booking with secure payments via Stripe Connect. Funds are released to the helper as you confirm completion.",
  },
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <section className="flex flex-col-reverse lg:flex-row items-center gap-12 mb-16">
          <div className="w-full lg:w-1/2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm mb-4">
              Early Access • Join First Canadians
            </span>
            <h1 className="mt-4 text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              Get reliable local help in minutes
            </h1>
            <p className="mt-6 text-xl text-slate-600 max-w-2xl">
              Post your task, get offers from neighbours, chat securely, pay
              only when satisfied. No scams, no hassle – just Canadian
              communities helping each other.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/booking"
                className="btn btn-primary btn-lg text-white shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Post Job Free
              </Link>
              <Link
                href="/pro/jobs"
                className="btn btn-outline btn-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 flex items-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                Earn Helping Neighbours
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
            {services.map((service, index) => (
              <div
                key={service.id}
                className={`bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${
                  index === 0 ? "ring-2 ring-emerald-200/50" : ""
                }`}
              >
                {index === 0 && (
                  <span className="absolute -top-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold mb-2">
                    Most Popular
                  </span>
                )}
                <div className="w-24 h-24 group-hover:scale-110 transition-transform mb-4">
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
              ZapTasks keeps peer-to-peer work transparent with secure
              milestones that adapt to the size of every job:
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>Jobs under $100: 100% paid upfront to secure the slot.</li>
              <li>
                Jobs from $100–$500: 50% deposit to start, 50% on completion.
              </li>
              <li>
                Jobs over $500: milestone plan (30%/30%/40%) with progress
                payments.
              </li>
              <li>
                ZapTasks deducts a 10% platform fee (8% on larger trades)
                automatically.
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-16 py-12 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Be one of our first neighbours
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Join early Canadian communities getting fast, reliable local help.
              Your feedback shapes ZapTasks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="btn btn-primary btn-lg text-white shadow-lg"
              >
                Post First Job Free
              </Link>
              <Link
                href="/pro/jobs"
                className="btn btn-outline btn-lg border-2 border-emerald-200 hover:border-emerald-500"
              >
                Start Earning Today
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500 italic">
              &quot;Helped my mom with yard work &ndash; fast &amp; easy!&quot;
              &ndash; Early user
            </p>
          </div>
        </section>

        <section className="mb-16">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-2/3">
              <h3 className="text-2xl font-semibold text-blue-900">
                Marketplace trust for Canadian communities
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-900/80">
                <li>
                  • Secure Stripe payments handle deposits, progress payments,
                  and completion releases effortlessly.
                </li>
                <li>
                  • Transparent 10% platform fee keeps payouts, community
                  support running.
                </li>
                <li>
                  • Dispute desk with community-friendly resolution playbooks.
                </li>
              </ul>
            </div>
            <div className="md:w-1/3 space-y-3">
              <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-lg font-semibold text-blue-900">
                  Flat 10% marketplace fee
                </p>
                <p className="text-xs text-blue-900/70 mt-2">
                  Every job supports secure payments with one transparent 10%
                  ZapTasks fee (8% for eligible large projects).
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
