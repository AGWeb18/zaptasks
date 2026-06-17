"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, DollarSign, CheckCircle, Star } from "lucide-react";
import LottieWrapper from "./components/LottieWrapper";
import heroAnimation from "./animations/HeroAnimation.json";
import Navbar from "./components/NavBar";
import SiteFooter from "./components/SiteFooter";

const NewHomepage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Clean & Focused */}
      <main className="container mx-auto px-4">
        <section className="min-h-[85vh] flex flex-col justify-center items-center text-center py-20">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-6">
              <CheckCircle className="w-4 h-4" />
              Trusted by 200+ Canadians this week
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6">
              Get Local Help
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                in 3 Clicks
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Post your task. Get offers from neighbors. Pay securely when done.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/booking-wizard"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-6 h-6" />
                Post a Job Free
              </Link>
              <Link
                href="/pro/jobs"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-white hover:bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all"
              >
                <DollarSign className="w-6 h-6" />
                Find Work
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 border-2 border-white"
                    />
                  ))}
                </div>
                <span className="font-medium">200+ jobs this week</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-slate-300" />
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="ml-1 font-medium">4.9/5 average</span>
              </div>
            </div>
          </div>

          {/* Hero Animation */}
          <div className="mt-12 w-full max-w-2xl">
            <LottieWrapper
              animationData={heroAnimation}
              width="100%"
              height="300px"
            />
          </div>
        </section>

        {/* How It Works - Simple 3 Steps */}
        <section className="py-20 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Post Your Job
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Describe what you need in 2 minutes. Add photos if helpful.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-emerald-600">
                    2
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Get Offers
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Local helpers apply with their prices. Review & chat before
                  choosing.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black text-purple-600">3</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Pay Safely
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Secure payment through Stripe. Release when you&apos;re happy
                  with the work.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Tasks */}
        <section className="py-20 bg-gradient-to-b from-white to-blue-50 -mx-4 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-slate-900 mb-4">
              Popular Right Now
            </h2>
            <p className="text-center text-slate-600 mb-12">
              What neighbors are hiring for this week
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">❄️</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Snow Removal
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Driveway & walkway shoveling
                </p>
                <p className="text-xs text-slate-500">$40-80 average</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">🏠</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Home Repairs
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Quick fixes & handyman work
                </p>
                <p className="text-xs text-slate-500">$60-120 average</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">🧹</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Cleaning Help
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Deep clean & organizing
                </p>
                <p className="text-xs text-slate-500">$30-50/hr average</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Safety - Simple */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 rounded-3xl p-12 text-center border border-blue-100">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Safe & Secure
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-slate-700">
                <div>
                  <div className="text-3xl mb-3">🛡️</div>
                  <h3 className="font-semibold mb-2">Secure Payments</h3>
                  <p className="text-sm">Money held until job is done</p>
                </div>
                <div>
                  <div className="text-3xl mb-3">⭐</div>
                  <h3 className="font-semibold mb-2">Rated Helpers</h3>
                  <p className="text-sm">See reviews before hiring</p>
                </div>
                <div>
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="font-semibold mb-2">In-App Chat</h3>
                  <p className="text-sm">All communication tracked</p>
                </div>
              </div>
              <Link
                href="/faq"
                className="inline-block mt-8 text-blue-600 hover:text-blue-700 font-semibold"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Join hundreds of Canadians getting help from their neighbors
            </p>
            <Link
              href="/booking-wizard"
              className="inline-flex items-center justify-center gap-3 px-10 py-6 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-6 h-6" />
              Post Your First Job Free
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default NewHomepage;
