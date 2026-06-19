"use client";

import React, { useState, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  ArrowRight,
  ArrowLeft,
  Check,
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

const JobPostingWizard = () => {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form state
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
  const [budgetType, setBudgetType] = useState<"set" | "quote">("set");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetStyle, setBudgetStyle] = useState<"flat" | "hourly">("flat");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = useMemo(() => {
    return format(addDays(new Date(), 1), "yyyy-MM-dd");
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return title.trim().length > 5 && description.trim().length > 20;
      case 2:
        return true; // Photos optional
      case 3:
        return flexible || date.length > 0;
      case 4:
        return true; // Address optional
      case 5:
        return (
          budgetType === "quote" ||
          (budgetAmount && parseFloat(budgetAmount) > 0)
        );
      case 6:
        return true;
      default:
        return false;
    }
  }, [step, title, description, date, flexible, budgetType, budgetAmount]);

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

  const handleNext = () => {
    if (!canContinue) return;
    if (step < 6) setStep((s) => (s + 1) as Step);
  };

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
      // Upload photos
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

      // Determine service tags from title/description
      const inferredTags: string[] = [];
      const text = `${title} ${description}`.toLowerCase();
      if (text.includes("snow") || text.includes("shovel"))
        inferredTags.push("Snow removal");
      if (
        text.includes("lawn") ||
        text.includes("yard") ||
        text.includes("grass")
      )
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

      // Success! Redirect to success page
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
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Step {step} of 6
            </span>
            <span className="text-sm text-slate-500">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 min-h-[500px] flex flex-col">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: What & Why */}
          {step === 1 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  What do you need help with?
                </h1>
                <p className="text-lg text-slate-600">
                  Give your job a clear title
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Snow shoveling for my driveway"
                    className="input input-lg input-bordered w-full text-xl"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-lg font-medium text-slate-700 mb-2">
                    Tell helpers more
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What needs to be done? Any special requirements?"
                    className="textarea textarea-bordered w-full h-40 text-lg"
                    rows={5}
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    {description.length < 20
                      ? `At least ${20 - description.length} more characters`
                      : `${description.length} characters`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  Show us with photos
                </h1>
                <p className="text-lg text-slate-600">
                  Photos help helpers give accurate quotes (optional)
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
                    className="w-full h-80 border-4 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-4 group"
                  >
                    <Camera className="w-16 h-16 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <div className="text-center">
                      <p className="text-xl font-semibold text-slate-700 group-hover:text-blue-600">
                        Click to add photos
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Up to {MAX_PHOTOS} photos, {MAX_PHOTO_MB}MB each
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
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600 font-medium"
                      >
                        + Add more photos ({photos.length}/{MAX_PHOTOS})
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
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  When do you need this done?
                </h1>
                <p className="text-lg text-slate-600">
                  Pick a date or mark as flexible
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={flexible}
                    onChange={(e) => {
                      setFlexible(e.target.checked);
                      if (e.target.checked) setDate("");
                    }}
                    className="checkbox checkbox-lg checkbox-primary"
                  />
                  <div>
                    <p className="font-semibold text-lg">I&apos;m flexible</p>
                    <p className="text-sm text-slate-600">
                      Helper can suggest times
                    </p>
                  </div>
                </div>

                {!flexible && (
                  <div>
                    <label className="block text-lg font-medium text-slate-700 mb-3">
                      <Calendar className="inline w-5 h-5 mr-2" />
                      Select a date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={minDate}
                      className="input input-lg input-bordered w-full"
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
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  Where is this job?
                </h1>
                <p className="text-lg text-slate-600">
                  Your exact address stays private until you hire someone
                </p>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-lg font-medium text-slate-700 mb-3">
                    <MapPin className="inline w-5 h-5 mr-2" />
                    Enter your address (optional)
                  </label>
                  <AddressAutocomplete
                    onPlaceSelected={(details) => {
                      setAddress(details.formatted_address ?? "");
                      const lat = details.geometry?.location?.lat?.();
                      const lng = details.geometry?.location?.lng?.();
                      if (typeof lat === "number" && typeof lng === "number") {
                        setLat(Number(lat.toFixed(3)));
                        setLng(Number(lng.toFixed(3)));
                      }
                    }}
                  />
                  {address && (
                    <p className="mt-3 text-sm text-slate-600">
                      Helpers will see: &quot;Near{" "}
                      {address.split(",").slice(1).join(",")}&quot;
                    </p>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-900">
                    💡 Adding your neighborhood helps local helpers find your
                    job faster
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  What&apos;s your budget?
                </h1>
                <p className="text-lg text-slate-600">
                  Set a price or let helpers quote
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBudgetType("set")}
                    className={`p-6 border-2 rounded-xl transition-all ${
                      budgetType === "set"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <DollarSign className="w-8 h-8 mb-2 mx-auto" />
                    <p className="font-semibold">Set a Budget</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetType("quote")}
                    className={`p-6 border-2 rounded-xl transition-all ${
                      budgetType === "quote"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Sparkles className="w-8 h-8 mb-2 mx-auto" />
                    <p className="font-semibold">Let Helpers Quote</p>
                  </button>
                </div>

                {budgetType === "set" && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="100"
                          className="input input-lg input-bordered w-full"
                          min="1"
                          step="1"
                        />
                      </div>
                      <select
                        value={budgetStyle}
                        onChange={(e) =>
                          setBudgetStyle(e.target.value as "flat" | "hourly")
                        }
                        className="select select-lg select-bordered"
                      >
                        <option value="flat">Flat Rate</option>
                        <option value="hourly">Per Hour</option>
                      </select>
                    </div>
                    {budgetAmount && parseFloat(budgetAmount) > 0 && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-emerald-900 font-semibold">
                          Total: ${budgetAmount}{" "}
                          {budgetStyle === "hourly" ? "per hour" : ""}
                        </p>
                        <p className="text-sm text-emerald-700 mt-1">
                          + 10% platform fee paid on completion
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {budgetType === "quote" && (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <p className="text-slate-700">
                      Helpers will see your job and send you their price quotes
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Post */}
          {step === 6 && (
            <div className="flex-1 flex flex-col">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  Review your job
                </h1>
                <p className="text-lg text-slate-600">
                  Here&apos;2s what helpers will see
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {title}
                  </h2>
                  <p className="text-slate-700 mb-4">{description}</p>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
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
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {flexible
                        ? "Flexible timing"
                        : format(new Date(date), "MMM d, yyyy")}
                    </div>
                    {address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Near {address.split(",").slice(1).join(",")}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {budgetType === "quote"
                        ? "Helpers will quote"
                        : `$${budgetAmount} ${budgetStyle === "hourly" ? "/hr" : ""}`}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
                  By posting, you agree to ZapTasks Terms. Payment is secure
                  through Stripe. Helpers are independent contractors—review
                  their profiles before hiring.
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="btn btn-ghost gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canContinue}
                className="btn btn-primary text-white gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary btn-lg text-white gap-2"
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
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
