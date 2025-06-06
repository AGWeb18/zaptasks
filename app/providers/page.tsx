"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import Navbar from "../components/NavBar";
import ChatModal from "../components/ChatModal";
import { useUser } from "@clerk/nextjs";

type Provider = {
  id?: string;
  name: string;
  email: string;
  service: string;
  description: string;
  price: string;
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [chatProvider, setChatProvider] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("providers").select("*");
      if (!error && data) setProviders(data as Provider[]);
      setLoading(false);
    };
    fetchProviders();
  }, []);

  const filteredProviders = providers.filter((p: Provider) => {
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
        <div className="mb-8 flex justify-center">
          <input
            className="input input-bordered w-full max-w-md"
            placeholder="Search by service, provider, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
                  {user && provider.id !== user.id ? (
                    <button
                      className="btn btn-sm btn-primary text-white"
                      onClick={() => setChatProvider({ id: provider.id || provider.email, name: provider.name })}
                    >
                      Message
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {chatProvider && (
          <ChatModal
            providerId={chatProvider.id}
            providerName={chatProvider.name}
            onClose={() => setChatProvider(null)}
          />
        )}
      </div>
    </div>
  );
}
