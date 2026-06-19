"use client";

import React, { useState, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import {
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
const TITLE_MIN = 5;
const DESC_MIN = 15;

const JobPostingPage = () => {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>([]);
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

  const minDate = useMemo(() => format(addDays(new Date(), 1), "yyyy-MM-dd"), []);

  const titleOk = title.trim().length >= TITLE_MIN;
  const descOk = description.trim().length >= DESC_MIN;
  const budgetOk =
    budgetType === "quote" || (budgetAmount.length > 0 && parseFloat(budgetAmount) > 0);

  const canPost = titleOk && descOk && budgetOk;

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
          setError(`${file.name} exceeds ${MAX_PHOTO_MB}MB`);
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

  const handleSubmit = async () => {
    if (!user) {
      setError("Please sign in to post a job");
      return;
    }
    if (!canPost) return;

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

      const text = `${title} ${description}`.toLowerCase();
      const inferredTags: string[] = [];
      if (text.includes("snow") || text.includes("shovel")) inferredTags.push("Snow removal");
      if (text.includes("lawn") || text.includes("yard") || text.includes("grass")) inferredTags.push("Yard work");
      if (text.includes("clean")) inferredTags.push("Cleaning");
      if (text.includes("paint")) inferredTags.push("Painting");
      if (text.includes("repair") || text.includes("fix")) inferredTags.push("Repairs");
      if (inferredTags.length === 0) inferredTags.push("General help");

      const payload = {
        homeownerId: user.id,
        homeownerName: user.fullName || user.username || "ZapTasks User",
        homeownerEmail: user.primaryEmailAddress?.emailAddress || "",
        jobTitle: title,
        services: inferredTags,
        description,
        date: flexible ? null : date || null,
        address: address || null,
        latitude: lat,
        longitude: lng,
        budget: {
          type: budgetType === "quote" ? null : budgetStyle,
          amount: budgetType === "quote" ? null : parseFloat(budgetAmount),
        },
        pricingMode: budgetType === "quote" ? "provider_quote" : "client_budget",
        photoUrls,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Post a job</h1>
          <p className="text-slate-500 mt-1">
            Tell helpers what you need and they&apos;ll send you offers
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <div className="space-y-5">

          {/* Job Details */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Job details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Snow shoveling for my driveway"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoFocus
                />
                {title.length > 0 && !titleOk && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    {TITLE_MIN - title.trim().length} more characters needed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What needs doing? Include any special requirements, tools needed, or important details."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  rows={4}
                />
                {description.length > 0 && !descOk && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    {DESC_MIN - description.trim().length} more characters needed
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Photos</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Optional
              </span>
            </div>

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
                className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <Camera className="w-7 h-7 text-slate-300 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm text-slate-500 group-hover:text-blue-600 font-medium">
                  Click to add photos
                </span>
                <span className="text-xs text-slate-400">
                  Up to {MAX_PHOTOS} · {MAX_PHOTO_MB}MB each
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.preview}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
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
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center text-slate-300 hover:text-blue-400 text-2xl leading-none"
                  >
                    +
                  </button>
                )}
              </div>
            )}
          </section>

          {/* When */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">When</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Optional
              </span>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setFlexible((v) => {
                    if (!v) setDate("");
                    return !v;
                  });
                }}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-all text-left ${
                  flexible
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    flexible ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  }`}
                >
                  {flexible && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">I&apos;m flexible</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Helpers can suggest a time that works
                  </p>
                </div>
              </button>

              {!flexible && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Calendar className="inline w-4 h-4 mr-1 text-slate-400" />
                    Or pick a date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={minDate}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Where */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Where</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Optional
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <MapPin className="inline w-4 h-4 mr-1 text-slate-400" />
                Neighbourhood or address
              </label>
              <AddressAutocomplete
                onPlaceSelected={(details) => {
                  setAddress(details.formatted_address ?? "");
                  const placeLat = details.geometry?.location?.lat?.();
                  const placeLng = details.geometry?.location?.lng?.();
                  if (typeof placeLat === "number" && typeof placeLng === "number") {
                    setLat(Number(placeLat.toFixed(3)));
                    setLng(Number(placeLng.toFixed(3)));
                  }
                }}
              />
              {address && (
                <p className="text-xs text-slate-500 mt-2">
                  Helpers see your general area — not your full address
                </p>
              )}
            </div>
          </section>

          {/* Budget */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Budget</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setBudgetType("quote")}
                className={`p-4 border-2 rounded-xl transition-all text-left ${
                  budgetType === "quote"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Sparkles
                  className={`w-5 h-5 mb-2 ${budgetType === "quote" ? "text-blue-600" : "text-slate-400"}`}
                />
                <p className="font-medium text-slate-900 text-sm">Let them quote</p>
                <p className="text-xs text-slate-500 mt-0.5">Helpers send you their price</p>
              </button>

              <button
                type="button"
                onClick={() => setBudgetType("set")}
                className={`p-4 border-2 rounded-xl transition-all text-left ${
                  budgetType === "set"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <DollarSign
                  className={`w-5 h-5 mb-2 ${budgetType === "set" ? "text-blue-600" : "text-slate-400"}`}
                />
                <p className="font-medium text-slate-900 text-sm">Set a budget</p>
                <p className="text-xs text-slate-500 mt-0.5">You name the price</p>
              </button>
            </div>

            {budgetType === "set" && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-7 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      min="1"
                    />
                  </div>
                  <select
                    value={budgetStyle}
                    onChange={(e) => setBudgetStyle(e.target.value as "flat" | "hourly")}
                    className="px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  >
                    <option value="flat">Flat rate</option>
                    <option value="hourly">Per hour</option>
                  </select>
                </div>
                {budgetAmount && parseFloat(budgetAmount) > 0 && (
                  <p className="text-xs text-slate-500">
                    Helper receives $
                    {(parseFloat(budgetAmount) * 0.9).toFixed(2)} after 10% platform fee
                  </p>
                )}
              </div>
            )}

            {budgetType === "quote" && (
              <p className="text-sm text-slate-500">
                Helpers will send you their price — you pick the best offer.
              </p>
            )}
          </section>

          {/* Submit */}
          <div className="space-y-3 pb-10">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canPost || submitting}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
                canPost && !submitting
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Posting...
                </span>
              ) : (
                "Post Job"
              )}
            </button>

            {!canPost && (title.length > 0 || description.length > 0) && (
              <p className="text-center text-xs text-slate-400">
                {[
                  !titleOk && "Add a title",
                  !descOk && "Add more detail to the description",
                  !budgetOk && "Enter a budget amount",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            <p className="text-center text-xs text-slate-400 px-4">
              By posting you agree to ZapTasks Terms of Service. Helpers are independent
              contractors.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobPostingPage;
