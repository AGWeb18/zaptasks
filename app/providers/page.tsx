"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import Navbar from "../components/NavBar";
import { useUser } from "@clerk/nextjs";

const SERVICE_OPTIONS = [
  "Handyman & Repairs",
  "Home Cleaning",
  "Painting & Finishing",
  "Snow & Lawn Care",
];

type PricingInfo = {
  currency?: string;
  pricingType?: "hourly" | "flat";
  hourlyRate?: number | null;
  flatFee?: number | null;
  minimumHours?: number | null;
  display?: string;
};

type Provider = {
  id?: string;
  name: string;
  email?: string;
  service: string;
  description: string;
  price: string | null;
};

const parsePricingInfo = (raw: string | null): PricingInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as PricingInfo;
    }
  } catch {
    // Fall back to legacy price strings
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
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchProviders = async () => {
      const supabase = createClient();
      let query = supabase.from("providers").select("*");
      if (selectedService) {
        query = query.eq("service", selectedService);
      }
      const { data, error } = await query;
      if (!error && data) setProviders(data);
      setLoading(false);
    };
    fetchProviders();
  }, [selectedService]);

  const filteredProviders = providers.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.service?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2 text-center">Browse Service Providers</h1>
        <p className="text-center text-gray-600 mb-6">
          Verified pros serving the Kawarthas and Greater Toronto Area with Canadian-backed payments.
        </p>
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0 justify-center">
          <input
            className="input input-bordered w-full max-w-md bg-white text-gray-900 placeholder-gray-500"
            placeholder="Search by name, service, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="select select-bordered w-full max-w-xs bg-white text-gray-900"
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
          >
            <option value="">All Services</option>
            {SERVICE_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="text-center">Loading providers...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center text-gray-500">No providers found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id || provider.email}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2">{provider.name}</h2>
                  <p className="text-primary font-medium mb-1">{provider.service}</p>
                  <p className="mb-2 text-gray-600">{provider.description}</p>
                </div>
                <div className="mt-4 flex flex-col gap-1 text-sm">
                  <span className="font-bold text-lg text-blue-700">{formatPricing(provider.price)}</span>
                  <span className="text-xs text-gray-500">
                    50% deposit via ZapTasks • Remaining 50% after homeowner sign-off
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
