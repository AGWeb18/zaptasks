"use client";

import React, { useState, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { MapPin, Camera, X, CheckCircle2 } from "lucide-react";
import Navbar from "../components/NavBar";
import AddressAutocomplete from "../components/AddressAutocomplete";
import Image from "next/image";
import { createClient as createSupabaseClient } from "@/app/utils/supabase/client";

const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 5;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
const TITLE_MIN = 5;
const DESC_MIN = 15;
const DESC_GOOD = 60;

interface Category {
  id: string;
  emoji: string;
  label: string;
  placeholder: string;
  examples: string[];
  serviceIds: string[];
}

const CATEGORIES: Category[] = [
  {
    id: "yard",
    emoji: "🌿",
    label: "Yard & outdoor",
    placeholder: "e.g., Mow the lawn at my house",
    examples: ["Mow my front and back lawn", "Rake and bag the leaves", "Clean out my gutters"],
    serviceIds: ["yard-care"],
  },
  {
    id: "fixes",
    emoji: "🔧",
    label: "Home fixes",
    placeholder: "e.g., Mount a TV on the wall",
    examples: ["Mount a TV on the wall", "Assemble flat-pack furniture", "Fix a leaky faucet"],
    serviceIds: ["home-fixes"],
  },
  {
    id: "cleaning",
    emoji: "🧽",
    label: "Cleaning",
    placeholder: "e.g., Deep clean my kitchen",
    examples: ["Deep clean kitchen and bathrooms", "Move-out clean, 2-bedroom condo"],
    serviceIds: ["cleaning"],
  },
  {
    id: "grocery",
    emoji: "🛒",
    label: "Grocery run",
    placeholder: "e.g., Weekly grocery pickup",
    examples: ["Weekly grocery run for my mom", "Pharmacy and grocery pickup"],
    serviceIds: ["grocery-runs"],
  },
  {
    id: "snow",
    emoji: "❄️",
    label: "Snow removal",
    placeholder: "e.g., Shovel my driveway",
    examples: ["Shovel my driveway and walkway", "Clear snow off two cars and steps"],
    serviceIds: ["snow-removal"],
  },
  {
    id: "other",
    emoji: "⚡",
    label: "Something else",
    placeholder: "e.g., Help me move a couch upstairs",
    examples: [],
    serviceIds: ["general"],
  },
];

interface DescriptionPrompt {
  id: string;
  text: string;
  starter: string;
}

const DESCRIPTION_PROMPTS: DescriptionPrompt[] = [
  { id: "what", text: "What exactly needs doing?", starter: "What needs doing: " },
  { id: "where", text: "Where on the property?", starter: "Where: " },
  { id: "tools", text: "Tools or supplies you have?", starter: "Tools/supplies I have: " },
  { id: "access", text: "Parking or access details?", starter: "Parking/access: " },
];

type WhenMode = "asap" | "date" | "flexible";

const WHEN_OPTIONS: { id: WhenMode; label: string; sub: string }[] = [
  { id: "asap", label: "As soon as possible", sub: "Within a few days" },
  { id: "date", label: "Pick a date", sub: "Choose a day" },
  { id: "flexible", label: "I’m flexible", sub: "Helpers suggest times" },
];

const initialFormState = {
  category: null as string | null,
  title: "",
  description: "",
  whenMode: "flexible" as WhenMode,
  date: "",
  address: "",
  lat: null as number | null,
  lng: null as number | null,
  budgetType: "quote" as "set" | "quote",
  budgetAmount: "",
  budgetStyle: "flat" as "flat" | "hourly",
};

const JobPostingPage = () => {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(initialFormState);
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { category, title, description, whenMode, date, address, budgetType, budgetAmount, budgetStyle } = form;
  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? null;

  const minDate = useMemo(() => format(addDays(new Date(), 1), "yyyy-MM-dd"), []);

  const titleOk = title.trim().length >= TITLE_MIN;
  const descLen = description.trim().length;
  const descOk = descLen >= DESC_MIN;
  const budgetAmountNumber = parseFloat(budgetAmount);
  const budgetOk =
    budgetType === "quote" || (budgetAmount.length > 0 && budgetAmountNumber > 0);
  const canPost = titleOk && descOk && budgetOk;

  const descBarWidth = Math.min(100, Math.round((descLen / DESC_GOOD) * 100));
  const descBarColor = descLen >= DESC_GOOD ? "bg-emerald-500" : descOk ? "bg-blue-400" : "bg-slate-300";
  const descHint =
    descLen === 0
      ? "A sentence or two is enough"
      : descLen < DESC_MIN
      ? "Keep going…"
      : descLen < DESC_GOOD
      ? "Good — more detail gets better offers"
      : "Great detail!";
  const descHintColor = descLen >= DESC_GOOD ? "text-emerald-600" : "text-slate-400";

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

  const addDescriptionPrompt = (prompt: DescriptionPrompt) => {
    if (description.includes(prompt.starter)) return;
    setForm((prev) => ({
      ...prev,
      description:
        (prev.description.trim() ? prev.description.replace(/\s*$/, "") + "\n" : "") + prompt.starter,
    }));
  };

  const resetForm = () => {
    setForm(initialFormState);
    photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setError(null);
    setPosted(false);
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

      const services = activeCategory ? activeCategory.serviceIds : ["general"];

      const payload = {
        homeownerId: user.id,
        homeownerName: user.fullName || user.username || "ZapTasks User",
        homeownerEmail: user.primaryEmailAddress?.emailAddress || "",
        jobTitle: title,
        services,
        description,
        date: whenMode === "date" ? date || null : null,
        address: address || null,
        latitude: form.lat,
        longitude: form.lng,
        budget: {
          type: budgetType === "quote" ? null : budgetStyle,
          amount: budgetType === "quote" ? null : budgetAmountNumber,
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

      setSubmitting(false);
      setPosted(true);
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

  if (posted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-[560px] mx-auto px-4 py-16">
          <div className="bg-white border border-slate-200 rounded-2xl px-8 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold m-0 mb-2 text-slate-900">Your job is live!</h1>
            <p className="text-slate-500 text-[15px] m-0 mb-7">
              Helpers near you can see it now. Here&apos;s what happens next:
            </p>
            <ol className="list-none m-0 mb-7 p-0 flex flex-col gap-3.5 text-left">
              {[
                { title: "Helpers apply", body: "you’ll get a notification for each offer, usually within a few hours." },
                { title: "Chat and choose", body: "ask questions and pick the person you like best." },
                { title: "Pay securely", body: "money is held safely and released when the job is done." },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="m-0 text-sm text-slate-700">
                    <strong>{step.title}</strong> — {step.body}
                  </p>
                </li>
              ))}
            </ol>
            <div className="flex gap-2.5 justify-center flex-wrap">
              <button
                onClick={() => router.push("/manage-booking?posted=true")}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl text-sm font-semibold cursor-pointer"
              >
                View my job
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-3 bg-white hover:border-slate-300 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Post another job
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-[640px] mx-auto px-4 pt-8 pb-32">
        <div className="mb-6">
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 m-0">
            What do you need done?
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            Answer a couple of questions — it takes about a minute. Helpers reply with offers,
            and you only pay when the job is done.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Category */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 m-0 mb-1">Pick the closest match</h2>
            <p className="text-[13px] text-slate-500 m-0 mb-3.5">
              This helps the right helpers find your job. Not sure? Choose &ldquo;Something else&rdquo;.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: active ? null : c.id }))}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium border-[1.5px] cursor-pointer min-h-11 transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                    }`}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Title */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900 m-0">Give it a short title</h2>
              {titleOk && <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />}
            </div>
            <p className="text-[13px] text-slate-500 m-0 mb-3">Say it like you&apos;d tell a neighbour.</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={activeCategory ? activeCategory.placeholder : "e.g., Mow the lawn at my house"}
              className="w-full box-border px-4 py-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autoFocus
            />
            {activeCategory && activeCategory.examples.length > 0 && !titleOk && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                <span className="text-xs text-slate-400">Try one:</span>
                {activeCategory.examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, title: example }))}
                    className="px-3 py-1.5 rounded-full text-[13px] border border-dashed border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Description */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900 m-0">Describe the job</h2>
              {descOk && <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />}
            </div>
            <p className="text-[13px] text-slate-500 m-0 mb-3">
              More detail means better offers. Tap a question below to answer it in your description.
            </p>
            <textarea
              value={description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Tell helpers what to expect. Plain words are perfect — no need for technical terms."
              rows={5}
              className="w-full box-border px-4 py-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-base leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {DESCRIPTION_PROMPTS.map((prompt) => {
                const used = description.includes(prompt.starter);
                return (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => addDescriptionPrompt(prompt)}
                    disabled={used}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] border font-medium ${
                      used
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                        : "border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-blue-300"
                    }`}
                  >
                    <span className="font-bold">{used ? "✓" : "+"}</span>
                    {prompt.text}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${descBarColor}`}
                  style={{ width: `${descBarWidth}%` }}
                />
              </div>
              <span className={`text-xs whitespace-nowrap ${descHintColor}`}>{descHint}</span>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 m-0">
                Add photos <span className="font-normal text-slate-400">(optional)</span>
              </h2>
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

            <div className="grid grid-cols-4 gap-2.5">
              {photos.map((photo, idx) => (
                <div
                  key={photo.preview}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                >
                  <Image src={photo.preview} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col gap-1 items-center justify-center text-slate-300 hover:text-blue-500 cursor-pointer"
                >
                  <Camera className="w-[22px] h-[22px]" />
                  <span className="text-[11px] font-medium">Add</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2.5 mb-0">
              A quick phone photo helps helpers quote accurately — no need for anything fancy.
            </p>
          </section>

          {/* When */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 m-0 mb-3">When should it happen?</h2>
            <div className="flex gap-2 flex-wrap">
              {WHEN_OPTIONS.map((option) => {
                const active = whenMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, whenMode: option.id }))}
                    className={`flex-1 min-w-[140px] p-3 rounded-xl border-[1.5px] text-center cursor-pointer min-h-11 ${
                      active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <p className={`text-sm font-semibold m-0 ${active ? "text-blue-600" : "text-slate-900"}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-0">{option.sub}</p>
                  </button>
                );
              })}
            </div>
            {whenMode === "date" && (
              <input
                type="date"
                value={date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                min={minDate}
                className="mt-3 w-full box-border px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            )}
          </section>

          {/* Where */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 m-0 mb-1">
              Where is it? <span className="font-normal text-slate-400">(optional)</span>
            </h2>
            <p className="text-[13px] text-slate-500 m-0 mb-3">
              Just your neighbourhood is enough — your exact address stays private until you hire someone.
            </p>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <div className="pl-8">
                <AddressAutocomplete
                  onPlaceSelected={(details) => {
                    const placeLat = details.geometry?.location?.lat?.();
                    const placeLng = details.geometry?.location?.lng?.();
                    setForm((prev) => ({
                      ...prev,
                      address: details.formatted_address ?? "",
                      lat: typeof placeLat === "number" ? Number(placeLat.toFixed(3)) : prev.lat,
                      lng: typeof placeLng === "number" ? Number(placeLng.toFixed(3)) : prev.lng,
                    }));
                  }}
                />
              </div>
            </div>
            {address && (
              <p className="text-xs text-slate-500 mt-2 mb-0">
                Helpers see your general area — not your full address
              </p>
            )}
          </section>

          {/* Price */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 m-0 mb-3">How do you want to handle price?</h2>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, budgetType: "quote" }))}
                className={`flex items-start gap-3 p-4 rounded-xl border-[1.5px] text-left cursor-pointer ${
                  budgetType === "quote" ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-px ${
                    budgetType === "quote" ? "border-blue-600" : "border-slate-300"
                  }`}
                >
                  {budgetType === "quote" && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm m-0">Get offers from helpers</p>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-1 mb-0">
                    Helpers send their price — you compare and choose. Easiest if you&apos;re not sure what it should cost.
                  </p>
                </div>
              </button>
              <div
                className={`rounded-xl border-[1.5px] ${
                  budgetType === "set" ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, budgetType: "set" }))}
                  className="w-full flex items-start gap-3 p-4 text-left cursor-pointer bg-transparent border-none"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-px ${
                      budgetType === "set" ? "border-blue-600" : "border-slate-300"
                    }`}
                  >
                    {budgetType === "set" && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm m-0">I&apos;ll set my own price</p>
                    <p className="text-[13px] text-slate-500 mt-1 mb-0">Name what you&apos;ll pay, flat or per hour.</p>
                  </div>
                </button>
                {budgetType === "set" && (
                  <div className="px-4 pb-4 pl-[52px]">
                    <div className="flex gap-2.5 flex-wrap">
                      <div className="relative flex-1 min-w-[120px]">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          value={budgetAmount}
                          onChange={(e) => setForm((prev) => ({ ...prev, budgetAmount: e.target.value }))}
                          placeholder="0"
                          min="1"
                          className="w-full box-border pl-7 pr-3.5 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                      <select
                        value={budgetStyle}
                        onChange={(e) => setForm((prev) => ({ ...prev, budgetStyle: e.target.value as "flat" | "hourly" }))}
                        className="px-3.5 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      >
                        <option value="flat">Total for the job</option>
                        <option value="hourly">Per hour</option>
                      </select>
                    </div>
                    {budgetAmount && budgetAmountNumber > 0 && (
                      <p className="text-xs text-slate-500 mt-2 mb-0">
                        Your helper receives ${(budgetAmountNumber * 0.9).toFixed(2)} — ZapTasks keeps a 10% fee, paid
                        only when the job is done.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-slate-400 px-4">
            By posting you agree to ZapTasks Terms of Service. Helpers are independent contractors.
          </p>
        </div>
      </main>

      {/* Sticky post bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3">
              {[
                { label: "Title", done: titleOk },
                { label: "Details", done: descOk },
                { label: "Price", done: budgetOk },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`flex items-center gap-1 text-xs font-medium ${
                    item.done ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.done ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    {item.done && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    )}
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">Free to post · No card needed yet</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || submitting}
            className={`px-7 py-3.5 rounded-xl font-semibold text-[15px] whitespace-nowrap min-h-12 ${
              canPost && !submitting
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Posting…" : "Post my job"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobPostingPage;
