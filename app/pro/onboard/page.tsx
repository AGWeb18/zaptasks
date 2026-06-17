"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  Shield,
  Lock,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Building,
  AlertTriangle,
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
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

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
              <h1 className="text-3xl font-bold text-slate-900 mb-4">
                Get paid securely
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                To receive payments for your jobs, we need to connect your bank
                account. We partner with <strong>Stripe</strong> to handle all
                financial data securely.
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
                    Your banking data is encrypted and never stored on our
                    servers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Direct Deposit
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Funds are routed directly to your account. No holding
                    periods.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to connect?</h3>
                <p className="text-slate-300 text-sm mb-4 md:mb-0">
                  You will be redirected to Stripe&apos;s secure portal to
                  verify your identity.
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
                  <span>Why do I need to provide my SIN/SSN?</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </summary>
                <p className="text-slate-600 text-sm mt-2 pl-4 border-l-2 border-slate-200">
                  Payment processors are required by law (KYC/AML regulations)
                  to verify the identity of anyone receiving money to prevent
                  fraud and money laundering.
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
