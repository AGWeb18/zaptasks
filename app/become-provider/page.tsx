"use client";

import { useMemo, useState } from "react";
import Navbar from "../components/NavBar";
import { createClient } from "../utils/supabase/client";
import { useUser } from "@clerk/nextjs";

const SERVICE_OPTIONS = [
  "Handyman & Repairs",
  "Home Cleaning",
  "Painting & Finishing",
  "Snow & Lawn Care",
];

export default function BecomeProviderPage() {
  const { user } = useUser();
  const [form, setForm] = useState({
    name: "",
    location: "",
    service: "",
    description: "",
  });
  const [pricingType, setPricingType] = useState<"hourly" | "flat">("hourly");
  const [hourlyRate, setHourlyRate] = useState("75");
  const [flatFee, setFlatFee] = useState("600");
  const [minimumHours, setMinimumHours] = useState("2");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const supabase = createClient();

  const pricingDisplay = useMemo(() => {
    if (pricingType === "hourly") {
      const rate = Number(hourlyRate || 0);
      const min = Number(minimumHours || 0);
      if (!rate) return "Hourly rate pending";
      return `$${rate.toFixed(0)}/hr • ${Math.max(min, 1)} hr min`;
    }
    const fee = Number(flatFee || 0);
    if (!fee) return "Project fee pending";
    return `$${fee.toFixed(0)} flat project fee`;
  }, [pricingType, hourlyRate, minimumHours, flatFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const numericHourlyRate = pricingType === "hourly" ? Number(hourlyRate) : null;
    const numericMinimumHours = pricingType === "hourly" ? Math.max(Number(minimumHours) || 1, 1) : null;
    const numericFlatFee = pricingType === "flat" ? Number(flatFee) : null;

    if (pricingType === "hourly" && (!numericHourlyRate || numericHourlyRate <= 0)) {
      setLoading(false);
      setError("Please provide an hourly rate greater than zero.");
      return;
    }

    if (pricingType === "flat" && (!numericFlatFee || numericFlatFee <= 0)) {
      setLoading(false);
      setError("Please provide a flat project fee greater than zero.");
      return;
    }

    const pricingPayload = {
      currency: "CAD",
      pricingType,
      hourlyRate: numericHourlyRate,
      flatFee: numericFlatFee,
      minimumHours: numericMinimumHours,
      display: pricingDisplay,
    };

    const baseRecord = {
      name: form.name,
      service: form.service,
      description: form.description,
      price: JSON.stringify(pricingPayload),
      location: form.location,
      user_id: user?.id || null,
    };

    const { error: dbError } = await supabase.from("providers").insert([baseRecord]);
    setLoading(false);
    if (dbError) {
      setError("There was an error submitting your information. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  const handleStripeOnboard = async () => {
    setOnboardingLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe-connect-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress }),
      });
      const data = await response.json();
      if (data.url) {
        // Save the Stripe accountId to the provider's record in Supabase
        await supabase.from("providers").update({ stripe_account_id: data.accountId }).eq("user_id", user?.id);
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        setError("Failed to start Stripe onboarding.");
      }
    } catch (err) {
      setError("Error connecting to Stripe. Please try again.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Become a Service Provider</h1>
        <p className="text-center text-gray-600 mb-6">
          Join our Canadian-owned marketplace and connect with homeowners across the Kawarthas and GTA.
        </p>
        {submitted ? (
          <div className="bg-green-100 p-6 rounded text-center">
            <h2 className="text-xl font-semibold mb-2">Thank you for signing up!</h2>
            <p>We will review your submission and contact you soon.</p>
            <button
              type="button"
              className="btn btn-outline w-full mt-2"
              onClick={handleStripeOnboard}
              disabled={onboardingLoading || loading}
            >
              {onboardingLoading ? "Redirecting to Stripe..." : "Connect Stripe for Payouts"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
            <input
              className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500"
              placeholder="Company Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500"
              placeholder="Location"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              required
            />
            <select
              className="select select-bordered w-full bg-white text-gray-900"
              value={form.service}
              onChange={e => setForm({ ...form, service: e.target.value })}
              required
            >
              <option value="" disabled>Select a Service</option>
              {SERVICE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <textarea
              className="textarea textarea-bordered w-full bg-white text-gray-900 placeholder-gray-500"
              placeholder="Service Description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
            />
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="pricingType">
                  Pricing Model
                </label>
                <select
                  id="pricingType"
                  className="select select-bordered w-full bg-white text-gray-900"
                  value={pricingType}
                  onChange={e => setPricingType(e.target.value as "hourly" | "flat")}
                >
                  <option value="hourly">Hourly rate (platform handles deposit)</option>
                  <option value="flat">Flat project fee</option>
                </select>
              </div>

              {pricingType === "hourly" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700" htmlFor="hourlyRate">
                      Hourly Rate (CAD)
                    </label>
                    <input
                      id="hourlyRate"
                      type="number"
                      min="1"
                      className="input input-bordered w-full bg-white text-gray-900"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700" htmlFor="minimumHours">
                      Minimum Billable Hours
                    </label>
                    <input
                      id="minimumHours"
                      type="number"
                      min="1"
                      className="input input-bordered w-full bg-white text-gray-900"
                      value={minimumHours}
                      onChange={e => setMinimumHours(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="flatFee">
                    Flat Project Fee (CAD)
                  </label>
                  <input
                    id="flatFee"
                    type="number"
                    min="1"
                    className="input input-bordered w-full bg-white text-gray-900"
                    value={flatFee}
                    onChange={e => setFlatFee(e.target.value)}
                    required
                  />
                </div>
              )}

              <p className="text-sm text-gray-600">
                Homeowners pay a 50% deposit up front. ZapTasks automatically deducts our platform fee through Stripe Connect.
              </p>
              <div className="rounded bg-white border border-dashed border-slate-300 p-3 text-sm text-gray-700">
                <span className="font-semibold">Displayed to homeowners:</span> {pricingDisplay}
              </div>
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
