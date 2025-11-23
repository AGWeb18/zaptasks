"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

import Link from "next/link";
import Navbar from "../components/NavBar";
import AddressAutocomplete from "../components/AddressAutocomplete";
import TimeSelector from "../components/TimeSelector";
import Image from "next/image";
import { createClient as createSupabaseClient } from "@/app/utils/supabase/client";

const MAX_JOB_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB per photo
const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);
const JOB_PHOTO_BUCKET = "job-photos";

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

• ZapTasks connects homeowners with local helpers (independent contractors). We do not verify, endorse, or guarantee work quality.
• No liability for work, damage, or injury. Engage helpers at your own risk.
• All payments/fees in CAD.
• Stripe escrow: 100% upfront, 10% ZapTasks fee deducted on release.
• Helpers handle tools/licensing/insurance/taxes. Check reviews/chat before booking.
• Cancellations: Full refund pre-start; post-start prorated.
• Accept terms/Privacy Policy/TOS to use.
`;

// Short terms
const shortTerms = `Connects homeowners/helpers. No verification/liability. 10% fee. Community reviews build trust.`;

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
  const [pricingMode, setPricingMode] = useState<
    "client_budget" | "provider_quote"
  >("client_budget");
  const [contactPreference, setContactPreference] = useState<
    "messages" | "phone" | "email"
  >("messages");
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>(
    []
  );
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">(
    "idle"
  );
  const supabase = useMemo(() => createSupabaseClient(), []);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
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

  const handlePhotoSelection = (fileList: FileList | null) => {
    if (!fileList) return;

    const availableSlots = MAX_JOB_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setError(`You can add up to ${MAX_JOB_PHOTOS} photos per job.`);
      return;
    }

    const newPhotos: Array<{ file: File; preview: string }> = [];
    const messages: string[] = [];

    Array.from(fileList)
      .slice(0, availableSlots)
      .forEach((file) => {
        if (!file.type.startsWith("image/")) {
          messages.push(`"${file.name}" is not a supported image type.`);
          return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
          messages.push(
            `"${file.name}" is larger than ${Math.round(
              MAX_PHOTO_MB
            )}MB. Choose a smaller photo.`
          );
          return;
        }

        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview });
      });

    if (messages.length > 0) {
      setError(messages.join(" "));
    } else {
      setError(null);
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
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
    if (pricingMode === "provider_quote") return null;
    if (!budgetAmount.trim()) return null;
    const numeric = Number(budgetAmount);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [budgetAmount, pricingMode]);

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

    if (
      pricingMode === "client_budget" &&
      budgetAmount.trim() &&
      parsedBudget === null
    ) {
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
      let uploadedPhotoUrls: string[] = [];

      if (photos.length > 0) {
        setUploadingPhotos(true);
        const uploadResults = await Promise.all(
          photos.map(async ({ file }) => {
            const extension =
              file.name.split(".").pop()?.toLowerCase() ?? "jpg";
            const safeBaseName = file.name
              .replace(/[^a-zA-Z0-9._-]/g, "-")
              .replace(/-+/g, "-")
              .toLowerCase();
            const uniqueId =
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const objectPath = `${user.id}/${uniqueId}-${safeBaseName}.${extension}`;

            const { error: uploadError } = await supabase.storage
              .from(JOB_PHOTO_BUCKET)
              .upload(objectPath, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            const { data: publicUrlData } = supabase.storage
              .from(JOB_PHOTO_BUCKET)
              .getPublicUrl(objectPath);

            if (!publicUrlData?.publicUrl) {
              throw new Error("Unable to generate an image URL after upload.");
            }

            return publicUrlData.publicUrl;
          })
        );

        uploadedPhotoUrls = uploadResults;
      }

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
          pricingMode,
          budget: {
            type: parsedBudget ? budgetType : null,
            amount: parsedBudget,
            notes: extraNotes.trim() || null,
          },
          contactPreference,
          photoUrls: uploadedPhotoUrls,
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
      setPricingMode("client_budget");
      setContactPreference("messages");
      setExtraNotes("");
      setAgreeToTerms(false);
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
    } catch (submitError) {
      console.error(submitError);
      const fallbackMessage =
        "Something went wrong posting your job. Please try again.";
      setError(
        submitError instanceof Error
          ? submitError.message || fallbackMessage
          : fallbackMessage
      );
    } finally {
      setUploadingPhotos(false);
      setIsLoading(false);
    }
  };

  const budgetSummary =
    pricingMode === "provider_quote"
      ? "Helpers will quote after reviewing your request"
      : parsedBudget
      ? `${formatCurrency(parsedBudget)}${
          budgetType === "hourly" ? "/hr" : " flat"
        }`
      : "Flexible";

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
                  Post a Job, Get Offers from Local Helpers
                </h1>
                <p className="mt-4 text-xl text-slate-700 mb-8">
                  Describe your task. Get neighbour offers. Chat & pay securely.
                </p>
                <div className="grid grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto">
                  <div className="flex flex-col items-center p-4 hover:scale-105 transition">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold">Reviewed Helpers</p>
                    <p className="text-xs text-slate-500">Community ratings</p>
                  </div>
                  <div className="flex flex-col items-center p-4 hover:scale-105 transition">
                    <PiggyBank className="w-12 h-12 text-blue-500 mb-2" />
                    <p className="text-sm font-semibold">Secure Escrow</p>
                    <p className="text-xs text-slate-500">Pay when happy</p>
                  </div>
                  <div className="flex flex-col items-center p-4 hover:scale-105 transition">
                    <MessageCircle className="w-12 h-12 text-purple-500 mb-2" />
                    <p className="text-sm font-semibold">In-App Chat</p>
                    <p className="text-xs text-slate-500">No phone needed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 mt-10 max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="accordion accordion-compact space-y-2">
                <div className="collapse collapse-arrow border border-base-300 rounded-box">
                  <input type="radio" name="booking-steps" defaultChecked />
                  <div className="collapse-title text-xl font-semibold">
                    <span className="badge badge-primary mr-2">1</span> Job
                    Details
                  </div>
                  <div className="collapse-content p-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                      <header className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                          Step 1
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Tell neighbours what you need
                        </h2>
                        <p className="text-sm text-slate-600">
                          Keep it short but clear. Mention the location type,
                          access details, and anything they should prepare for.
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
                          placeholder="What needs to be done?"
                          className="textarea textarea-bordered h-28"
                          required
                        />
                        <span className="label-text-alt text-xs text-slate-500 mt-1">
                          Tip: mention parking, entry instructions, materials
                          on-site, and your ideal timing.
                        </span>
                      </label>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="label-text font-medium text-slate-800">
                              Add helpful photos{" "}
                              <span className="text-slate-500 text-sm">
                                (optional)
                              </span>
                            </span>
                            <p className="text-xs text-slate-500">
                              Clear photos of the work area help helpers respond
                              with accurate offers.
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            {photos.length}/{MAX_JOB_PHOTOS} uploaded
                          </span>
                        </div>

                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handlePhotoSelection(event.target.files);
                            event.target.value = "";
                          }}
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {photos.map((photo, index) => (
                            <div
                              key={photo.preview}
                              className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                            >
                              <Image
                                src={photo.preview}
                                alt={`Selected job photo ${index + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <button
                                type="button"
                                className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/80"
                                onClick={() => handleRemovePhoto(index)}
                                aria-label="Remove photo"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}

                          {photos.length < MAX_JOB_PHOTOS && (
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-500"
                              disabled={isLoading || uploadingPhotos}
                            >
                              <Plus className="h-6 w-6" />
                              <span className="text-xs font-medium">
                                Add photo
                              </span>
                              <span className="text-[10px] text-slate-400">
                                PNG or JPG, up to {Math.round(MAX_PHOTO_MB)}MB
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <div className="collapse collapse-arrow border border-base-300 rounded-box">
                  <input type="radio" name="booking-steps" />
                  <div className="collapse-title text-xl font-semibold">
                    <span className="badge badge-secondary mr-2">2</span>{" "}
                    Location & Timing
                  </div>
                  <div className="collapse-content p-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                      <header className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                          Step 2
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Add tags and location context
                        </h2>
                        <p className="text-sm text-slate-600">
                          Tags help the right neighbours find your post. Add
                          your own if no suggestion fits.
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
                                process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
                                ""
                              }
                            />
                          </div>
                        </div>
                        <span className="label-text-alt text-xs text-slate-500 mt-1">
                          Street address stays private until you book. Postal
                          code or neighbourhood helps locals scope travel.
                        </span>
                      </label>
                    </section>
                  </div>
                </div>
                <div className="collapse collapse-arrow border border-base-300 rounded-box">
                  <input type="radio" name="booking-steps" />
                  <div className="collapse-title text-xl font-semibold">
                    <span className="badge badge-accent mr-2">3</span> Budget &
                    Review
                  </div>
                  <div className="collapse-content p-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                      <header className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                          Step 3
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Set your budget and review details
                        </h2>
                        <p className="text-sm text-slate-600">
                          Provide an estimated budget and timeline, or let
                          helpers suggest. Review your job details before
                          posting.
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
                        <label
                          className={`form-control cursor-pointer rounded-xl border ${
                            pricingMode === "client_budget"
                              ? "border-blue-400 bg-blue-50/80"
                              : "border-slate-200 bg-white"
                          } p-4 transition`}
                          onClick={() => setPricingMode("client_budget")}
                        >
                          <span className="label-text font-semibold text-slate-900 flex items-center gap-2">
                            <PiggyBank className="h-4 w-4" />
                            Share my target budget
                          </span>
                          <span className="label-text-alt text-xs text-slate-600 mt-2">
                            Set a flat or hourly budget to attract helpers in
                            your price range. They can still counter-offer.
                          </span>
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="radio"
                              className="radio radio-primary"
                              checked={pricingMode === "client_budget"}
                              onChange={() => setPricingMode("client_budget")}
                            />
                            <span>I have a budget in mind</span>
                          </div>
                        </label>

                        <label
                          className={`form-control cursor-pointer rounded-xl border ${
                            pricingMode === "provider_quote"
                              ? "border-emerald-400 bg-emerald-50/80"
                              : "border-slate-200 bg-white"
                          } p-4 transition`}
                          onClick={() => setPricingMode("provider_quote")}
                        >
                          <span className="label-text font-semibold text-slate-900 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Ask helpers for quotes
                          </span>
                          <span className="label-text-alt text-xs text-slate-600 mt-2">
                            Skip setting a price. Helpers will recommend a fair
                            rate based on their expertise and materials.
                          </span>
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="radio"
                              className="radio radio-primary"
                              checked={pricingMode === "provider_quote"}
                              onChange={() => setPricingMode("provider_quote")}
                            />
                            <span>I’ll review quotes</span>
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

                        <label
                          className={`form-control ${
                            pricingMode === "provider_quote"
                              ? "opacity-50 pointer-events-none"
                              : ""
                          }`}
                        >
                          <span className="label-text font-medium text-slate-800">
                            Budget (optional)
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              value={budgetAmount}
                              onChange={(e) => setBudgetAmount(e.target.value)}
                              placeholder={
                                pricingMode === "provider_quote"
                                  ? "Helpers will quote"
                                  : "e.g. 150"
                              }
                              className="input input-bordered flex-1"
                              disabled={pricingMode === "provider_quote"}
                            />
                            <select
                              value={budgetType}
                              onChange={(e) =>
                                setBudgetType(
                                  e.target.value as "flat" | "hourly"
                                )
                              }
                              className="select select-bordered"
                              disabled={
                                pricingMode === "provider_quote" ||
                                !budgetAmount.trim()
                              }
                            >
                              <option value="flat">Flat</option>
                              <option value="hourly">Hourly</option>
                            </select>
                          </div>
                        </label>
                      </div>

                      <label className="form-control">
                        <span className="label-text font-medium text-slate-800">
                          Anything else helpers should know? (optional)
                        </span>
                        <textarea
                          value={extraNotes}
                          onChange={(e) => setExtraNotes(e.target.value)}
                          placeholder="Add parking notes, tool requirements, or milestones."
                          className="textarea textarea-bordered h-20"
                        />
                      </label>

                      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>Headline</div>
                          <div className="font-medium text-slate-900">
                            {jobTitle || "—"}
                          </div>
                          <div>Tags</div>
                          <div className="font-medium text-slate-900">
                            {serviceTags.length > 0
                              ? serviceTags.join(", ")
                              : "—"}
                          </div>
                          <div>Preferred date</div>
                          <div className="font-medium text-slate-900">
                            {date
                              ? format(new Date(date), "MMM d, yyyy")
                              : "Flexible"}
                          </div>
                          <div>Preferred time</div>
                          <div className="font-medium text-slate-900">
                            {time || "Flexible"}
                          </div>
                          <div>Estimated hours</div>
                          <div className="font-medium text-slate-900">
                            {parsedHours
                              ? `${parsedHours} hour${
                                  parsedHours > 1 ? "s" : ""
                                }`
                              : "Flexible"}
                          </div>
                          <div>Pricing preference</div>
                          <div className="font-medium text-slate-900">
                            {pricingMode === "provider_quote"
                              ? "Ask helpers for quotes"
                              : "Share my target budget"}
                          </div>
                          <div>Budget</div>
                          <div className="font-medium text-slate-900">
                            {budgetSummary}
                          </div>
                        </div>
                      </section>

                      <div>
                        <div className="h-20 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                          {shortTerms}
                        </div>
                        <Link href="/legal" className="text-blue-500 text-xs">
                          Full terms
                        </Link>
                      </div>

                      <div>
                        <label className="label cursor-pointer justify-start gap-3 mt-3">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            required
                          />
                          <span className="label-text text-sm text-slate-700">
                            I understand ZapTasks secures funds upfront and
                            releases them when I approve the work.
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
                              We&apos;ll notify nearby helpers so they can
                              apply. Review profiles, chat, and hire with
                              confidence.
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary btn-block text-base"
                        disabled={
                          !isReadyToSubmit || !agreeToTerms || isLoading
                        }
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
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
