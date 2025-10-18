"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import Navbar from "../components/NavBar";
import AddressAutocomplete from "../components/AddressAutocomplete";
import TimeSelector from "../components/TimeSelector";

const tagSuggestions = [
  "Home upkeep",
  "Cleaning",
  "Repairs",
  "Yard work",
  "Moving help",
  "Pet care",
  "Errands",
];

const termsAndConditions = `
ZapTasks Terms & Conditions

• ZapTasks connects homeowners with independent Canadian service providers. We do not guarantee service outcomes.
• Payments are held in Stripe-powered escrow based on job size: under $100 = 100% upfront, $100–$500 = 50% upfront/50% on completion, over $500 = 30% upfront/30% progress/40% on completion.
• ZapTasks collects a 10% platform fee (8% on large trades) to cover Stripe fees, support, and dispute mediation.
• Cancellations inside 24 hours of the scheduled start may forfeit the in-progress payment. Report disputes within 24 hours of completion so our team can help mediate.
• Keep communication in-app and share photo updates through chat when requested. Ensure the work area is safe and accessible.
• Using ZapTasks means you accept these terms and agree to our Privacy Policy and Terms of Service.`;

const formatCurrency = (value: number | null | undefined) => {
  if (!Number.isFinite(value)) return "Not set";
  return value!.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
};

const maskCoordinate = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(3));
};

