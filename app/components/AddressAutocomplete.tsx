"use client";
import React, { useEffect, useRef, useState } from "react";

interface AddressAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onPlaceSelected);
  callbackRef.current = onPlaceSelected;
  const [loadError, setLoadError] = useState(false);
  const [fallbackValue, setFallbackValue] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!window.google?.maps?.importLibrary) {
      setLoadError(true);
      return;
    }

    let el: google.maps.places.PlaceAutocompleteElement | null = null;
    let cancelled = false;

    (async () => {
      const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
        "places",
      )) as google.maps.PlacesLibrary;

      if (cancelled) return;

      el = new PlaceAutocompleteElement({
        includedRegionCodes: ["ca"],
        placeholder: "Enter neighbourhood, city, or address",
      });

      container.appendChild(el as unknown as Node);

      el.addEventListener("gmp-placeselect", async (event: Event) => {
        const { place } = event as google.maps.places.PlaceSelectEvent;
        await place.fetchFields({ fields: ["formattedAddress", "location"] });
        if (!place.location) {
          console.error("Selected place has no location data.");
          return;
        }
        callbackRef.current({
          formatted_address: place.formattedAddress ?? "",
          geometry: {
            location: place.location as unknown as google.maps.LatLng,
          },
        } as google.maps.places.PlaceResult);
      });
    })().catch((err) => {
      console.error("Failed to load Google Maps Places:", err);
      setLoadError(true);
    });

    return () => {
      cancelled = true;
      if (el && container.contains(el as unknown as Node)) {
        container.removeChild(el as unknown as Node);
      }
    };
  }, []);

  if (loadError) {
    return (
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder="Enter neighbourhood, city, or address"
        value={fallbackValue}
        onChange={(e) => {
          setFallbackValue(e.target.value);
          callbackRef.current({
            formatted_address: e.target.value,
          } as google.maps.places.PlaceResult);
        }}
      />
    );
  }

  return <div ref={containerRef} className="w-full" />;
};

export default AddressAutocomplete;
