/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import Navbar from "../components/NavBar";
import AddressAutocomplete from "../components/AddressAutocomplete";
import TimeSelector from "../components/TimeSelector";

interface ServiceOption {
  id: string;
  label: string;
  summary: string;
  examples: string[];
}

const serviceOptions: ServiceOption[] = [
  {
    id: "yard-care",
    label: "Yard & Outdoor Care",
    summary:
      "Lawn mowing, garden tidy-ups, snow clearing, and seasonal curb appeal.",
    examples: [
      "Weekly lawn cuts",
      "Leaf and branch cleanups",
      "Deck or patio sweep",
    ],
  },
  {
    id: "home-fixes",
    label: "Home Fixes & Odd Jobs",
    summary:
      "Minor repairs, furniture assembly, and quick fixes handled by trusted locals.",
    examples: [
      "Mount a TV",
      "Repair drywall nicks",
      "Assemble flat-pack furniture",
    ],
  },
];

const formatCurrency = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-CA", { style: "currency", currency: "CAD" })
    : "";

const termsAndConditions = `
ZapTasks Terms & Conditions

• ZapTasks connects homeowners with independent Canadian service providers. We do not guarantee service outcomes.
• When you approve a provider, 50% of the agreed price is collected up front via secure Stripe escrow. The remaining 50% is released once you mark the job complete.
• Cancellations inside 24 hours of the scheduled start may forfeit the deposit. Report any disputes to ZapTasks within 48 hours so we can help mediate.
• Providers may request photos or ID verification before arriving. Ensure the work area is safe and accessible.
• Using ZapTasks means you accept these terms and agree to our Privacy Policy and Terms of Service.`;