const BookingPage: React.FC = () => {
  const { isLoaded, user } = useUser();
  const searchParams = useSearchParams();

  const [jobTitle, setJobTitle] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [budgetType, setBudgetType] = useState<"flat" | "hourly">("flat");
  const [contactPreference, setContactPreference] = useState<
    "messages" | "phone" | "email"
  >("messages");
  const [extraNotes, setExtraNotes] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">(
    "idle"
  );
  const addTag = useCallback(
    (tag: string, options?: { allowDuplicate?: boolean }) => {
      const trimmed = tag.trim();
      if (!trimmed) return;

      setServiceTags((prev) => {
        const exists = prev.some(
          (existing) => existing.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists && !options?.allowDuplicate) {
          return prev;
        }
        return [...prev, trimmed];
      });
    },
    []
  );

  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const tomorrow = addDays(new Date(), 1);
    setMinDate(format(tomorrow, "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    const presetTitle = searchParams.get("title");
    const presetService = searchParams.get("service");
    const presetLocation = searchParams.get("location");

    if (presetTitle && !jobTitle) {
      setJobTitle(presetTitle);
    }

    if (presetService) {
      const normalized = presetService.replace(/[-_]/g, " ");
      addTag(normalized, { allowDuplicate: false });
    }

    if (presetLocation) {
      setSelectedAddress(presetLocation);
    }
  }, [addTag, jobTitle, searchParams]);

  useEffect(() => {
    if (!jobTitle && serviceTags.length > 0) {
      const firstTag = serviceTags[0];
      setJobTitle(`Need help with ${firstTag.toLowerCase()}`);
    }
  }, [jobTitle, serviceTags]);

  const removeTag = (tag: string) => {
    setServiceTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleCustomTagSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addTag(customTagInput);
    setCustomTagInput("");
  };

  const isReadyToSubmit = Boolean(
    jobTitle.trim() && description.trim() && serviceTags.length > 0
  );

  const handlePlaceSelected = (details: {
    formatted_address?: string | null;
    geometry?: { location?: { lat: () => number; lng: () => number } };
  }) => {
    setSelectedAddress(details.formatted_address ?? "");
    const lat = details.geometry?.location?.lat?.();
    const lng = details.geometry?.location?.lng?.();
    setSelectedLat(typeof lat === "number" ? maskCoordinate(lat) : null);
    setSelectedLng(typeof lng === "number" ? maskCoordinate(lng) : null);
  };

  const parsedBudget = useMemo(() => {
    if (!budgetAmount.trim()) return null;
    const numeric = Number(budgetAmount);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [budgetAmount]);

  const parsedHours = useMemo(() => {
    if (!estimatedHours.trim()) return null;
    const numeric = Number(estimatedHours);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [estimatedHours]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus("idle");

    if (!agreeToTerms) {
      setError("Please accept the terms before posting your request.");
      return;
    }

    if (!isLoaded || !user) {
      setError("Please sign in so neighbours can reach you.");
      return;
    }

    if (!isReadyToSubmit) {
      setError("Add a headline, description, and at least one tag.");
      return;
    }

    if (budgetAmount.trim() && parsedBudget === null) {
      setError(
        "Enter a valid Canadian dollar amount or leave the budget blank."
      );
      return;
    }

    if (estimatedHours.trim() && parsedHours === null) {
      setError("Estimated hours must be a positive number if provided.");
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
          services: serviceTags,
          description,
          date: date || null,
          time: time || null,
          hours: parsedHours,
          people: 1,
          bringEquipment: true,
          address: selectedAddress || null,
          latitude: selectedLat,
          longitude: selectedLng,
          budget: {
            type: parsedBudget ? budgetType : null,
            amount: parsedBudget,
            notes: extraNotes.trim() || null,
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
      setServiceTags([]);
      setCustomTagInput("");
      setSelectedAddress("");
      setSelectedLat(null);
      setSelectedLng(null);
      setDate("");
      setTime("");
      setEstimatedHours("");
      setBudgetAmount("");
      setBudgetType("flat");
      setContactPreference("messages");
      setExtraNotes("");
      setAgreeToTerms(false);
    } catch (submitError) {
      console.error(submitError);
      setError("Something went wrong posting your job. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const budgetSummary = parsedBudget
    ? `${formatCurrency(parsedBudget)}${
        budgetType === "hourly" ? "/hr" : " flat"
      }`
    : "Not set";

  return (
    <div data-theme="light">
      <Navbar />
      <main className="min-h-screen bg-slate-50 pb-16">
        <section className="bg-gradient-to-br from-blue-100/60 via-white to-blue-50 border-b border-blue-100">
          <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                  Built in Canada • Post in under 2 minutes
                </span>
                <h1 className="mt-4 text-4xl font-bold text-slate-900 leading-tight">
                  Post a job and let trusted neighbours apply
                </h1>
                <p className="mt-4 text-lg text-slate-700">
                  Describe what you need, add a few tags, and share your ideal
                  timing. Providers across Canada can apply, message you, and
                  get paid through our tiered Stripe escrow (100%, 50/50, or
                  milestone-based).
                </p>
                <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                  <div className="flex items-start gap-2 rounded-xl bg-white px-4 py-3 shadow-sm border border-blue-100">
                    <CheckCircle className="mt-1 h-4 w-4 text-emerald-500" />
                    <span>Local helpers reviewed for social authenticity</span>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-white px-4 py-3 shadow-sm border border-blue-100">
                    <PiggyBank className="mt-1 h-4 w-4 text-blue-500" />
                    <span>
                      Industry standard payment processing and escrow to handle
                      disputes
                    </span>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-white px-4 py-3 shadow-sm border border-blue-100">
                    <MessageCircle className="mt-1 h-4 w-4 text-purple-500" />
                    <span>
                      In-app chat keeps every detail in one secure thread
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex flex-col gap-4 text-sm text-blue-900">
                <div className="rounded-2xl border border-blue-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm">
                  <p className="font-semibold uppercase tracking-wide text-xs text-blue-500">
                    How it works
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li>1. Share what you need and when</li>
                    <li>2. Compare applicants and chat safely</li>
                    <li>
                      3. Approve the right pro and release payment after
                      completion
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm">
                  <p className="font-semibold uppercase tracking-wide text-xs text-blue-500">
                    Need inspiration?
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>• Assemble an IKEA wardrobe and remove packaging</li>
                    <li>• Weekly snow removal while we are away</li>
                    <li>• Same-day pet sitter to walk our dog</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 mt-10 max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                    Step 1
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Tell neighbours what you need
                  </h2>
                  <p className="text-sm text-slate-600">
                    Keep it short but clear. Mention the location type, access
                    details, and anything they should prepare for.
                  </p>
                </header>

                <label className="form-control">
                  <span className="label-text font-medium text-slate-800">
                    Job headline
                  </span>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Mount a TV and hide the cords"
                    className="input input-bordered w-full"
                    required
                  />
                </label>

                <label className="form-control">
                  <span className="label-text font-medium text-slate-800">
                    Describe the work
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share what needs to be done, where, and any timing or access notes."
                    className="textarea textarea-bordered h-28"
                    required
                  />
                  <span className="label-text-alt text-xs text-slate-500 mt-1">
                    Tip: mention parking, entry instructions, materials on-site,
                    and your ideal timing.
                  </span>
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                    Step 2
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Add tags and location context
                  </h2>
                  <p className="text-sm text-slate-600">
                    Tags help the right neighbours find your post. Add your own
                    if no suggestion fits.
                  </p>
                </header>

                <div>
                  <span className="label-text font-medium text-slate-800 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {serviceTags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-primary badge-outline flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag}`}
                          className="ml-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tagSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addTag(suggestion)}
                        className="btn btn-xs bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <form
                    onSubmit={handleCustomTagSubmit}
                    className="mt-4 flex gap-2"
                  >
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      placeholder={
                        'Add your own tag (e.g. "Snow removal" or "Kids party")'
                      }
                      className="input input-bordered flex-1"
                    />
                    <button
                      type="submit"
                      className="btn btn-outline"
                      disabled={!customTagInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </form>
                </div>

                <label className="form-control">
                  <span className="label-text font-medium text-slate-800 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Approximate location (optional)
                  </span>
                  <div className="relative">
                    <div className="pl-0">
                      <AddressAutocomplete
                        onPlaceSelected={handlePlaceSelected}
                        apiKey={
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                        }
                      />
                    </div>
                  </div>
                  <span className="label-text-alt text-xs text-slate-500 mt-1">
                    Street address stays private until you book. Postal code or
                    neighbourhood helps locals scope travel.
                  </span>
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                    Step 3
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Timing and budget (optional)
                  </h2>
                  <p className="text-sm text-slate-600">
                    Share your target schedule and budget if you have one.
                    Providers can still send quotes if you are unsure.
                  </p>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label-text font-medium text-slate-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Preferred date
                    </span>
                    <input
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input input-bordered"
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text font-medium text-slate-800 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Preferred start time
                    </span>
                    <div className="pl-0">
                      <TimeSelector
                        value={time}
                        onChange={(newTime: string) => setTime(newTime)}
                      />
                    </div>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label-text font-medium text-slate-800">
                      Estimated hours (optional)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder="e.g. 3"
                      className="input input-bordered"
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text font-medium text-slate-800">
                      Budget (optional)
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="e.g. 150"
                        className="input input-bordered flex-1"
                      />
                      <select
                        value={budgetType}
                        onChange={(e) =>
                          setBudgetType(e.target.value as "flat" | "hourly")
                        }
                        className="select select-bordered"
                        disabled={!budgetAmount.trim()}
                      >
                        <option value="flat">Flat</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </div>
                  </label>
                </div>

                <label className="form-control">
                  <span className="label-text font-medium text-slate-800">
                    Anything else providers should know? (optional)
                  </span>
                  <textarea
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    placeholder="Add parking notes, tool requirements, or milestones."
                    className="textarea textarea-bordered h-20"
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                <header className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Review and share
                  </h2>
                  <p className="text-sm text-slate-600">
                    Confirm how you prefer to be contacted and post your job to
                    the community.
                  </p>
                </header>

                <label className="form-control">
                  <span className="label-text font-medium text-slate-800">
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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Headline</span>
                    <span className="text-right max-w-xs truncate">
                      {jobTitle || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tags</span>
                    <span className="text-right max-w-xs truncate">
                      {serviceTags.length > 0 ? serviceTags.join(", ") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Preferred schedule</span>
                    <span className="text-right max-w-xs">
                      {date
                        ? format(new Date(date), "MMM d, yyyy")
                        : "Flexible"}
                      {time ? ` @ ${time}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estimated hours</span>
                    <span>
                      {parsedHours
                        ? `${parsedHours} hour${parsedHours > 1 ? "s" : ""}`
                        : "Flexible"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Budget</span>
                    <span>{budgetSummary}</span>
                  </div>
                </div>

                <div>
                  <div className="h-32 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
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
                    <span className="label-text text-sm text-slate-700">
                      I understand ZapTasks holds funds in escrow until I
                      approve the work.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}

                {submissionStatus === "success" && (
                  <div className="alert alert-success">
                    <div>
                      <h3 className="font-semibold">Job posted!</h3>
                      <p className="text-sm">
                        We&apos;ll notify nearby providers so they can apply.
                        Review profiles, chat, and hire with confidence.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-block text-base"
                  disabled={!isReadyToSubmit || !agreeToTerms || isLoading}
                >
                  {isLoading ? "Posting..." : "Post my job"}
                </button>
                {!isReadyToSubmit && (
                  <p className="text-xs text-error">
                    Add a headline, description, and at least one tag to
                    continue.
                  </p>
                )}
              </section>
            </form>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-blue-200 bg-white shadow-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Why Canadians trust ZapTasks
                </h3>
                <ul className="space-y-3 text-sm text-blue-900/80">
                  <li>• Tiered escrow keeps deposits clear for both sides.</li>
                  <li>
                    • Ratings and reviews from real homeowners stay front and
                    centre on provider profiles.
                  </li>
                  <li>
                    • Support team monitors payouts, refunds, and disputes.
                  </li>
                </ul>
                <p className="text-xs text-blue-900/70">
                  ZapTasks Inc. is proudly Canadian. Funds are processed in CAD
                  and settle to providers once you mark the job complete.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-3 text-sm text-emerald-900">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" />
                  Tiered escrow payments
                </h4>
                <p>
                  Jobs under $100 are paid in full upfront, $100–$500 split
                  50/50, and larger projects use 30%/30%/40% milestones. Funds
                  sit safely in Stripe escrow until you sign off.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
