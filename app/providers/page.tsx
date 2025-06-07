"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import Navbar from "../components/NavBar";
import { useUser } from "@clerk/nextjs";

const SERVICE_OPTIONS = [
  "Handyman Services",
  "Lawn Mowing",
  "Deep Cleaning",
  "Painting",
  "Pet Care Assistance",
  "Basic Tech Support",
  "Event Assistance",
  "Yard Work",
  "Pressure Washing"
];

type Provider = {
  id?: string;
  name: string;
  email?: string;
  service: string;
  description: string;
  price: string;
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
        <h1 className="text-3xl font-bold mb-6 text-center">Browse Service Providers</h1>
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
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-lg text-blue-700">{provider.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
