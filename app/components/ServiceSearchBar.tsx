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
  { value: "grocery", label: "Grocery Runs" },
  { value: "handyman", label: "General Help" },
  { value: "outdoor", label: "Yard Work" },
];

export function ServiceSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [service, setService] = useState(SERVICE_OPTIONS[0]?.value ?? "");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
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
        const res = await fetch(
          `/api/places-autocomplete?input=${encodeURIComponent(location)}`
        );
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
            `/api/reverse-geocode?lat=${latitude}&lng=${longitude}`
          );
          const data = (await res.json()) as {
            formattedAddress?: string | null;
          };
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
      }
    );
  };

  const serviceLabel = useMemo(
    () => SERVICE_OPTIONS.find((s) => s.value === service)?.label ?? "Service",
    [service]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      service,
      q: location,
    });
    if (coords) {
      params.set("lat", coords.lat.toString());
      params.set("lng", coords.lng.toString());
    }
    router.push(`/booking?${params.toString()}`);
  };

  return (
    <div
      className={clsx(
        "relative w-full rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5",
        className
      )}
    >
      <form
        className="flex flex-col sm:flex-row items-center gap-2"
        onSubmit={handleSubmit}
      >
        <div className="w-full sm:w-auto dropdown">
          <label
            tabIndex={0}
            className="btn btn-ghost flex-shrink-0 rounded-full w-full justify-start"
          >
            {serviceLabel}
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu rounded-box z-[1] w-52 bg-base-100 p-2 shadow"
          >
            {SERVICE_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <a onClick={() => setService(opt.value)}>{opt.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200" />

        <div className="relative flex-grow w-full">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Enter city or postal code..."
            className="w-full border-none bg-transparent pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:ring-0 h-12"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </div>

        <div className="flex w-full items-center gap-1 sm:w-auto">
          <button
            type="button"
            onClick={handleGeolocate}
            className="btn btn-ghost btn-circle"
            aria-label="Use current location"
          >
            {geoLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Compass className="h-5 w-5" />
            )}
          </button>

          <button
            type="submit"
            className="btn btn-primary rounded-full flex-grow"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
            <span className="hidden md:inline ml-2">Search</span>
          </button>
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border bg-white shadow-lg">
          {loadingSuggestions && (
            <li className="px-4 py-2 text-sm text-slate-500">Loading...</li>
          )}
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="cursor-pointer px-4 py-2 hover:bg-slate-100"
              onMouseDown={() => handleSuggestionSelect(s)}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ServiceSearchBar;
