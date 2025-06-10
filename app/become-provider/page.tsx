"use client";

import { useState } from "react";
import Navbar from "../components/NavBar";
import { createClient } from "../utils/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const SERVICE_OPTIONS = [
  "Handyman Services",
  "Lawn Mowing",
  "Deep Cleaning",
  "Painting",
  "Pet Care Assistance",
  "Basic Tech Support",
  "Event Assistance",
  "Yard Work",
  "Pressure Washing"
];

export default function BecomeProviderPage() {
  const { user } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    location: "",
    service: "",
    description: "",
    price: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Insert a row into providers table with all required fields
    const { error: dbError } = await supabase.from("providers").insert([
      {
        name: form.name,
        service: form.service,
        description: form.description,
        price: form.price,
        location: form.location,
        user_id: user?.id || null,
      }
    ]);
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
        <h1 className="text-3xl font-bold mb-6 text-center">Become a Service Provider</h1>
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
            <input
              className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500"
              placeholder="Price (e.g. $50/hour)"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              required
            />
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
