/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Navbar from "../components/NavBar";
import TimeSelector from "../components/TimeSelector";
import { format, addDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { createClient } from "../utils/supabase/client";

import {
  Calendar,
  Clock,
  Users,
  MapPin,
  ShoppingCart,
  Hammer,
  Trees,
} from "lucide-react";
import AddressAutocomplete from "../components/AddressAutocomplete";

interface Service {
  id: string;
  name: string;
  icon: React.ReactNode;
  examples: string[];
  description: string;
}

const services: Service[] = [
  {
    id: "grocery-runs",
    name: "Grocery Runs",
    icon: <ShoppingCart className="w-6 h-6" />,
    examples: [
      "Weekly grocery or pharmacy pickup",
      "Bulk or specialty store runs within Kawarthas & GTA",
      "Apartment drop-off with specific access notes",
    ],
    description:
      "Door-to-door delivery for small or large orders. Perfect for seniors, busy families, or anyone needing a quick assist. Helpers coordinate via in-app chat before pickup.",
  },
  {
    id: "property-cleanup",
    name: "Property Clean-Up",
    icon: <Trees className="w-6 h-6" />,
    examples: [
      "Leaf raking, snow shovelling, or garden tidy-ups",
      "Cottage turnover prep between guests",
      "Yard waste bagging and curbside staging",
    ],
    description:
      "Keep properties guest-ready with seasonal yard work and exterior clean-up. Share photos so neighbours know what tools to bring or if you have equipment on-site.",
  },
  {
    id: "handyman-jobs",
    name: "Handyman Jobs",
    icon: <Hammer className="w-6 h-6" />,
    examples: [
      "Furniture assembly or wall mounting",
      "Minor drywall or paint touch-ups",
      "Fixture installs and small repairs",
    ],
    description:
      "Quick fixes and punch-list items tackled by reviewed neighbours. Clarify scope, materials, and timing so the right person applies.",
  },
];

const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE_MB = 5;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const JOB_PHOTO_BUCKET = "job-media";

type PhotoAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const termsAndConditions = `
ZapTasks Terms and Conditions

1. Platform Role:
   ZapTasks is a platform connecting clients with independent service providers. We do not guarantee service quality or completion.

2. Payments and Cancellations:
   Once you accept a pro&apos;s proposal, a 50% deposit is collected through ZapTasks. The remaining balance is due after service completion. Cancellations within 24 hours of the confirmed start time may incur a 50% fee.

3. Service Scheduling:
   No same-day service is available. All bookings must be made at least 24 hours in advance.

4. Liability:
   ZapTasks is not liable for any damages, losses, or incomplete services. Clients are responsible for providing a safe work environment. Service providers may perform liability checks before starting work.

5. Documentation:
   Service providers have the right to take photos before and after the service for quality assurance and dispute resolution purposes.

6. Dispute Resolution:
   Unresolved issues must be reported within 48 hours. ZapTasks will mediate and may offer refunds at its sole discretion.

7. Platform Usage:
   ZapTasks may modify services, pricing, or these terms at any time. We reserve the right to terminate user accounts for any reason.

By using ZapTasks, you agree to these terms and conditions.
`;

const BookingPage: React.FC = () => {
  const { isLoaded, user } = useUser();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState(2);
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState("");
  const [bringEquipment, setBringEquipment] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [budgetType, setBudgetType] = useState<"flat" | "hourly">("flat");
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [budgetNotes, setBudgetNotes] = useState<string>("");
  const [contactPreference, setContactPreference] = useState<
    "messages" | "phone" | "email"
  >("messages");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDate, setMinDate] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">(
    "idle"
  );
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const photosRef = useRef<PhotoAttachment[]>([]);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(5); // New: for auto-pricing
  const [estimatedDistance, setEstimatedDistance] = useState(3); // New: km, from geolocation/zip
  const [dropOffNotes, setDropOffNotes] = useState(""); // New: for messaging drop-off details
  const [hasRequestedGeo, setHasRequestedGeo] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(25); // New: auto-calc
  const searchParams = useSearchParams();
  const hasGrocerySelected = selectedServices.includes("grocery-runs");

  useEffect(() => {
    const presetService = searchParams.get("service");
    const presetLocation = searchParams.get("location");
    const mappedService = (() => {
      switch (presetService) {
        case "grocery":
          return "grocery-runs";
        case "handyman":
          return "handyman-jobs";
        case "outdoor":
        case "cleaning":
          return "property-cleanup";
        default:
          return null;
      }
    })();

    if (mappedService) {
      setSelectedServices([mappedService]);
      const serviceName = services.find(
        (service) => service.id === mappedService
      )?.name;
      if (serviceName && !jobTitle) {
        setJobTitle(`${serviceName} help needed`);
      }
    }
    if (presetLocation) {
      setSelectedAddress(presetLocation);
    }
  }, [jobTitle, searchParams]);

  useEffect(() => {
    if (hours < 1) {
      setHours(1);
    }
  }, [hours]);

  useEffect(() => {
    if (!hasGrocerySelected) {
      return;
    }
    // Auto-calculate price based on items and distance
    const isSmallOrder = itemCount < 10 && estimatedDistance <= 5;
    setCalculatedPrice(isSmallOrder ? 25 : 35);
    setBudgetAmount(isSmallOrder ? "25" : "35");
  }, [itemCount, estimatedDistance, hasGrocerySelected]);

  useEffect(() => {
    if (hasGrocerySelected && budgetType !== "flat") {
      setBudgetType("flat");
    }
  }, [hasGrocerySelected, budgetType]);

  useEffect(() => {
    if (!hasGrocerySelected || hasRequestedGeo) {
      return;
    }
    if (!navigator.geolocation) {
      setHasRequestedGeo(true);
      return;
    }

    setHasRequestedGeo(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Mock distance calc (integrate Google Distance Matrix API in prod)
        setEstimatedDistance(3); // Placeholder: calculate from lat/lng to store
      },
      () => {
        // Fallback: prompt for postal code
        const postalCode = prompt(
          "Enter your postal code for a quick distance estimate"
        );
        if (postalCode) {
          // Mock API call
          setEstimatedDistance(4); // Placeholder
        }
      }
    );
  }, [hasGrocerySelected, hasRequestedGeo]);

  const isReadyToRequest = Boolean(
    jobTitle.trim() &&
      selectedServices.length > 0 &&
      date &&
      time &&
      description.trim() &&
      budgetAmount.trim()
  );

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus("idle");

    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions before submitting.");
      return;
    }

    if (!isLoaded || !user) {
      setError("Please log in to request a service.");
      return;
    }

    if (!isReadyToRequest) {
      setError(
        "Please complete the required details before posting your job request."
      );
      return;
    }

    const parsedBudgetAmount = Number(budgetAmount);
    if (Number.isNaN(parsedBudgetAmount) || parsedBudgetAmount <= 0) {
      setError("Please enter a valid budget amount greater than zero.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPhotoUploadError(null);

    try {
      let uploadedPhotoUrls: string[] = [];
      if (photos.length > 0) {
        try {
          const supabase = createClient();
          const baseFolder = `job-photos/${user.id}`;

          for (const attachment of photos) {
            const extension =
              attachment.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
            const filePath = `${baseFolder}/${attachment.id}.${extension}`;
            const { error: uploadError } = await supabase.storage
              .from(JOB_PHOTO_BUCKET)
              .upload(filePath, attachment.file, {
                cacheControl: "3600",
                upsert: false,
                contentType: attachment.file.type,
              });

            if (uploadError) {
              throw new Error("PHOTO_UPLOAD_FAILED");
            }

            const { data } = supabase.storage
              .from(JOB_PHOTO_BUCKET)
              .getPublicUrl(filePath);

            if (!data?.publicUrl) {
              throw new Error("PHOTO_UPLOAD_FAILED");
            }

            uploadedPhotoUrls.push(data.publicUrl);
          }
        } catch (photoError) {
          console.error("Error uploading job photos:", photoError);
          setPhotoUploadError(
            "We couldn&apos;t upload your photos. Please try again or continue without them."
          );
          throw new Error("PHOTO_UPLOAD_FAILED");
        }
      }

      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeownerId: user.id,
          homeownerName: user.fullName,
          homeownerEmail: user.primaryEmailAddress?.emailAddress,
          jobTitle,
          services: selectedServices,
          description,
          date,
          time,
          hours,
          people,
          bringEquipment,
          address: selectedAddress,
          latitude: selectedLat,
          longitude: selectedLng,
          budget: {
            type: budgetType,
            amount: parsedBudgetAmount,
            notes: budgetNotes,
          },
          contactPreference,
          photoUrls: uploadedPhotoUrls,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit job request");
      }

      await response.json();

      setSubmissionStatus("success");

      setSelectedServices([]);
      setExpandedService(null);
      setJobTitle("");
      setDate("");
      setTime("");
      setHours(1);
      setPeople(1);
      setDescription("");
      setBringEquipment(false);
      setSelectedAddress("");
      setSelectedLat(null);
      setSelectedLng(null);
      setBudgetType("flat");
      setBudgetAmount("");
      setBudgetNotes("");
      setContactPreference("messages");
      setAgreeToTerms(false);
      clearPhotos();
      setPhotoUploadError(null);

      // Optionally route to a confirmation page in future
    } catch (error) {
      console.error("Error creating job request:", error);
      if (
        !(error instanceof Error && error.message === "PHOTO_UPLOAD_FAILED")
      ) {
        setError(
          "We couldn’t post your job request. Please review the details and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleServiceExpansion = (serviceId: string) => {
    setExpandedService((prev) => (prev === serviceId ? null : serviceId));
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address) {
      setSelectedAddress(place.formatted_address);
    }
    if (place.geometry?.location) {
      setSelectedLat(place.geometry.location.lat());
      setSelectedLng(place.geometry.location.lng());
    }
  };

  const handleBringEquipmentChange = (checked: boolean) => {
    setBringEquipment(checked);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const validAttachments: PhotoAttachment[] = [];
    let message: string | null = null;

    files.forEach((file) => {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        message = message ?? "Supported formats are JPG, PNG, or WEBP.";
        return;
      }
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        message = message ?? `Images must be under ${MAX_PHOTO_SIZE_MB}MB.`;
        return;
      }

      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      validAttachments.push({
        id,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (validAttachments.length === 0) {
      if (message) {
        setPhotoUploadError(message);
      }
      return;
    }

    const availableSlots = MAX_PHOTOS - photos.length;

    if (availableSlots <= 0) {
      validAttachments.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl)
      );
      setPhotoUploadError(`You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const accepted = validAttachments.slice(0, availableSlots);
    const overflow = validAttachments.slice(availableSlots);

    overflow.forEach((attachment) =>
      URL.revokeObjectURL(attachment.previewUrl)
    );

    if (overflow.length > 0) {
      message = `You can upload up to ${MAX_PHOTOS} photos.`;
    }

    setPhotos((prev) => [...prev, ...accepted]);
    setPhotoUploadError(message);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
    setPhotoUploadError(null);
  };

  useEffect(() => {
    // Set the minimum date to tomorrow
    const tomorrow = addDays(new Date(), 1);
    setMinDate(format(tomorrow, "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl)
      );
    };
  }, []);

  return (
    <div data-theme="light">
      <Navbar />
      <div className="min-h-screen bg-slate-300 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-4 text-blue-600">
            Book Trusted Local Help in Minutes
          </h1>
          <p className="text-center text-base-content/70 mb-8 text-lg">
            ZapTasks connects Kawarthas &amp; GTA neighbours for grocery runs,
            property clean-ups, and handyman jobs. Post your task once and let
            verified locals apply.
          </p>

          {/* Demo Video */}
          <div className="mb-8 text-center">
            <iframe
              width="100%"
              height="315"
              src="https://www.youtube.com/embed/VIDEO_ID" // Replace with 30s demo video URL
              title="ZapTasks Marketplace Walkthrough"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="max-w-2xl mx-auto rounded-lg shadow-lg"
            ></iframe>
            <p className="text-sm text-gray-600 mt-2">
              30-second demo: See how easy it is to post a job, review
              applicants, and release milestone payments.
            </p>
          </div>

          <div className="card shadow-xl max-w-3xl mx-auto bg-slate-100">
            <div className="card-body">
              <h2 className="card-title text-xl">Post Your Task Details</h2>
              <p className="text-base-content/70 text-lg">
                Outline the work, timing, and budget. Neighbours will apply with
                availability so you can chat, compare, and book with confidence.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Service categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {services.map((service) => (
                    <div key={service.id} className="form-control">
                      <label className="label cursor-pointer justify-start space-x-3 text-lg">
                        <input
                          type="checkbox"
                          name="service"
                          className="checkbox checkbox-primary w-6 h-6" // Larger checkbox
                          value={service.id}
                          checked={selectedServices.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                        />
                        <span className="label-text flex items-center text-lg">
                          {service.icon}
                          <span className="ml-2">{service.name}</span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Selected services expansion */}
                {selectedServices.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-xl font-semibold">Selected Services</h3>
                    {selectedServices.map((serviceId) => {
                      const service = services.find((s) => s.id === serviceId);
                      const isExpanded = expandedService === serviceId;
                      return (
                        <div
                          key={serviceId}
                          className="bg-white shadow rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-lg flex items-center">
                              {" "}
                              {/* Larger */}
                              <span className="mr-2">{service?.icon}</span>
                              {service?.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => toggleServiceExpansion(serviceId)}
                              className="text-blue-600 text-lg hover:text-blue-800" // Larger
                            >
                              {isExpanded ? "Less info" : "More info"}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 text-base">
                              {" "}
                              {/* Larger */}
                              <p className="text-gray-600 mb-2">
                                {service?.description}
                              </p>
                              <h5 className="font-medium mb-1 text-lg">
                                Examples:
                              </h5>{" "}
                              {/* Larger */}
                              <ul className="list-disc pl-5 text-gray-600">
                                {service?.examples.map((example, index) => (
                                  <li key={index} className="mb-1 text-base">
                                    {example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasGrocerySelected && (
                  <>
                    {/* Item Count for Pricing */}
                    <div className="form-control mb-6">
                      <label className="label text-lg" htmlFor="itemCount">
                        <span className="label-text">
                          Estimated number of items
                        </span>
                      </label>
                      <input
                        id="itemCount"
                        type="number"
                        min="1"
                        className="input input-bordered w-full text-gray-900 text-lg"
                        placeholder="e.g. 8"
                        value={itemCount}
                        onChange={(e) => setItemCount(Number(e.target.value))}
                        required
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        This helps calculate the fee: $25 for &lt;10 items &amp;
                        ≤5km, $35 otherwise.
                      </p>
                    </div>

                    {/* Distance Estimate */}
                    <div className="form-control mb-6">
                      <label className="label text-lg" htmlFor="distance">
                        <span className="label-text">
                          Estimated distance to store (km)
                        </span>
                      </label>
                      <input
                        id="distance"
                        type="number"
                        min="0.1"
                        step="0.1"
                        className="input input-bordered w-full text-gray-900 text-lg"
                        placeholder="e.g. 2.5"
                        value={estimatedDistance}
                        onChange={(e) =>
                          setEstimatedDistance(Number(e.target.value))
                        }
                        required
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        We&apos;ll use your location or postal code to estimate.
                        One-way distance.
                      </p>
                    </div>

                    {/* Auto-Calculated Price Display */}
                    <div className="alert alert-info mb-6 text-lg">
                      <span>
                        Estimated grocery run fee:{" "}
                        {formatCurrency(calculatedPrice)}
                        (includes 5-10% platform fee; helpers earn ~$40/hr)
                      </span>
                    </div>

                    {/* Drop-off Notes for Messaging */}
                    <div className="form-control mb-6">
                      <label className="label text-lg" htmlFor="dropOffNotes">
                        <span className="label-text">
                          Drop-off instructions (for in-app messaging)
                        </span>
                      </label>
                      <textarea
                        id="dropOffNotes"
                        className="textarea textarea-bordered h-20 text-gray-900 text-lg"
                        placeholder="e.g. Leave bag under welcome mat or knock at apartment 2B—no entry needed"
                        value={dropOffNotes}
                        onChange={(e) => setDropOffNotes(e.target.value)}
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Helpers will message via app for confirmation. Builds
                        trust for secure delivery.
                      </p>
                    </div>
                  </>
                )}

                {/* Date and Time inputs */}
                <div className="flex space-x-4">
                  <div className="form-control flex-1">
                    <label className="label" htmlFor="date">
                      <span className="label-text">Date</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                        size={20}
                      />
                      <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={minDate}
                        className="input input-bordered pl-10 w-full text-gray-900"
                        required
                      />
                    </div>
                  </div>
                  <TimeSelector
                    value={time}
                    onChange={(newTime: string) => setTime(newTime)}
                  />{" "}
                </div>

                {/* Hours and People inputs */}
                {/* Hours and People inputs */}
                <div className="flex space-x-4">
                  <div className="form-control flex-1">
                    <label className="label" htmlFor="hours">
                      <span className="label-text">
                        Estimated hours needed (minimum 1)
                      </span>
                    </label>
                    <div className="relative">
                      <Clock
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                        size={20}
                      />
                      <input
                        id="hours"
                        type="number"
                        min={1}
                        value={hours}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          const min = 1;
                          setHours(isNaN(value) ? min : Math.max(min, value));
                        }}
                        onBlur={() => {
                          const min = 1;
                          if (hours < min) setHours(min);
                        }}
                        className="input input-bordered pl-10 w-full text-gray-900"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-control flex-1">
                    <label className="label" htmlFor="people">
                      <span className="label-text">
                        Number of People (minimum 1)
                      </span>
                    </label>
                    <div className="relative">
                      <Users
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                        size={20}
                      />
                      <input
                        id="people"
                        type="number"
                        min="1"
                        value={people}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setPeople(isNaN(value) ? 1 : Math.max(1, value));
                        }}
                        onBlur={() => {
                          if (people < 1) setPeople(1);
                        }}
                        className="input input-bordered pl-10 w-full text-gray-900"
                        required
                      />
                    </div>
                    {people < 1 && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          Minimum 1 person required
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Location input */}
                <div className="form-control">
                  <label className="label" htmlFor="location">
                    <span className="label-text">Approximate Location</span>
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                      size={20}
                    />
                    <AddressAutocomplete
                      onPlaceSelected={handlePlaceSelected}
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                    />
                  </div>
                </div>

                {/* Description input */}
                <div className="form-control">
                  <label className="label" htmlFor="description">
                    <span className="label-text">Task Description</span>
                  </label>
                  <textarea
                    id="description"
                    placeholder="Describe the task you need help with..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered h-24 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Photos (optional)
                  </label>
                  <p className="text-xs text-base-content/60 mb-3">
                    Add up to {MAX_PHOTOS} photos so neighbours understand the
                    space or repair needed. Clear visuals help your job stand
                    out.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {photos.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="relative w-28 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <Image
                          src={attachment.previewUrl}
                          alt="Selected job"
                          fill
                          className="object-cover"
                          sizes="112px"
                          unoptimized
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-white/90 hover:bg-white text-xs px-2 py-1 rounded-md shadow-sm"
                          onClick={() => removePhoto(attachment.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="w-28 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-xs text-slate-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                        <span className="font-semibold text-center">
                          Upload
                        </span>
                        <span className="mt-1 text-[10px] text-center leading-tight">
                          JPG, PNG or WEBP
                          <br />
                          Max {MAX_PHOTO_SIZE_MB}MB
                        </span>
                      </label>
                    )}
                  </div>
                  {photoUploadError && (
                    <p className="text-xs text-red-500 mt-2">
                      {photoUploadError}
                    </p>
                  )}
                </div>

                {/* Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="form-control">
                    <label className="label text-lg" htmlFor="budgetAmount">
                      <span className="label-text">
                        {hasGrocerySelected
                          ? "Auto-calculated fee (CAD)"
                          : "Your budget (CAD)"}
                      </span>
                    </label>
                    <input
                      id="budgetAmount"
                      type="number"
                      min="1"
                      className="input input-bordered w-full text-gray-900 text-lg"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      readOnly={hasGrocerySelected}
                      placeholder={hasGrocerySelected ? undefined : "e.g. 120"}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label text-lg" htmlFor="budgetType">
                      <span className="label-text">Fee type</span>
                    </label>
                    <select
                      id="budgetType"
                      className="select select-bordered w-full bg-white text-gray-900 text-lg"
                      value={budgetType}
                      onChange={(e) =>
                        setBudgetType(e.target.value as "flat" | "hourly")
                      }
                      disabled={hasGrocerySelected}
                    >
                      <option value="flat">
                        {hasGrocerySelected
                          ? "Flat delivery fee"
                          : "Flat project fee"}
                      </option>
                      {!hasGrocerySelected && (
                        <option value="hourly">Hourly rate</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Contact preference */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      How should neighbours reach you?
                    </span>
                  </label>
                  <div className="flex flex-col md:flex-row gap-3">
                    {[
                      { value: "messages", label: "ZapTasks messages" },
                      { value: "email", label: "Email" },
                      { value: "phone", label: "Phone call" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-500 transition"
                      >
                        <input
                          type="radio"
                          name="contactPreference"
                          value={option.value}
                          checked={contactPreference === option.value}
                          onChange={() =>
                            setContactPreference(
                              option.value as "messages" | "email" | "phone"
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bring equipment checkbox */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start space-x-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={bringEquipment}
                      onChange={(e) =>
                        handleBringEquipmentChange(e.target.checked)
                      }
                    />
                    <span className="label-text">
                      Subcontractor brings own equipment (additional fee may
                      apply)
                    </span>
                  </label>
                </div>

                {/* Terms and conditions */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-gray-900">
                      Terms and Conditions
                    </span>
                  </label>
                  <div className="bg-base-200 p-4 rounded-md text-sm h-40 overflow-y-auto mb-2 text-gray-900">
                    <pre className="whitespace-pre-wrap">
                      {termsAndConditions}
                    </pre>
                  </div>
                  <label className="label cursor-pointer justify-start space-x-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      required
                    />
                    <span className="label-text">
                      I agree to the terms and conditions
                    </span>
                  </label>
                </div>

                {/* Request summary and submit */}
                <div className="mt-6 space-y-4">
                  {error && (
                    <div className="alert alert-error shadow-sm">
                      <span>{error}</span>
                    </div>
                  )}
                  {submissionStatus === "success" && (
                    <div className="alert alert-success shadow-sm">
                      <div>
                        <h3 className="font-semibold">Job request posted!</h3>
                        <p className="text-sm">
                          We&apos;ll notify nearby neighbours so they can apply.
                          You&apos;ll choose who to hire once the proposals
                          arrive.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Preferred budget</span>
                      <span>
                        {budgetAmount
                          ? formatCurrency(Number(budgetAmount))
                          : "Not set"}
                        {budgetType === "hourly" ? "/hr" : " flat"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Service window</span>
                      <span>
                        {date ? format(new Date(date), "MMM d, yyyy") : "TBD"} •{" "}
                        {time || "Flexible"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Crew size needed</span>
                      <span>
                        {people} {people === 1 ? "person" : "people"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Contact preference</span>
                      <span className="capitalize">{contactPreference}</span>
                    </div>
                    {budgetNotes && (
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <span className="font-medium block mb-1">
                          Budget notes
                        </span>
                        <p className="text-gray-600 text-sm">{budgetNotes}</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block text-lg py-4"
                    disabled={!agreeToTerms || !isReadyToRequest || isLoading}
                  >
                    {isLoading ? "Posting Your Task..." : "Post Your Task"}
                  </button>
                  {!isReadyToRequest && (
                    <p className="text-xs text-error">
                      Add a headline, pick services, and include a budget to
                      share your request with local neighbours.
                    </p>
                  )}
                  {selectedServices.length === 0 && (
                    <p className="text-xs text-error">
                      Choose at least one service category to continue.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
