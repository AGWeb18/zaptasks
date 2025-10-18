import React, { useState } from "react";
import Autocomplete from "react-google-autocomplete";

interface AddressAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  apiKey: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelected,
  apiKey,
}) => {
  const [location, setLocation] = useState<string>("");

  const options = {
    componentRestrictions: { country: "ca" },
    fields: ["address_components", "geometry", "formatted_address"],
    strictBounds: false,
    types: ["geocode"],
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry || !place.geometry.location) {
      console.error("Place has no location.");
      return;
    }

    let fullAddress = place.formatted_address || "";

    if (!fullAddress && place.address_components) {
      const selectedIndexes = [1, 2, 3, 4];
      const selectedComponents = place.address_components.filter((_, index) =>
        selectedIndexes.includes(index)
      );
      fullAddress = selectedComponents
        .map((component) => component.short_name)
        .join(" ");
    }

    setLocation(fullAddress);
    onPlaceSelected(place);
  };

  return (
    <Autocomplete
      apiKey={apiKey}
      options={options}
      onPlaceSelected={handlePlaceSelected}
      value={location}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        setLocation(event.target.value)
      }
      placeholder="Enter neighbourhood, city, or address"
      className="input input-bordered w-full text-center bg-slate-white text-gray-900"
    />
  );
};

export default AddressAutocomplete;
