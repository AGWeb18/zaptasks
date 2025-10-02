"use client";

import { useMemo, useState } from "react";
import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";
import { createClient } from "../utils/supabase/client";
import { useUser } from "@clerk/nextjs";
import { Compass, Loader2, ShieldCheck, Zap } from "lucide-react";

const SERVICE_OPTIONS = [
  { value: "Home Repairs", label: "Home repairs & punch lists" },
  { value: "Cleaning & Turnover", label: "Cleaning & turnover" },
  { value: "Outdoor & Seasonal", label: "Outdoor & seasonal upkeep" },
];

const AVAILABILITY_OPTIONS = ["Weekdays", "Weeknights", "Weekends", "Emergency on-call"];

export default function OfferServicesPage() {
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
  const [experienceYears, setExperienceYears] = useState("3");
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(["Weekdays"]);
  const [hasInsurance, setHasInsurance] = useState(true);
  const [acceptsVerification, setAcceptsVerification] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);

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

    if (!acceptsVerification) {
      setLoading(false);
      setError("Providers must agree to Stripe Identity verification.");
      return;
    }

    const pricingPayload = {
      currency: "CAD",
      pricingType,
      hourlyRate: numericHourlyRate,
      flatFee: numericFlatFee,
      minimumHours: numericMinimumHours,
      display: pricingDisplay,
      availability: selectedAvailability,
      experienceYears: Number(experienceYears || 0),
      hasInsurance,
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

  const handleAvailabilityToggle = (value: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator?.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await response.json();
          if (data.formattedAddress) {
            setForm((prev) => ({ ...prev, location: data.formattedAddress }));
          }
        } catch (err) {
          console.error("Geolocation lookup failed", err);
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
    );
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
        await supabase.from("providers").update({ stripe_account_id: data.accountId }).eq("user_id", user?.id);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white text-gray-800 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-3xl flex-1">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-xs font-semibold uppercase text-blue-700">
            <Zap className="h-4 w-4" /> 1-minute onboarding
          </span>
          <h1 className="text-3xl font-bold mt-4">Offer Your Home Services</h1>
          <p className="text-gray-600 mt-2">
            Join our Canadian-owned marketplace and help neighbours across the country keep their homes running smoothly. Complete the essentials below—verification and payouts are handled automatically.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm text-slate-600">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Step 1</p>
            <p>Tell us who you are and where you work.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Step 2</p>
            <p>Share your specialties and availability.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Step 3</p>
            <p>Connect Stripe payouts and verify ID.</p>
          </div>
        </div>
        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
            <h2 className="text-xl font-semibold mb-2">Thanks for listing your skills!</h2>
            <p className="text-slate-600">
              We&apos;ll review your details within 1 business day. Next, complete payout onboarding so you can accept jobs and receive deposits automatically.
            </p>
            <button
              type="button"
              className="btn btn-primary w-full mt-4 text-white"
              onClick={handleStripeOnboard}
              disabled={onboardingLoading || loading}
            >
              {onboardingLoading ? "Redirecting to Stripe..." : "Set up payouts with Stripe"}
            </button>
            <p className="text-xs text-slate-500 mt-3">
              Stripe Identity verification is required for ZapTasks badges and to receive funds.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500"
                placeholder="Business or trade name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <div className="relative">
                <input
                  className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Service area (city, postal code)"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="btn btn-ghost btn-sm absolute right-2 top-2"
                >
                  {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4 text-blue-600" />}
                </button>
              </div>
            </div>
            <select
              className="select select-bordered w-full bg-white text-gray-900"
              value={form.service}
              onChange={e => setForm({ ...form, service: e.target.value })}
              required
            >
              <option value="" disabled>Select your primary service</option>
              {SERVICE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <textarea
              className="textarea textarea-bordered w-full bg-white text-gray-900 placeholder-gray-500"
              placeholder="Describe the jobs you love, certifications, equipment, and travel radius"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control w-full">
                <span className="label-text">Years of experience</span>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered"
                  value={experienceYears}
                  onChange={e => setExperienceYears(e.target.value)}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Availability</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => handleAvailabilityToggle(option)}
                      className={`btn btn-xs ${selectedAvailability.includes(option) ? "btn-primary" : "btn-outline"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="pricingType">
                  Pricing model
                </label>
                <select
                  id="pricingType"
                  className="select select-bordered w-full bg-white text-gray-900"
                  value={pricingType}
                  onChange={e => setPricingType(e.target.value as "hourly" | "flat")}
                >
                  <option value="hourly">Hourly rate (winter rush friendly)</option>
                  <option value="flat">Flat project fee</option>
                </select>
              </div>

              {pricingType === "hourly" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700" htmlFor="hourlyRate">
                      Hourly rate (CAD)
                    </label>
                    <input
                      id="hourlyRate"
                      type="number"
                      min="1"
                      className="input input-bordered w-full bg-white text-gray-900"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700" htmlFor="minimumHours">
                      Minimum hours
                    </label>
                    <input
                      id="minimumHours"
                      type="number"
                      min="1"
                      className="input input-bordered w-full bg-white text-gray-900"
                      value={minimumHours}
                      onChange={e => setMinimumHours(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700" htmlFor="flatFee">
                      Project fee (CAD)
                    </label>
                    <input
                      id="flatFee"
                      type="number"
                      min="1"
                      className="input input-bordered w-full bg-white text-gray-900"
                      value={flatFee}
                      onChange={e => setFlatFee(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasInsurance}
                  onChange={e => setHasInsurance(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                I carry liability insurance or will provide proof before first booking.
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptsVerification}
                  onChange={e => setAcceptsVerification(e.target.checked)}
                  className="checkbox checkbox-sm"
                  required
                />
                I agree to complete Stripe Identity verification for a ZapTasks “Verified” badge.
              </label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary w-full text-white"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Finish in under a minute"}
            </button>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5" />
              <span>
                Once you&apos;re approved, deposits flow instantly via Stripe Connect. ZapTasks takes a small platform fee so you keep more of every booking.
              </span>
            </div>
          </form>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
