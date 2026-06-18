"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Navbar from "../components/NavBar";
import AddressAutocomplete from "../components/AddressAutocomplete";
import Image from "next/image";
import { createClient as createSupabaseClient } from "@/app/utils/supabase/client";

const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 5;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<Step, string> = {
  1: "Job Details",
  2: "Photos",
  3: "When",
  4: "Where",
  5: "Budget",
  6: "Review & Post",
};

const TITLE_MIN = 5;
const DESC_MIN = 15;

const JobPostingWizard = () => {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>(
    [],
  );
  const [date, setDate] = useState("");
  const [flexible, setFlexible] = useState(false);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [budgetType, setBudgetType] = useState<"set" | "quote">("quote");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetStyle, setBudgetStyle] = useState<"flat" | "hourly">("flat");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = useMemo(() => {
    return format(addDays(new Date(), 1), "yyyy-MM-dd");
  }, []);

  const titleOk = title.trim().length >= TITLE_MIN;
  const descOk = description.trim().length >= DESC_MIN;

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return titleOk && descOk;
      case 2:
        return true;
      case 3:
        return flexible || date.length > 0;
      case 4:
        return true;
      case 5:
        return (
          budgetType === "quote" ||
          (budgetAmount.length > 0 && parseFloat(budgetAmount) > 0)
        );
      case 6:
        return true;
      default:
        return false;
    }
  }, [step, titleOk, descOk, date, flexible, budgetType, budgetAmount]);

  const handlePhotoSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const newPhotos: Array<{ file: File; preview: string }> = [];
    Array.from(fileList)
      .slice(0, remaining)
      .forEach((file) => {
        if (!file.type.startsWith("image/")) {
          setError(`${file.name} is not an image`);
          return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setError(`${file.name} is larger than ${MAX_PHOTO_MB}MB`);
          return;
        }
        newPhotos.push({ file, preview: URL.createObjectURL(file) });
      });

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
      setError(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const handleNext = useCallback(() => {
    if (!canContinue) return;
    if (step < 6) setStep((s) => (s + 1) as Step);
  }, [canContinue, step]);

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Please sign in to post a job");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        const uploads = await Promise.all(
          photos.map(async ({ file }) => {
            const ext = file.name.split(".").pop();
            const filename = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { data, error: uploadError } = await supabase.storage
              .from("job-photos")
              .upload(filename, file, { cacheControl: "3600", upsert: false });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("job-photos")
              .getPublicUrl(data.path);
            return urlData.publicUrl;
          }),
        );
        photoUrls = uploads;
      }

      const inferredTags: string[] = [];
      const text = `${title} ${description}`.toLowerCase();
      if (text.includes("snow") || text.includes("shovel"))
        inferredTags.push("Snow removal");
      if (text.includes("lawn") || text.includes("yard") || text.includes("grass"))
        inferredTags.push("Yard work");
      if (text.includes("clean")) inferredTags.push("Cleaning");
      if (text.includes("paint")) inferredTags.push("Painting");
      if (text.includes("repair") || text.includes("fix"))
        inferredTags.push("Repairs");
      if (inferredTags.length === 0) inferredTags.push("General help");

      const payload = {
        homeowner_id: user.id,
        homeowner_name: user.fullName || user.username || "ZapTasks User",
        homeowner_email: user.primaryEmailAddress?.emailAddress || "",
        job_title: title,
        services: inferredTags,
        description,
        service_date: flexible ? null : date,
        address: address || null,
        latitude: lat,
        longitude: lng,
        budget_type: budgetType === "quote" ? null : budgetStyle,
        budget_amount: budgetType === "quote" ? null : parseFloat(budgetAmount),
        pricing_mode:
          budgetType === "quote" ? "provider_quote" : "client_budget",
        photo_urls: photoUrls,
        status: "open",
      };

      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { error: errMsg } = await response.json();
        throw new Error(errMsg || "Failed to post job");
      }

      router.push("/manage-booking?posted=true");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = (step / 6) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />

      {/* Progress Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Step {step} of 6
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-semibold text-slate-800">
                {STEP_LABELS[step]}
              </span>
            </div>
            <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
              <div key={s} className="w-2 h-2 rounded-full transition-all duration-200"
                style={{
                  background: s < step ? "#2563eb" : s === step ? "#2563eb" : "#e2e8f0",
                  boxShadow: s === step ? "0 0 0 3px #bfdbfe" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 min-h-[500px] flex flex-col">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Step 1: Job Details */}
          {step === 1 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  What do you need help with?
                </h1>
                <p className="text-slate-500">
                  Give helpers enough detail to send you a good offer
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Job title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    placeholder="e.g., Snow shoveling for my driveway"
                    className="w-full px-4 py-3 text-lg border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-slate-400">
                      {title.trim().length < TITLE_MIN
                        ? `${TITLE_MIN - title.trim().length} more characters needed`
                        : ""}
                    </p>
                    <p className={`text-xs ${titleOk ? "text-emerald-600" : "text-slate-400"}`}>
                      {title.trim().length}/{TITLE_MIN}+
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Describe the job
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What needs to be done? Any special requirements, tools needed, or things to know?"
                    className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    rows={5}
                  />
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-slate-400">
                      {description.trim().length < DESC_MIN
                        ? `${DESC_MIN - description.trim().length} more characters needed`
                        : "Looks good!"}
                    </p>
                    <p className={`text-xs ${descOk ? "text-emerald-600" : "text-slate-400"}`}>
                      {description.trim().length}/{DESC_MIN}+
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Add photos
                </h1>
                <p className="text-slate-500">
                  Optional — photos help helpers give accurate quotes
                </p>
              </div>

              <div className="flex-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handlePhotoSelect(e.target.files);
                    e.target.value = "";
                  }}
                />

                {photos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <Camera className="w-12 h-12 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-600 group-hover:text-blue-600">
                        Click to add photos
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Up to {MAX_PHOTOS} photos · {MAX_PHOTO_MB}MB each
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {photos.map((photo, idx) => (
                        <div
                          key={photo.preview}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200"
                        >
                          <Image
                            src={photo.preview}
                            alt={`Photo ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-500 hover:text-blue-600 text-sm font-medium"
                      >
                        + Add more ({photos.length}/{MAX_PHOTOS})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: When */}
          {step === 3 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  When do you need this done?
                </h1>
                <p className="text-slate-500">Pick a date or stay flexible</p>
              </div>

              <div className="space-y-4 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setFlexible((v) => {
                      if (!v) setDate("");
                      return !v;
                    });
                  }}
                  className={`w-full flex items-center gap-4 p-5 border-2 rounded-xl transition-all text-left ${
                    flexible
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    flexible ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  }`}>
                    {flexible && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">I&apos;m flexible</p>
                    <p className="text-sm text-slate-500">Helper can suggest a time that works</p>
                  </div>
                </button>

                {!flexible && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1.5 text-slate-500" />
                      Or pick a specific date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={minDate}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Where */}
          {step === 4 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Where is this job?
                </h1>
                <p className="text-slate-500">
                  Your full address stays private until you hire someone
                </p>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <MapPin className="inline w-4 h-4 mr-1.5 text-slate-500" />
                    Neighbourhood or address{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <AddressAutocomplete
                    onPlaceSelected={(details) => {
                      setAddress(details.formatted_address ?? "");
                      const placeLat = details.geometry?.location?.lat?.();
                      const placeLng = details.geometry?.location?.lng?.();
                      if (
                        typeof placeLat === "number" &&
                        typeof placeLng === "number"
                      ) {
                        setLat(Number(placeLat.toFixed(3)));
                        setLng(Number(placeLng.toFixed(3)));
                      }
                    }}
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                  />
                  {address && (
                    <p className="mt-2 text-sm text-slate-500">
                      Helpers will see: &quot;Near{address.split(",").slice(1).join(",")}&quot;
                    </p>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-800">
                    Adding your neighbourhood helps local helpers find your job faster. You can skip this step.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  What&apos;s your budget?
                </h1>
                <p className="text-slate-500">
                  Set a price or let helpers quote you
                </p>
              </div>

              <div className="space-y-5 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBudgetType("quote")}
                    className={`p-5 border-2 rounded-xl transition-all text-left ${
                      budgetType === "quote"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Sparkles className={`w-7 h-7 mb-2 ${budgetType === "quote" ? "text-blue-600" : "text-slate-400"}`} />
                    <p className="font-semibold text-slate-900">Let them quote</p>
                    <p className="text-xs text-slate-500 mt-0.5">Helpers send you their price</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetType("set")}
                    className={`p-5 border-2 rounded-xl transition-all text-left ${
                      budgetType === "set"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <DollarSign className={`w-7 h-7 mb-2 ${budgetType === "set" ? "text-blue-600" : "text-slate-400"}`} />
                    <p className="font-semibold text-slate-900">Set a budget</p>
                    <p className="text-xs text-slate-500 mt-0.5">You name the price</p>
                  </button>
                </div>

                {budgetType === "set" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Your budget (CAD)
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                        <input
                          type="number"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors text-lg"
                          min="1"
                          step="1"
                        />
                      </div>
                      <select
                        value={budgetStyle}
                        onChange={(e) =>
                          setBudgetStyle(e.target.value as "flat" | "hourly")
                        }
                        className="px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="flat">Flat rate</option>
                        <option value="hourly">Per hour</option>
                      </select>
                    </div>
                    {budgetAmount && parseFloat(budgetAmount) > 0 ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-emerald-900 font-semibold text-sm">
                          ${budgetAmount} {budgetStyle === "hourly" ? "per hour" : "flat rate"}
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Helper receives 90% · 10% platform fee
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600">Enter an amount to continue</p>
                    )}
                  </div>
                )}

                {budgetType === "quote" && (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-slate-700 text-sm">
                      Helpers will see your job and send you their price. You pick the best offer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Post */}
          {step === 6 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Review your job
                </h1>
                <p className="text-slate-500">Here&apos;s what helpers will see</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Title</p>
                    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Description</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{description}</p>
                  </div>

                  {photos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Photos</p>
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((photo, idx) => (
                          <div
                            key={photo.preview}
                            className="aspect-square relative rounded-lg overflow-hidden"
                          >
                            <Image
                              src={photo.preview}
                              alt={`Photo ${idx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {flexible
                        ? "Flexible timing"
                        : date
                        ? format(new Date(date + "T00:00:00"), "MMM d, yyyy")
                        : "No date set"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {address
                        ? `Near ${address.split(",").slice(1, 2).join(",").trim()}`
                        : "Location not set"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {budgetType === "quote"
                        ? "Open to quotes"
                        : `$${budgetAmount} ${budgetStyle === "hourly" ? "/hr" : "flat"}`}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
                  By posting, you agree to ZapTasks Terms of Service. Payment is held securely through Stripe and released only when you confirm the job is complete. Helpers are independent contractors.
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canContinue}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  canContinue
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Post Job
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobPostingWizard;
