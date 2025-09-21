"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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

const PROVIDER_SERVICE_LABELS: Record<string, string> = {
  "Snow & Lawn Care": "Snow Removal & Ice Control",
  "Handyman & Repairs": "Winter Repairs & Weatherproofing",
  "Home Cleaning": "Holiday Clean-Up & Turnover",
  "Painting & Finishing": "Interior Touch-Ups",
};

const formatServiceLabel = (value: string | null | undefined) =>
  value ? PROVIDER_SERVICE_LABELS[value] ?? value : "Seasonal service";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type PricingInfo = {
  currency?: string;
  pricingType?: "hourly" | "flat";
  hourlyRate?: number | null;
  flatFee?: number | null;
  minimumHours?: number | null;
  display?: string;
};

type ProviderOption = {
  id: string;
  name: string;
  service: string;
  price: string | null;
};

// 10% platform fee applied to both homeowner and pro transactions
const PLATFORM_FEE_RATE = 0.1;

const parsePricingInfo = (raw: string | null | undefined): PricingInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as PricingInfo;
    }
  } catch {
    const amountMatch = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      const value = Number(amountMatch[1]);
      if (raw.toLowerCase().includes("flat")) {
        return {
          currency: "CAD",
          pricingType: "flat",
          flatFee: value,
          display: raw,
        };
      }
      return {
        currency: "CAD",
        pricingType: "hourly",
        hourlyRate: value,
        display: raw,
      };
    }
  }
  return null;
};

