"use client";

import React, { useState } from "react";
import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  Shield,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Banknote,
  AlertTriangle,
  User,
} from "lucide-react";

export default function PayoutOnboarding() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectStripe = async () => {
    if (!isLoaded || !isSignedIn || !user) {
      setError("Please sign in first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe-connect-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.username || "",
        }),
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message || "Failed to connect.");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-5">
              <User className="w-4 h-4" />
              Free — takes about a minute
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              First, create your free account
            </h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              Sign up to become a helper. After that, we&apos;ll connect your
              bank through Stripe so you can get paid for jobs.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <SignUpButton mode="modal">
                <button className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors">
                  Create free account
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="px-7 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors">
                  I already have one
                </button>
              </SignInButton>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-2 bg-slate-100">
            <div className="h-full bg-blue-600 w-1/3"></div>
          </div>
          <div className="p-8 md:p-12">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-4">
                <User className="w-4 h-4" />
                For individuals — no business required
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">
                Set up your payouts
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                To get paid for jobs, connect your bank account through{" "}
                <strong>Stripe</strong>. You&apos;re signing up as an
                individual — the same way you&apos;d open a personal bank
                account. No business name or company needed.
              </p>
            </div>

            {/* What Stripe will ask */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Stripe will ask for:
              </p>
              <ul className="space-y-2">
                {[
                  "Your legal name",
                  "Date of birth",
                  "Home address",
                  "Last 4 digits of your SIN (Social Insurance Number)",
                  "A bank account or debit card for deposits",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-3">
                If you see a &ldquo;website&rdquo; field, it will be
                pre-filled with zaptasks.com — just leave it as is.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Bank-Grade Security
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Your data is encrypted and never stored on our servers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Direct Deposit
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Funds go straight to your personal account after each job.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to connect?</h3>
                <p className="text-slate-300 text-sm mb-4 md:mb-0">
                  Takes about 3 minutes. You&apos;ll be redirected to
                  Stripe&apos;s secure portal.
                </p>
              </div>

              <button
                onClick={handleConnectStripe}
                disabled={isLoading}
                className={`
                  whitespace-nowrap px-6 py-3 rounded-lg font-semibold text-slate-900
                  transition-all duration-200 flex items-center gap-2
                  ${
                    isLoading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-400 hover:shadow-lg hover:-translate-y-0.5"
                  }
                `}
              >
                {isLoading ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <span>Connect with Stripe</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-8">
            <h4 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              Common Questions
            </h4>

            <div className="space-y-4">
              <details className="group cursor-pointer">
                <summary className="flex justify-between items-center font-medium text-slate-700 list-none">
                  <span>I&apos;m not a business owner — is that okay?</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-slate-600 text-sm mt-2 pl-4 border-l-2 border-slate-200">
                  Completely fine. ZapTasks is designed for individual helpers
                  — handymen, students, neighbours, anyone. You sign up as a
                  person, not a company. Stripe handles payments for
                  individuals all the time.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="flex justify-between items-center font-medium text-slate-700 list-none">
                  <span>Why do I need to provide my SIN?</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-slate-600 text-sm mt-2 pl-4 border-l-2 border-slate-200">
                  Payment processors are required by law (KYC/AML regulations)
                  to verify the identity of anyone receiving money. Stripe
                  only needs the last 4 digits for most people — the same
                  check a bank runs when you open an account.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="flex justify-between items-center font-medium text-slate-700 list-none">
                  <span>I see a &ldquo;website&rdquo; or &ldquo;business&rdquo; field — what do I enter?</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-slate-600 text-sm mt-2 pl-4 border-l-2 border-slate-200">
                  Leave it as <strong>zaptasks.com</strong> — it should
                  already be filled in. That&apos;s the platform you&apos;re
                  working through, and Stripe accepts it for marketplace
                  workers. You don&apos;t need your own website.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="flex justify-between items-center font-medium text-slate-700 list-none">
                  <span>Does ZapTasks see my bank login?</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-slate-600 text-sm mt-2 pl-4 border-l-2 border-slate-200">
                  <strong>No.</strong> We never see or store your login
                  credentials or full account numbers. All sensitive data is
                  entered directly on Stripe&apos;s encrypted servers.
                </p>
              </details>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Powered by Stripe Connect. Protected by 256-bit encryption.
        </p>
      </main>
    </div>
  );
}
