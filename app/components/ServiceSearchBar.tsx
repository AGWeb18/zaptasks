"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Loader2, MapPin, Search } from "lucide-react";
import clsx from "clsx";

type Suggestion = {
  description: string;
  place_id: string;
};

const SERVICE_OPTIONS = [
  { value: "handyman", label: "Home Repairs" },
  { value: "cleaning", label: "Cleaning & Turnover" },
  { value: "outdoor", label: "Outdoor & Seasonal" },
];

export function ServiceSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [service, setService] = useState(SERVICE_OPTIONS[0]?.value ?? "");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (location.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(location)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch suggestions");
        }
        const data = (await res.json()) as { predictions: Suggestion[] };
        setSuggestions(data.predictions ?? []);
      } catch (error) {
        console.error("Places autocomplete error", error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location]);

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setLocation(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGeolocate = () => {
    if (!navigator?.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: position }) => {
        const { latitude, longitude } = position;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${latitude}&lng=${longitude}`,
          );
          const data = (await res.json()) as { formattedAddress?: string | null };
          if (data.formattedAddress) {
            setLocation(data.formattedAddress);
          } else {
            setLocation("Using your current location");
          }
        } catch (error) {
          console.error("Reverse geocode failed", error);
          setLocation("Using your current location");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
      },
    );
  };

  const serviceLabel = useMemo(
    () => SERVICE_OPTIONS.find((s) => s.value === service)?.label ?? "Service",
    [service],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (location) params.set("location", location);
    if (coords) params.set("lat", coords.lat.toString()), params.set("lng", coords.lng.toString());
    router.push(`/booking?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        "w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg px-4 sm:px-6 py-4 sm:py-6",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <label className="flex-1">
          <span className="text-xs uppercase tracking-wide text-gray-500">Service</span>
          <div className="relative mt-1">
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
              className="select select-bordered w-full bg-white text-gray-900"
            >
              {SERVICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex-[1.4]">
          <span className="text-xs uppercase tracking-wide text-gray-500">Location</span>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input input-bordered w-full bg-white text-gray-900 pl-9"
              placeholder="Search by neighbourhood, city, or postal code"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleGeolocate}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-sm btn-ghost"
            >
              {geoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Compass className="h-4 w-4 text-blue-600" />
              )}
            </button>
            {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
              <div className="absolute z-20 mt-2 w-full rounded-lg bg-white shadow-xl border border-slate-200">
                {loadingSuggestions && (
                  <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching nearby locations…
                  </div>
                )}
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.place_id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50"
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        <div className="flex sm:flex-col items-stretch sm:items-end gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500 sm:hidden">
            Action
          </span>
          <button type="submit" className="btn btn-primary btn-lg sm:btn-md w-full sm:w-auto text-white">
            <Search className="h-4 w-4 mr-2" />
            Start Your Job
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Neighbours are posting: Toronto snow removal, Kawartha Lakes cottage closing, GTA deep clean.
        </span>
        <span className="font-medium text-blue-700">Built for Canadian homes • 50% deposit protection</span>
      </div>
    </form>
  );
}

export default ServiceSearchBar;