const formatProviderPricing = (raw: string | null | undefined): string => {
  const info = parsePricingInfo(raw);
  if (!info) return raw ?? "Pricing pending";
  if (info.display) return info.display;
  if (info.pricingType === "flat" && info.flatFee) {
    return `$${info.flatFee.toFixed(0)} flat project fee`;
  }
  if (info.pricingType === "hourly" && info.hourlyRate) {
    const minimum = info.minimumHours ? `${info.minimumHours} hr min` : "2 hr min";
    return `$${info.hourlyRate.toFixed(0)}/hr • ${minimum}`;
  }
  return raw ?? "Pricing pending";
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const termsAndConditions = `
ZapTasks Terms and Conditions

1. Platform Role:
   ZapTasks is a platform connecting clients with independent service providers. We do not guarantee service quality or completion.

2. Payments and Cancellations:
   A 50% deposit is required at booking. Full payment is due upon service completion. Cancellations within 24 hours may incur a 50% fee.

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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient();

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
  const [clientSecret, setClientSecret] = useState("");
  const [minDate, setMinDate] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("providers")
      .select("id, name, service, price")
      .then(({ data, error }) => {
        if (!error && data) {
          const normalized = data.map((provider) => ({
            id: provider.id,
            name: provider.name,
            service: provider.service,
            price: provider.price ?? null,
          }));
          setProviderOptions(normalized);
        }
      });
  }, []);

  const selectedProvider = React.useMemo(
    () => providerOptions.find((option) => option.id === selectedProviderId) || null,
    [providerOptions, selectedProviderId]
  );

  const selectedPricing = React.useMemo(
    () => parsePricingInfo(selectedProvider?.price),
    [selectedProvider]
  );

  const minimumHoursRequired = React.useMemo(() => {
    if (selectedPricing?.pricingType === "hourly") {
      return Math.max(selectedPricing.minimumHours ?? 2, 1);
    }
    return 1;
  }, [selectedPricing]);

  useEffect(() => {
    if (selectedPricing?.pricingType === "hourly" && hours < minimumHoursRequired) {
      setHours(minimumHoursRequired);
    }
  }, [selectedPricing, minimumHoursRequired, hours]);

  const pricingDetails = React.useMemo(() => {
    const equipmentFee = bringEquipment ? bringEquipmentFee : 0;

    const calculateBreakdown = (baseAmount: number) => {
      const jobSubtotal = baseAmount + equipmentFee;
      const customerFee = jobSubtotal * PLATFORM_FEE_RATE;
      const customerTotal = jobSubtotal + customerFee;
      const providerFee = jobSubtotal * PLATFORM_FEE_RATE;
      const providerNetTotal = jobSubtotal - providerFee;

      const customerDeposit = customerTotal * 0.5;
      const customerRemainder = customerTotal - customerDeposit;
      const providerDeposit = providerNetTotal * 0.5;
      const providerRemainder = providerNetTotal - providerDeposit;

      return {
        baseAmount,
        equipmentFee,
        totalAmount: jobSubtotal,
        depositAmount: customerDeposit,
        remainderAmount: customerRemainder,
        platformFee: providerFee,
        customerFee,
        customerTotal,
        providerNetTotal,
        providerDeposit,
        providerRemainder,
      };
    };

    if (!selectedPricing) {
      return {
        ...calculateBreakdown(0),
        pricingInfo: null as PricingInfo | null,
      };
    }

    let baseAmount = 0;

    if (selectedPricing.pricingType === "hourly" && selectedPricing.hourlyRate) {
      const billableHours = Math.max(hours, minimumHoursRequired);
      baseAmount = selectedPricing.hourlyRate * billableHours * Math.max(people, 1);
    } else if (selectedPricing.pricingType === "flat" && selectedPricing.flatFee) {
      baseAmount = selectedPricing.flatFee;
    }

    return {
      ...calculateBreakdown(baseAmount),
      pricingInfo: selectedPricing,
    };
  }, [selectedPricing, hours, people, bringEquipment, bringEquipmentFee, minimumHoursRequired]);

  const isReadyToBook = Boolean(
    selectedProvider &&
    selectedPricing &&
    pricingDetails.totalAmount > 0 &&
    date &&
    time &&
    selectedServices.length > 0
  );

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

    if (!selectedProvider || !selectedPricing) {
      setIsLoading(false);
      setError("Please choose a pro with published pricing to continue.");
      return;
    }

    if (pricingDetails.totalAmount <= 0) {
      setIsLoading(false);
      setError(
        "Unable to calculate the job total from this pro's pricing. Please adjust your selections or choose a different expert."
      );
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
          amount: pricingDetails.totalAmount,
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
          providerId: selectedProviderId, // Pass selected provider
        }),
      });

      if (!invoiceResponse.ok) {
        throw new Error("Failed to create invoice");
      }

      const invoiceData = await invoiceResponse.json();

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
            Book Seasonal Home Help
          </h1>
          <p className="text-center text-base-content/70 mb-8">
            Secure Kawarthas and GTA pros for snow removal, winter prep, and holiday-ready homes—all with Canadian Stripe payments.
          </p>

          <div className="card shadow-xl max-w-3xl mx-auto bg-slate-100">
            <div className="card-body">
              <h2 className="card-title">Plan Your Seasonal Services</h2>
              <p className="text-base-content/70">
                Pick the fall and winter jobs you want covered
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block mb-2 font-semibold">Choose a local pro</label>
                  <select
                    className="select select-bordered w-full bg-white text-gray-900"
                    value={selectedProviderId}
                    onChange={e => setSelectedProviderId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a pro...</option>
                    {providerOptions.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} • {formatServiceLabel(provider.service)} • {formatProviderPricing(provider.price)}
                      </option>
                    ))}
                  </select>
                  {selectedProvider && (
                    <p className="mt-2 text-sm text-gray-600">
                      {formatProviderPricing(selectedProvider.price)}. ZapTasks collects a {Math.round(PLATFORM_FEE_RATE * 100)}% service fee from the pro payout through Stripe Connect.
                    </p>
                  )}
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
                          Number of Hours (minimum {selectedPricing?.pricingType === "hourly" ? minimumHoursRequired : 1})
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
                          min={selectedPricing?.pricingType === "hourly" ? minimumHoursRequired : 1}
                          value={hours}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            const min = selectedPricing?.pricingType === "hourly" ? minimumHoursRequired : 1;
                            setHours(isNaN(value) ? min : Math.max(min, value));
                          }}
                          onBlur={() => {
                            const min = selectedPricing?.pricingType === "hourly" ? minimumHoursRequired : 1;
                            if (hours < min) setHours(min);
                          }}
                          className="input input-bordered pl-10 w-full text-gray-900"
                          required
                        />
                      </div>
                      {selectedPricing?.pricingType === "hourly" && hours < minimumHoursRequired && (
                        <label className="label">
                          <span className="label-text-alt text-error">
                            Minimum {minimumHoursRequired} hours required
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

                {/* Pricing summary and submit */}
                <div className="mt-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Service subtotal</span>
                      <span className="font-semibold">{formatCurrency(pricingDetails.baseAmount)}</span>
                    </div>
                    {pricingDetails.equipmentFee > 0 && (
                      <div className="flex justify-between">
                        <span>Equipment & supplies</span>
                        <span className="font-semibold">{formatCurrency(pricingDetails.equipmentFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>ZapTasks service fee (homeowner 10%)</span>
                      <span className="font-semibold">{formatCurrency(pricingDetails.customerFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                      <span>Total due from homeowner</span>
                      <span>{formatCurrency(pricingDetails.customerTotal)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-200 border border-slate-300 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Due today (50% deposit inc. fees)</span>
                      <span>{formatCurrency(pricingDetails.depositAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due after completion (inc. fees)</span>
                      <span>{formatCurrency(pricingDetails.remainderAmount)}</span>
                    </div>
                    <p className="text-xs text-gray-600 pt-2">
                      ZapTasks routes payments through Stripe Connect and retains a {Math.round(PLATFORM_FEE_RATE * 100)}% service fee from both the pro payout and homeowner transaction.
                    </p>
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
                      disabled={!agreeToTerms || !isReadyToBook || isLoading}
                    >
                      {isLoading ? "Processing..." : "Proceed to Payment"}
                    </button>
                  )}
                  {!selectedProvider && (
                    <p className="text-xs text-error">
                      Select a pro to unlock pricing and the booking button.
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
