"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  DollarSign,
  CheckCircle,
  MapPin,
  Clock,
  Wallet,
} from "lucide-react";
import LottieWrapper from "./components/LottieWrapper";
import heroAnimation from "./animations/HeroAnimation.json";
import Navbar from "./components/NavBar";
import SiteFooter from "./components/SiteFooter";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="container mx-auto px-4">
        {/* Hero — Earners First */}
        <section className="min-h-[85vh] flex flex-col justify-center items-center text-center py-20">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-6">
              <MapPin className="w-4 h-4" />
              Your neighbourhood is hiring
            </div>

            <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6">
              Get Paid Helping
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
                Your Neighbours
              </span>
            </h1>

            <p className="text-2xl text-slate-600 mb-6 max-w-2xl mx-auto leading-relaxed">
              Browse local jobs, set your own hours and rates. ZapTasks takes
              just 10% — no subscriptions, no lead fees.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500 mb-12">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                Your schedule
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Your rates
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                No boss
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/pro/onboard"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                <DollarSign className="w-6 h-6" />
                Start Earning Today
              </Link>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-white hover:bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all"
              >
                <Sparkles className="w-6 h-6" />
                Post a Job Free
              </Link>
            </div>
          </div>

          <div className="w-full max-w-2xl">
            <LottieWrapper
              animationData={heroAnimation}
              width="100%"
              height="300px"
            />
          </div>
        </section>

        {/* How It Works — For Helpers */}
        <section className="py-20 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Start earning in minutes
              </h2>
              <p className="text-xl text-slate-600">
                For people who want to earn on their own terms
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 mb-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-emerald-600">
                    1
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Sign Up & Add Your Bank
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Create your account and connect your bank once. Payouts go
                  straight to you after every job.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-emerald-600">
                    2
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Browse & Apply
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  See jobs posted nearby. Apply to the ones you want. No minimum
                  hours, no quotas.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-emerald-600">
                    3
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Do the Work, Get Paid
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Complete the job, the homeowner confirms, and payment lands in
                  your bank. Simple.
                </p>
              </div>
            </div>

            <div className="text-center mb-20">
              <Link
                href="/pro/onboard"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                <DollarSign className="w-5 h-5" />
                Become a Helper
              </Link>
            </div>

            {/* For Job Posters */}
            <div className="border-t border-slate-200 pt-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">
                  Need something done?
                </h2>
                <p className="text-xl text-slate-600">
                  Post your job, get offers from real neighbours
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-black text-blue-600">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Post Your Job
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Describe what you need. Add photos if helpful. Takes under 2
                    minutes.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-black text-blue-600">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Pick Your Helper
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Local helpers apply with their prices. Read their reviews and
                    chat before deciding.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-black text-blue-600">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Pay When Satisfied
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Your payment is held securely. Released to the helper only
                    when you confirm it&apos;s done.
                  </p>
                </div>
              </div>

              <div className="text-center mt-12">
                <Link
                  href="/booking"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Post a Job Free
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Categories */}
        <section className="py-20 bg-gradient-to-b from-white to-slate-50 -mx-4 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-slate-900 mb-4">
              Popular jobs right now
            </h2>
            <p className="text-center text-slate-600 mb-12">
              A few categories neighbours are posting
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  emoji: "❄️",
                  name: "Snow Removal",
                  desc: "Driveway & walkway shoveling",
                },
                {
                  emoji: "🏠",
                  name: "Home Repairs",
                  desc: "Quick fixes & handyman work",
                },
                {
                  emoji: "🧹",
                  name: "Cleaning Help",
                  desc: "Deep clean & organizing",
                },
                {
                  emoji: "🌿",
                  name: "Yard Work",
                  desc: "Lawn care, raking, gardening",
                },
                {
                  emoji: "🎨",
                  name: "Painting",
                  desc: "Interior & exterior touch-ups",
                },
                {
                  emoji: "🛒",
                  name: "Senior Support",
                  desc: "Errands, grocery runs & more",
                },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href="/pro/jobs"
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all group"
                >
                  <div className="text-4xl mb-3">{cat.emoji}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-600">{cat.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Safety */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Safe for everyone
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-slate-700">
                <div>
                  <div className="text-3xl mb-3">🛡️</div>
                  <h3 className="font-semibold mb-2">Secure Payments</h3>
                  <p className="text-sm">
                    Funds held until the job is confirmed complete
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-3">⭐</div>
                  <h3 className="font-semibold mb-2">Rated Helpers</h3>
                  <p className="text-sm">
                    Every job earns a review — good work builds reputation
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="font-semibold mb-2">In-App Chat</h3>
                  <p className="text-sm">
                    All communication tracked and kept in one place
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Ready to start earning?
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Your neighbours are already looking for help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pro/onboard"
                className="inline-flex items-center justify-center gap-3 px-10 py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                <DollarSign className="w-6 h-6" />
                Start Earning Today
              </Link>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-3 px-8 py-6 bg-white hover:bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all"
              >
                Post a Job
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default HomePage;
