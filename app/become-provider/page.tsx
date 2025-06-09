"use client";

import { useState } from "react";
import Navbar from "../components/NavBar";
import { createClient } from "../utils/supabase/client";
import { useUser } from "@clerk/nextjs";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Become a Service Provider</h1>
        {submitted ? (
          <div className="bg-green-100 p-6 rounded text-center">
            <h2 className="text-xl font-semibold mb-2">Thank you for signing up!</h2>
            <p>We will review your submission and contact you soon.</p>
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
