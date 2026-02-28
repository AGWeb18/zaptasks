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
    copy: "Tell us what you need, your budget, and your timing in a simple form built for first-time users.",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
    title: "Compare offers",
    copy: "Nearby helpers apply with availability. Review ratings, ask questions, and choose who feels right.",
  },
  {
    icon: <CreditCard className="w-6 h-6 text-blue-600" />,
    title: "Secure & finish",
    copy: "Pay securely through ZapTasks and release payment after the task is complete.",
  },
];

const conciergeHighlights = [
  "Large, plain-language booking flow for non-tech users",
  "Simple support options for seniors and busy families",
  "Book the same trusted helper again in one tap",
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <section className="flex flex-col-reverse lg:flex-row items-center gap-12 mb-16">
          <div className="w-full lg:w-1/2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm mb-4">
              🇨🇦 Early Canadians Helping Neighbours
            </span>
            <h1 className="mt-4 text-5xl md:text-7xl font-black text-slate-900 leading-tight mb-6">
              Local Help
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                in Minutes
              </span>
            </h1>
            <p className="mt-6 text-xl text-slate-600 max-w-2xl">
              Post your task in minutes, compare local helpers, and pay
              securely after the job is done. Designed for everyday people,
              including first-time and non-tech users.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/booking"
                className="btn btn-primary btn-lg text-white shadow-xl hover:shadow-2xl px-8 py-4 text-lg font-semibold flex items-center gap-3"
              >
                <Sparkles className="w-6 h-6" />
                Post Job Free
              </Link>
              <Link
                href="/pro/jobs"
                className="btn btn-outline btn-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 px-8 py-4 text-lg font-semibold flex items-center gap-3"
              >
                <DollarSign className="w-6 h-6" />
                Earn Helping
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
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 md:p-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-emerald-900">
                Built for real neighbours, not just power users
              </h2>
              <p className="mt-3 text-emerald-900/80">
                ZapTasks is being built to feel simple and welcoming. The goal
                is to help you book trusted local help quickly, even if you are
                not comfortable with apps.
              </p>
            </div>
            <ul className="mt-6 grid gap-3 md:grid-cols-3">
              {conciergeHighlights.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl bg-white border border-emerald-100 p-4 text-sm text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
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
                  • Secure Stripe payments protect both sides with one
                  transparent flow.
                </li>
                <li>
                  • Transparent 10% platform fee keeps pricing easy to
                  understand.
                </li>
                <li>
                  • Reviews, completion tracking, and dispute support build
                  trust in the community.
                </li>
              </ul>
            </div>
            <div className="md:w-1/3 space-y-3">
              <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-lg font-semibold text-blue-900">
                  Flat 10% marketplace fee
                </p>
                <p className="text-xs text-blue-900/70 mt-2">
                  Every completed job includes one transparent 10% ZapTasks fee
                  and clear payout details for helpers.
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
