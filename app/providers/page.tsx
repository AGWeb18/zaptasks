"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../utils/supabase/client";
import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";
import { Clock, MapPin, ShieldCheck, Star } from "lucide-react";

const SERVICE_LABELS: Record<string, string> = {
  "Snow & Lawn Care": "Outdoor & Seasonal",
  "Handyman & Repairs": "Home Repairs",
  "Home Cleaning": "Cleaning & Turnover",
  "Painting & Finishing": "Interior Touch-Ups",
  "Home Repairs": "Home Repairs",
  "Cleaning & Turnover": "Cleaning & Turnover",
  "Outdoor & Seasonal": "Outdoor & Seasonal",
};

const SERVICE_FILTERS = [
  { value: "", label: "All fall & winter services" },
  { value: "Home Repairs", label: "Home Repairs" },
  { value: "Cleaning & Turnover", label: "Cleaning & Turnover" },
  { value: "Outdoor & Seasonal", label: "Outdoor & Seasonal" },
];

type PricingInfo = {
  currency?: string;
  pricingType?: "hourly" | "flat";
  hourlyRate?: number | null;
  flatFee?: number | null;
  minimumHours?: number | null;
  display?: string;
};

type Pro = {
  id?: string;
  name: string;
  email?: string;
  service: string;
  description: string;
  price: string | null;
  location?: string | null;
  rating?: number | null;
  availability?: string | null;
  response_time_minutes?: number | null;
};

type EnrichedPro = Pro & {
  rating: number;
  availabilityLabel: string;
  responseTimeLabel: string;
  effectiveRate: number | null;
};

const parsePricingInfo = (raw: string | null): PricingInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as PricingInfo;
    }
  } catch {
    const amountMatch = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      const value = Number(amountMatch[1]);
      if (raw.toLowerCase().includes("flat")) {
        return {
          currency: "CAD",
          pricingType: "flat",
          flatFee: value,
          display: raw,
        };
      }
      return {
        currency: "CAD",
        pricingType: "hourly",
        hourlyRate: value,
        display: raw,
      };
    }
  }
  return null;
};

const formatPricing = (raw: string | null): string => {
  const info = parsePricingInfo(raw);
  if (!info) return raw ?? "Pricing pending";
  if (info.display) return info.display;
  if (info.pricingType === "flat" && info.flatFee) {
    return `$${info.flatFee.toFixed(0)} flat project fee`;
  }
  if (info.pricingType === "hourly" && info.hourlyRate) {
    const minimum = info.minimumHours ? `${info.minimumHours} hr min` : "2 hr min";
    return `$${info.hourlyRate.toFixed(0)}/hr • ${minimum}`;
  }
  return raw ?? "Pricing pending";
};