const BookingPage: React.FC = () => {
  const { isLoaded, user } = useUser();
  const searchParams = useSearchParams();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState(2);
  const [bringEquipment, setBringEquipment] = useState(true);
  const [budgetType, setBudgetType] = useState<"flat" | "hourly">("flat");
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [budgetNotes, setBudgetNotes] = useState<string>("");
  const [contactPreference, setContactPreference] = useState<
    "messages" | "phone" | "email"
  >("messages");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">(
    "idle"
  );
  const [minDate, setMinDate] = useState("");

  const suggestedTitle = useMemo(() => {
    if (selectedService === "yard-care") {
      return "Need yard help nearby";
    }
    if (selectedService === "home-fixes") {
      return "Local help needed for a quick fix";
    }
    return "";
  }, [selectedService]);

  useEffect(() => {
    const tomorrow = addDays(new Date(), 1);
    setMinDate(format(tomorrow, "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    const presetService = searchParams.get("service");
    const mapped = (() => {
      switch (presetService) {
        case "yard":
        case "outdoor":
        case "lawn":
          return "yard-care";
        case "handyman":
        case "fix":
          return "home-fixes";
        default:
          return null;
      }
    })();

    if (mapped) {
      setSelectedService(mapped);
      if (!jobTitle) {
        setJobTitle(
          mapped === "yard-care"
            ? "Looking for yard help"
            : "Need a reliable local pro"
        );
      }
    }
  }, [jobTitle, searchParams]);

  const isReadyToSubmit = Boolean(
    selectedService &&
      jobTitle.trim() &&
      description.trim() &&
      budgetAmount.trim() &&
      date &&
      time
  );

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    if (!jobTitle.trim()) {
      setJobTitle(
        serviceId === "yard-care"
          ? "Need lawn & yard help"
          : "Need a small home fix"
      );
    }
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    setSelectedAddress(place.formatted_address ?? "");
    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();
    setSelectedLat(typeof lat === "number" ? lat : null);
    setSelectedLng(typeof lng === "number" ? lng : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus("idle");

    if (!agreeToTerms) {
      setError("Please accept the terms before posting your request.");
      return;
    }

    if (!isLoaded || !user) {
      setError("Please sign in so nearby providers can message you.");
      return;
    }

    if (!isReadyToSubmit) {
      setError("Add the basics — service type, title, timing, and budget.");
      return;
    }

    const parsedBudgetAmount = Number(budgetAmount);
    if (!Number.isFinite(parsedBudgetAmount) || parsedBudgetAmount <= 0) {
      setError("Enter a valid budget amount in Canadian dollars.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeownerId: user.id,
          homeownerName: user.fullName,
          homeownerEmail: user.primaryEmailAddress?.emailAddress,
          jobTitle,
          services: selectedService ? [selectedService] : [],
          description,
          date,
          time,
          hours,
          people: 1,
          bringEquipment,
          address: selectedAddress,
          latitude: selectedLat,
          longitude: selectedLng,
          budget: {
            type: budgetType,
            amount: parsedBudgetAmount,
            notes: budgetNotes.trim() || null,
          },
          contactPreference,
          photoUrls: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit job request");
      }

      setSubmissionStatus("success");
      setJobTitle("");
      setDescription("");
      setSelectedService(null);
      setSelectedAddress("");
      setSelectedLat(null);
      setSelectedLng(null);
      setDate("");
      setTime("");
      setHours(2);
      setBringEquipment(true);
      setBudgetType("flat");
      setBudgetAmount("");
      setBudgetNotes("");
      setContactPreference("messages");
      setAgreeToTerms(false);
    } catch (submitError) {
      console.error(submitError);
      setError("Something went wrong posting your job. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-theme="light">
      <Navbar />
      <main className="min-h-screen bg-slate-100 py-10">
        <div className="container mx-auto px-4">
          <section className="max-w-3xl mx-auto text-center mb-10">
            <span className="inline-flex items-center gap-2 text-blue-700 font-semibold tracking-wide uppercase text-xs">
              <Sparkles className="w-4 h-4" />
              Built in Canada for local communities
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Post a local job and connect with trusted neighbours fast
            </h1>
            <p className="text-lg text-gray-600 mt-3">
              ZapTasks makes it simple to share what you need, review
              applicants, and release payments securely through Stripe Connect.
              Three steps, one clear post, and you're on your way.
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="grid gap-8 max-w-4xl mx-auto"
          >
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <header className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-600 font-semibold">
                    Step 1
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Choose the type of help you need
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    We focus on high-demand neighbourhood requests to keep
                    things simple.
                  </p>
                </div>
              </header>

              <div className="grid gap-4 md:grid-cols-2">
                {serviceOptions.map((option) => {
                  const isSelected = option.id === selectedService;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleServiceSelect(option.id)}
                      className={`text-left rounded-lg border px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white hover:border-blue-400"
                      }`}
                    >
                      <div className="font-semibold text-base flex items-center justify-between">
                        {option.label}
                        {isSelected && <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <p className="text-sm mt-2 text-gray-600">
                        {option.summary}
                      </p>
                      <ul className="mt-3 text-xs text-gray-500 space-y-1">
                        {option.examples.map((example) => (
                          <li key={example}>• {example}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <header className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-600 font-semibold">
                    Step 2
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Share the job details
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Give neighbours enough context to decide if it's a good fit.
                    Clear jobs get faster replies.
                  </p>
                </div>
              </header>

              <div className="grid gap-4">
                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Job headline
                  </span>
                  <input
                    type="text"
                    value={jobTitle}
                    placeholder={
                      suggestedTitle || "e.g. Lawn mowing for this weekend"
                    }
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="input input-bordered w-full"
                    required
                  />
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Describe what you need
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share the scope, access notes, and anything a local pro should know."
                    className="textarea textarea-bordered h-28"
                    required
                  />
                  <span className="label-text-alt text-xs text-gray-500 mt-1">
                    Tip: mention the property type, parking access, and if
                    you've got equipment ready.
                  </span>
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Approximate location
                  </span>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <div className="pl-9">
                      <AddressAutocomplete
                        onPlaceSelected={handlePlaceSelected}
                        apiKey={
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                        }
                      />
                    </div>
                  </div>
                  <span className="label-text-alt text-xs text-gray-500 mt-1">
                    Street address stays private until you book. Postal code is
                    enough for now.
                  </span>
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <header className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-600 font-semibold">
                    Step 3
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Set timing and budget
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    We collect a 50% deposit through Stripe when you accept a
                    provider. The rest is released once the job is done.
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </header>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Preferred date
                  </span>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input input-bordered pl-9"
                      required
                    />
                  </div>
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Preferred start time
                  </span>
                  <div className="relative">
                    <Clock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <div className="pl-9">
                      <TimeSelector
                        value={time}
                        onChange={(newTime: string) => setTime(newTime)}
                      />
                    </div>
                  </div>
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Estimated hours of work
                  </span>
                  <div className="relative">
                    <Users
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="number"
                      min={1}
                      value={hours}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setHours(
                          Number.isFinite(value) && value >= 1 ? value : 1
                        );
                      }}
                      className="input input-bordered pl-9"
                    />
                  </div>
                  <span className="label-text-alt text-xs text-gray-500 mt-1">
                    Providers use this to plan crew size and availability.
                  </span>
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Budget (CAD)
                  </span>
                  <input
                    type="number"
                    min={25}
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="e.g. 120"
                    className="input input-bordered"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Budget type
                  </span>
                  <select
                    value={budgetType}
                    onChange={(e) =>
                      setBudgetType(e.target.value as "flat" | "hourly")
                    }
                    className="select select-bordered"
                  >
                    <option value="flat">Flat project fee</option>
                    <option value="hourly">Hourly budget</option>
                  </select>
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-gray-800">
                    Contact preference
                  </span>
                  <select
                    value={contactPreference}
                    onChange={(e) =>
                      setContactPreference(
                        e.target.value as "messages" | "phone" | "email"
                      )
                    }
                    className="select select-bordered"
                  >
                    <option value="messages">ZapTasks messages</option>
                    <option value="phone">Phone call</option>
                    <option value="email">Email</option>
                  </select>
                </label>
              </div>

              <label className="form-control mt-4">
                <span className="label-text font-medium text-gray-800">
                  Anything else providers should know?
                </span>
                <textarea
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                  placeholder="Add parking notes, gate codes, or photo links."
                  className="textarea textarea-bordered h-20"
                />
              </label>

              <label className="label cursor-pointer justify-start gap-3 mt-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={bringEquipment}
                  onChange={(e) => setBringEquipment(e.target.checked)}
                />
                <span className="label-text text-sm text-gray-700">
                  Providers should bring their own tools and equipment
                </span>
              </label>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <header className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Review and submit
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Once you submit, nearby providers across Canada can apply
                    right away.
                  </p>
                </div>
              </header>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Selected service</span>
                  <span>
                    {selectedService
                      ? serviceOptions.find(
                          (option) => option.id === selectedService
                        )?.label
                      : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Preferred schedule</span>
                  <span>
                    {date ? format(new Date(date), "MMM d, yyyy") : "TBD"}{" "}
                    {time ? `@ ${time}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Budget</span>
                  <span>
                    {budgetAmount
                      ? `${formatCurrency(Number(budgetAmount))}${
                          budgetType === "hourly" ? "/hr" : " flat"
                        }`
                      : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Deposit model</span>
                  <span>50/50 secure payout through Stripe Connect</span>
                </div>
                {budgetNotes && (
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <span className="font-medium block mb-1">Extra notes</span>
                    <p className="text-sm text-gray-600">{budgetNotes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="h-32 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">
                  {termsAndConditions}
                </div>
                <label className="label cursor-pointer justify-start gap-3 mt-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    required
                  />
                  <span className="label-text text-sm text-gray-700">
                    I agree to the ZapTasks terms and understand the 50/50
                    payment schedule.
                  </span>
                </label>
              </div>

              {error && (
                <div className="alert alert-error mt-4">
                  <span>{error}</span>
                </div>
              )}

              {submissionStatus === "success" && (
                <div className="alert alert-success mt-4">
                  <div>
                    <h3 className="font-semibold">Job posted!</h3>
                    <p className="text-sm">
                      We'll notify nearby providers so they can apply. Review
                      profiles, chat, and hire with confidence.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block mt-6 text-base"
                disabled={!isReadyToSubmit || !agreeToTerms || isLoading}
              >
                {isLoading ? "Posting..." : "Post my job to ZapTasks"}
              </button>
              {!isReadyToSubmit && (
                <p className="text-xs text-error mt-2">
                  Add the essentials above to continue.
                </p>
              )}
            </section>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
