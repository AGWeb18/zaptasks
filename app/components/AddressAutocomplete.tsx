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

  const defaultBounds = {
    north: 44.42933489719813,
    south: 44.22933489719813,
    east: -78.6230982496161,
    west: -78.8230982496161,
  };

  const options = {
    bounds: defaultBounds,
    componentRestrictions: { country: "ca" },
    fields: ["address_components", "geometry", "formatted_address"],
    strictBounds: false,
    types: ["address"],
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

    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();

    console.log(
      `Full Address: ${fullAddress}, Lat: ${latitude}, Lng: ${longitude}`
    );

    setLocation(fullAddress);
    onPlaceSelected(place);
  };

  return (
    <Autocomplete
      apiKey={apiKey}
      options={options}
      onPlaceSelected={handlePlaceSelected}
      defaultValue={location}
      required={true}
      placeholder="Enter an address"
      className="input input-bordered w-full text-center bg-slate-white text-gray-900"
    />
  );
};

export default AddressAutocomplete;
