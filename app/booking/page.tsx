"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "../components/NavBar";
import TimeSelector from "../components/TimeSelector";
import { format, addDays } from "date-fns";

import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Snowflake,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Hammer,
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
    id: "snow-ice",
    name: "Snow Removal & Ice Control",
    icon: <Snowflake className="w-6 h-6" />,
    examples: [
      "Driveway plowing",
      "Walkway salting",
      "Emergency snow blowing",
    ],
    description:
      "Keep paths clear across the Kawarthas and GTA with on-call crews for overnight snowfalls and freeze-thaw cycles.",
  },
  {
    id: "winterize",
    name: "Winter Repairs & Weatherproofing",
    icon: <Hammer className="w-6 h-6" />,
    examples: [
      "Draft sealing & weatherstripping",
      "Gutter guard installs",
      "Cottage winter close-up",
    ],
    description:
      "Licensed pros tackling cold-weather fixes, roofline checks, and cottage winterization before deep freezes arrive.",
  },
  {
    id: "holiday-clean",
    name: "Holiday Clean-Up & Turnover",
    icon: <Sparkles className="w-6 h-6" />,
    examples: [
      "Pre-guest deep clean",
      "Rental turnover reset",
      "Post-party refresh",
    ],
    description:
      "Detail-driven teams ready for spotless homes, condos, and lakeside retreats between holiday guests.",
  },
];

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
  const [contactPreference, setContactPreference] = useState<"messages" | "phone" | "email">("messages");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDate, setMinDate] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">("idle");

  useEffect(() => {
    if (hours < 1) {
      setHours(1);
    }
  }, [hours]);

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
      setError("Please complete the required details before posting your job request.");
      return;
    }

    const parsedBudgetAmount = Number(budgetAmount);
    if (Number.isNaN(parsedBudgetAmount) || parsedBudgetAmount <= 0) {
      setError("Please enter a valid budget amount greater than zero.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
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

      // Optionally route to a confirmation page in future
    } catch (error) {
      console.error("Error creating job request:", error);
      setError(
        "We couldn’t post your job request. Please review the details and try again."
      );
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

  useEffect(() => {
    // Set the minimum date to tomorrow
    const tomorrow = addDays(new Date(), 1);
    setMinDate(format(tomorrow, "yyyy-MM-dd"));
  }, []);

  return (
    <div data-theme="light">
      <Navbar />
      <div className="min-h-screen bg-slate-300 py-12">
        <div className="container mx-auto px-4 ">
          <h1 className="text-4xl font-bold text-center mb-4 text-blue-600">
            Request Seasonal Home Help
          </h1>
          <p className="text-center text-base-content/70 mb-8">
            Post your job once and let vetted Kawarthas and GTA pros apply. Review proposals, pick your favourite, and we&apos;ll handle the secure Canadian payments.
          </p>

          <div className="card shadow-xl max-w-3xl mx-auto bg-slate-100">
            <div className="card-body">
              <h2 className="card-title">Tell us what you need</h2>
              <p className="text-base-content/70">
                Share the fall and winter jobs you want covered so local experts can raise their hand
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block mb-2 font-semibold" htmlFor="jobTitle">
                    Job headline
                  </label>
                  <input
                    id="jobTitle"
                    type="text"
                    className="input input-bordered w-full bg-white text-gray-900"
                    placeholder="e.g. Clear driveway before Monday morning"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {services.map((service) => (
                    <div key={service.id} className="form-control">
                      <label className="label cursor-pointer justify-start space-x-3">
                        <input
                          type="checkbox"
                          name="service"
                          className="checkbox checkbox-primary"
                          value={service.id}
                          checked={selectedServices.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                        />
                        <span className="label-text flex items-center">
                          {service.icon}
                          <span className="ml-2 text-sm">{service.name}</span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {selectedServices.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Selected Services</h3>
                    {selectedServices.map((serviceId) => {
                      const service = services.find((s) => s.id === serviceId);
                      const isExpanded = expandedService === serviceId;
                      return (
                        <div
                          key={serviceId}
                          className="bg-white shadow rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm flex items-center">
                              <span className="mr-2">{service?.icon}</span>
                              {service?.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => toggleServiceExpansion(serviceId)}
                              className="text-blue-600 text-sm hover:text-blue-800"
                            >
                              {isExpanded ? "Less info" : "More info"}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 text-sm">
                              <p className="text-gray-600 mb-2">
                                {service?.description}
                              </p>
                              <h5 className="font-medium mb-1">Examples:</h5>
                              <ul className="list-disc pl-5 text-gray-600">
                                {service?.examples.map((example, index) => (
                                  <li key={index} className="mb-1">
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

                <div className="space-y-4">
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
                        apiKey={
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                        }
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

                  {/* Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label" htmlFor="budgetAmount">
                        <span className="label-text">Preferred budget (CAD)</span>
                      </label>
                      <input
                        id="budgetAmount"
                        type="number"
                        min="1"
                        className="input input-bordered w-full text-gray-900"
                        placeholder="e.g. 250"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label" htmlFor="budgetType">
                        <span className="label-text">Budget type</span>
                      </label>
                      <select
                        id="budgetType"
                        className="select select-bordered w-full bg-white text-gray-900"
                        value={budgetType}
                        onChange={(e) => setBudgetType(e.target.value as "flat" | "hourly")}
                      >
                        <option value="flat">Flat project estimate</option>
                        <option value="hourly">Hourly estimate</option>
                      </select>
                    </div>
                    <div className="form-control md:col-span-2">
                      <label className="label" htmlFor="budgetNotes">
                        <span className="label-text">Budget notes (optional)</span>
                      </label>
                      <textarea
                        id="budgetNotes"
                        className="textarea textarea-bordered text-gray-900"
                        placeholder="Share any pricing details, materials supplied, or flexibility."
                        value={budgetNotes}
                        onChange={(e) => setBudgetNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Contact preference */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">How should pros reach you?</span>
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
                              setContactPreference(option.value as "messages" | "email" | "phone")
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
                        <h3 className="font-semibold">
                          Job request posted!
                        </h3>
                        <p className="text-sm">
                          We&apos;ll notify local pros so they can apply. You&apos;ll choose who to hire once the proposals arrive.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Preferred budget</span>
                      <span>
                        {budgetAmount ? formatCurrency(Number(budgetAmount)) : "Not set"}
                        {budgetType === "hourly" ? "/hr" : " flat"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Service window</span>
                      <span>{date ? format(new Date(date), "MMM d, yyyy") : "TBD"} • {time || "Flexible"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Crew size needed</span>
                      <span>{people} {people === 1 ? "person" : "people"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Contact preference</span>
                      <span className="capitalize">{contactPreference}</span>
                    </div>
                    {budgetNotes && (
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <span className="font-medium block mb-1">Budget notes</span>
                        <p className="text-gray-600 text-sm">{budgetNotes}</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={!agreeToTerms || !isReadyToRequest || isLoading}
                  >
                    {isLoading ? "Posting request..." : "Post Job Request"}
                  </button>
                  {!isReadyToRequest && (
                    <p className="text-xs text-error">
                      Add a headline, pick services, and include a budget to share your request with local pros.
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
