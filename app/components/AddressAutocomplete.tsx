import React from "react";
import Autocomplete from "react-google-autocomplete";

interface AddressAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelected,
}) => {
  return (
    <Autocomplete
      options={{
        componentRestrictions: { country: "ca" },
        fields: ["address_components", "geometry", "formatted_address"],
        types: ["geocode"],
      }}
      onPlaceSelected={(place: google.maps.places.PlaceResult) => {
        if (!place.geometry?.location) {
          console.error("Selected place has no location data.");
          return;
        }
        onPlaceSelected(place);
      }}
      placeholder="Enter neighbourhood, city, or address"
      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
    />
  );
};

export default AddressAutocomplete;
