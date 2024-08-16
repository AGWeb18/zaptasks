"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Navbar from "../components/NavBar";

import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  MapPin,
  PaintBucket,
  Shovel,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Hammer, Trash2, Dog, Wifi, PartyPopper } from "lucide-react";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

interface Service {
  id: string;
  name: string;
  icon: React.ReactNode;
  examples: string[];
  description: string;
}

const services: Service[] = [
  {
    id: "handyman",
    name: "Handyman Services",
    icon: <Hammer className="w-6 h-6" />,
    examples: ["Furniture assembly", "Picture hanging", "Minor repairs"],
    description:
      "Assistance with heavy lifting, furniture assembly, and packing or unpacking for moves.",
  },
  {
    id: "help",
    name: "Secondary Set of Hands",
    icon: <Users className="w-6 h-6" />,
    examples: [
      "Moving furniture",
      "Organizing garage",
      "Helping with DIY projects",
    ],
    description:
      "Extra help for various tasks, DIY projects, and minor home repairs.",
  },
  {
    id: "paint",
    name: "Paint Help",
    icon: <PaintBucket className="w-6 h-6" />,
    examples: ["Wall painting", "Trim work", "Ceiling painting"],
    description:
      "Interior and exterior painting, including walls, ceilings, and trim work.",
  },
  {
    id: "yardwork",
    name: "Yard Work",
    icon: <Shovel className="w-6 h-6" />,
    examples: ["Lawn mowing", "Leaf raking", "Planting flowers"],
    description:
      "Lawn mowing, planting, leaf raking, and basic landscape maintenance.",
  },
  {
    id: "cleaning",
    name: "Deep Cleaning",
    icon: <Trash2 className="w-6 h-6" />,
    examples: ["Bathroom scrubbing", "Kitchen deep clean", "Carpet shampooing"],
    description:
      "Thorough cleaning of neglected areas, including sanitization and organizing.",
  },
  {
    id: "petcare",
    name: "Pet Care Assistance",
    icon: <Dog className="w-6 h-6" />,
    examples: ["Dog walking", "Cat litter box cleaning", "Pet feeding"],
    description:
      "Dog walking, pet feeding, litter box cleaning, and basic pet care.",
  },
  {
    id: "techsupport",
    name: "Basic Tech Support",
    icon: <Wifi className="w-6 h-6" />,
    examples: [
      "Wi-Fi setup",
      "Printer installation",
      "Smartphone troubleshooting",
    ],
    description:
      "Help with device setup, Wi-Fi troubleshooting, and software installation.",
  },
  {
    id: "eventassistance",
    name: "Event Assistance",
    icon: <PartyPopper className="w-6 h-6" />,
    examples: ["Party setup", "Cleanup after gatherings", "Guest management"],
    description:
      "Help with setup, cleanup, and guest management for small gatherings and parties.",
  },
];
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const termsAndConditions = `
    1. Services are provided on an as-is basis.
    2. Clients are responsible for providing a safe work environment.
    3. Payment is due upon completion of services.
    4. Cancellations must be made at least 24 hours in advance.
    `;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BookingPage: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { userId, sessionId } = useAuth();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState(2);
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState("");
  const [bringEquipment, setBringEquipment] = useState(false);
  const [bringEquipmentFee, setBringEquipmentFee] = useState(0);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [depositClientSecret, setDepositClientSecret] = useState("");
  const [remainingIntentId, setRemainingIntentId] = useState("");
  const [paymentStep, setPaymentStep] = useState<
    "initial" | "deposit" | "final"
  >("initial");

  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState("");

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent the default form submission behavior
    e.preventDefault();

    // Check if the user has agreed to the terms and conditions
    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions before submitting.");
      return;
    }

    // Ensure the user is logged in
    if (!isLoaded || !user) {
      setError("Please log in to book a service.");
      return;
    }

    // Set loading state and clear any previous errors
    setIsLoading(true);
    setError(null);

    try {
      // Check if the user is already a Stripe customer
      const checkCustomerResponse = await fetch("/api/check-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress,
        }),
      });

      if (!checkCustomerResponse.ok) {
        throw new Error("Failed to check customer status");
      }

      const { isCustomer, customerId } = await checkCustomerResponse.json();

      // If not a customer, create one
      let stripeCustomerId = customerId;
      if (!isCustomer) {
        const createCustomerResponse = await fetch("/api/create-customer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.fullName,
            email: user.primaryEmailAddress?.emailAddress,
          }),
        });

        if (!createCustomerResponse.ok) {
          throw new Error("Failed to create customer");
        }

        const { customerId: newCustomerId } =
          await createCustomerResponse.json();
        stripeCustomerId = newCustomerId;
      }

      // Create the invoice
      const invoiceResponse = await fetch("/api/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          customerId: stripeCustomerId,
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
          services: selectedServices,
          date,
          time,
          hours,
          people,
          description,
          address: selectedAddress,
          bringEquipment,
        }),
      });

      if (!invoiceResponse.ok) {
        throw new Error("Failed to create invoice");
      }

      const invoiceData = await invoiceResponse.json();
      console.log(invoiceData);

      // Navigate to invoice confirmation or show success message
      router.push(`/invoice-confirmation/${invoiceData.depositInvoiceId}`);
    } catch (error) {
      console.error("Error during booking process:", error);
      setError(
        "An error occurred during the booking process. Please try again."
      );
    } finally {
      // Reset loading state regardless of success or failure
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

  const options = {
    clientSecret,
    appearance: { theme: "stripe" as const },
  };

  const handleBringEquipmentChange = (checked: boolean) => {
    setBringEquipment(checked);
    setBringEquipmentFee(checked ? 50 : 0);
  };

  const handleSuccess = () => {
    setPaymentStatus("success");
    setErrorMessage("");
  };

  const handleError = (error: string) => {
    setPaymentStatus("error");
    setErrorMessage(error);
  };

  const appearance = {
    theme: "stripe",
  };
  //   const options = {
  //     clientSecret,
  //     appearance,
  //   };

  // Calculate the amount whenever relevant inputs change
  useEffect(() => {
    const calculatedAmount = hours * people * 100 + bringEquipmentFee;
    setAmount(calculatedAmount);
  }, [hours, people, bringEquipmentFee]);
  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-slate-300 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">
            Book a Service
          </h1>

          <div className="card bg-base-100 shadow-xl max-w-3xl mx-auto">
            <div className="card-body">
              <h2 className="card-title">Select Your Services</h2>
              <p className="text-base-content/70">
                Choose one or more services you need assistance with
              </p>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-3 mb-6">
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
                          <span className="ml-2">{service.name}</span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {selectedServices.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Selected Services
                    </h3>
                    {selectedServices.map((serviceId) => {
                      const service = services.find((s) => s.id === serviceId);
                      const isExpanded = expandedService === serviceId;
                      return (
                        <div
                          key={serviceId}
                          className="card bg-base-200 shadow-md text-gray-900"
                        >
                          <div className="card-body p-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium text-lg flex items-center">
                                {service?.icon && (
                                  <span className="mr-2">{service.icon}</span>
                                )}
                                {service?.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleServiceExpansion(serviceId)
                                }
                                className="btn btn-sm btn-circle btn-ghost"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-2">
                                <p className="text-base-content/80 mb-2">
                                  {service?.description}
                                </p>
                                <div className="bg-base-100 rounded-lg p-3">
                                  <h5 className="font-medium mb-2">
                                    Examples of tasks:
                                  </h5>
                                  <ul className="list-disc pl-5">
                                    {service?.examples.map((example, index) => (
                                      <li key={index}>{example}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
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
                          className="input input-bordered pl-10 w-full text-gray-900"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-control flex-1">
                      <label className="label" htmlFor="time">
                        <span className="label-text">Time</span>
                      </label>
                      <div className="relative">
                        <Clock
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                          size={20}
                        />
                        <input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="input input-bordered pl-10 w-full text-gray-900"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hours and People inputs */}
                  {/* Hours and People inputs */}
                  <div className="flex space-x-4">
                    <div className="form-control flex-1">
                      <label className="label" htmlFor="hours">
                        <span className="label-text">
                          Number of Hours (minimum 2)
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
                          min="2"
                          value={hours}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setHours(isNaN(value) ? 2 : Math.max(2, value));
                          }}
                          onBlur={() => {
                            if (hours < 2) setHours(2);
                          }}
                          className="input input-bordered pl-10 w-full text-gray-900"
                          required
                        />
                      </div>
                      {hours < 2 && (
                        <label className="label">
                          <span className="label-text-alt text-error">
                            Minimum 2 hours required
                          </span>
                        </label>
                      )}
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

                {/* Total and submit button */}
                <div className="mt-6">
                  <div className="text-xl font-semibold mb-4 flex items-center justify-center">
                    <DollarSign className="mr-2" size={24} />
                    Total: ${amount}
                  </div>
                  {clientSecret && (
                    <Elements stripe={stripePromise} options={options}>
                      <button className="btn btn-primary w-full text-white btn-lg">
                        Book Now
                      </button>
                    </Elements>
                  )}
                  {!clientSecret && (
                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={!agreeToTerms}
                    >
                      Proceed to Payment
                    </button>
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