export default function ProvidersPage() {
  const [pros, setPros] = useState<EnrichedPro[]>([]);
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState(250);
  const [minRating, setMinRating] = useState(4);
  const [sortBy, setSortBy] = useState("best-match");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState("any");

  useEffect(() => {
    const fetchProviders = async () => {
      const supabase = createClient();
      let query = supabase.from("providers").select("*");
      if (selectedService) {
        query = query.eq("service", selectedService);
      }
      const { data, error } = await query;
      if (!error && data) {
        const enriched = data.map((pro, index): EnrichedPro => {
          const pricing = parsePricingInfo(pro.price);
          const effectiveRate = pricing?.pricingType === "hourly"
            ? pricing.hourlyRate ?? null
            : pricing?.flatFee ?? null;
          const ratingBase = pro.rating ?? 4.4 + (index % 3) * 0.2;
          const rating = Math.min(5, Number(ratingBase?.toFixed(1)) || 4.6);
          const availabilityLabel = pro.availability ?? "Weekdays & weekends";
          const responseTimeMinutes = pro.response_time_minutes ?? 90;
          const responseTimeLabel = responseTimeMinutes <= 60
            ? "Responds in under an hour"
            : `Responds in ~${Math.round(responseTimeMinutes / 30) * 30} mins`;

          return {
            ...pro,
            rating,
            availabilityLabel,
            responseTimeLabel,
            effectiveRate,
          };
        });
        setPros(enriched);
      }
      setLoading(false);
    };
    fetchProviders();
  }, [selectedService]);

  const filteredPros = useMemo(() => {
    const query = search.toLowerCase();
    return pros
      .filter((pro) => {
        const matchesSearch =
          pro.name?.toLowerCase().includes(query) ||
          pro.service?.toLowerCase().includes(query) ||
          pro.description?.toLowerCase().includes(query) ||
          pro.location?.toLowerCase().includes(query ?? "");
        const matchesRating = pro.rating >= minRating;
        const matchesAvailability =
          availabilityFilter === "any" ||
          pro.availabilityLabel.toLowerCase().includes(availabilityFilter);
        const numericPrice = pro.effectiveRate;
        const matchesPrice = !numericPrice || numericPrice <= maxPrice;
        return matchesSearch && matchesRating && matchesAvailability && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "price") {
          const aRate = a.effectiveRate ?? Number.MAX_SAFE_INTEGER;
          const bRate = b.effectiveRate ?? Number.MAX_SAFE_INTEGER;
          return aRate - bRate;
        }
        return b.rating - a.rating;
      });
  }, [availabilityFilter, maxPrice, minRating, pros, search, sortBy]);

  const toggleCompare = (id: string | undefined) => {
    if (!id) return;
    setSelectedProviders((prev) =>
      prev.includes(id)
        ? prev.filter((value) => value !== id)
        : prev.length >= 3
          ? [...prev.slice(1), id]
          : [...prev, id],
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white text-slate-800 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-12 flex-1">
        <h1 className="text-3xl font-bold mb-2 text-center">Find Trusted Home Pros</h1>
        <p className="text-center text-gray-600 mb-6">
          Cozy up for fall and winter with vetted Kawarthas and GTA specialists. Every booking is processed by our Canadian-owned marketplace.
        </p>
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input
            className="input input-bordered w-full bg-white text-gray-900 placeholder-gray-500 lg:col-span-2"
            placeholder="Search by name, skill, or neighbourhood"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="select select-bordered w-full bg-white text-gray-900"
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
          >
            {SERVICE_FILTERS.map(option => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered w-full bg-white text-gray-900"
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
          >
            <option value={4}>Rating 4.0+</option>
            <option value={4.5}>Rating 4.5+</option>
            <option value={4.8}>Rating 4.8+</option>
          </select>
          <select
            className="select select-bordered w-full bg-white text-gray-900"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="best-match">Best match</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
          </select>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <label className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <span className="font-semibold text-slate-700">Price cap (CAD)</span>
            <input
              type="range"
              min={50}
              max={500}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="range range-primary"
            />
            <span className="text-xs text-slate-500">Showing providers ≤ ${maxPrice}</span>
          </label>
          <label className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <span className="font-semibold text-slate-700">Availability</span>
            <select
              className="select select-bordered bg-white"
              value={availabilityFilter}
              onChange={e => setAvailabilityFilter(e.target.value)}
            >
              <option value="any">Any time</option>
              <option value="weekend">Weekends</option>
              <option value="evening">Evenings</option>
            </select>
            <span className="text-xs text-slate-500">Filter based on provider calendar notes.</span>
          </label>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="font-semibold text-slate-700">Need help choosing?</span>
            <p className="text-xs text-slate-500 mt-1">
              Select up to three providers to compare reviews, rates, and response times side-by-side.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8 text-xs uppercase tracking-wide text-blue-700">
          <span className="badge badge-outline">Roof & gutter prep</span>
          <span className="badge badge-outline">Snow shovelling routes</span>
          <span className="badge badge-outline">Holiday deep cleans</span>
          <span className="badge badge-outline">Weekend handyman calls</span>
        </div>
        {loading ? (
          <div className="text-center">Loading local pros...</div>
        ) : filteredPros.length === 0 ? (
          <div className="text-center text-gray-500">No pros match that search yet. Try a different keyword or browse all fall & winter services.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPros.map((pro) => (
              <div
                key={pro.id || pro.email}
                className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 border border-slate-100"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{pro.name}</h2>
                      <p className="text-primary font-medium mb-1">{SERVICE_LABELS[pro.service] ?? pro.service}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompare(pro.id)}
                      className={`btn btn-xs ${selectedProviders.includes(pro.id || "") ? "btn-primary" : "btn-outline"}`}
                    >
                      Compare
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-500 mt-2">
                    <Star className="h-4 w-4" fill="currentColor" />
                    <span className="font-semibold text-slate-900">{pro.rating.toFixed(1)}</span>
                    <span className="text-slate-500">• Verified</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{pro.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                    {pro.location ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        <MapPin className="h-3.5 w-3.5" />
                        {pro.location}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ID Verified
                    </span>
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                      <Clock className="h-3.5 w-3.5" />
                      {pro.responseTimeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      {pro.availabilityLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1 text-sm">
                  <span className="font-bold text-lg text-blue-700">{formatPricing(pro.price)}</span>
                  <span className="text-xs text-gray-500">
                    50% deposit via ZapTasks • Remaining 50% after homeowner sign-off
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedProviders.length >= 2 && (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Comparing {selectedProviders.length} providers
              </p>
              <p className="text-xs text-slate-500">
                Download the summary or start a group chat to clarify details before booking.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn btn-outline btn-sm">
                Export comparison
              </button>
              <button type="button" className="btn btn-primary btn-sm text-white">
                Start shared chat
              </button>
            </div>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
