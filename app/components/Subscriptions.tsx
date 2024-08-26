"use client";

import React, { useState } from "react";
import { Package2, ChevronDown, ChevronUp } from "lucide-react";
import SubscriptionButton from "./SubscriptionButton";

interface ServicePackage {
  id: number;
  name: string;
  price: string;
  description: string;
  services: string[];
  estimatedTime: string;
  optimizedRate: string;
  stripeLink: string; // Add this line
}

interface AddOn {
  name: string;
  price: string;
  duration: string;
}

const packages: ServicePackage[] = [
  {
    id: 1,
    name: "Efficient Lawn Care Package",
    price: "$180-$250",
    description:
      "Keep your lawn looking pristine with our efficient mowing and maintenance service.",
    services: [
      "Lawn mowing and edging (2x per month)",
      "Leaf blowing and debris removal (2x per month)",
    ],
    estimatedTime: "2-3 hours per visit",
    optimizedRate: "$60-$83 per hour",
    stripeLink: "https://buy.stripe.com/4gwcMRbIhcC92Iw7ss", // Add your actual Stripe link here
  },
  {
    id: 2,
    name: "Home Cleaning Essentials",
    price: "$160-$220",
    description: "Maintain a spotless home with our regular cleaning service.",
    services: [
      "Dusting and vacuuming all rooms",
      "Bathroom and kitchen deep clean",
      "Mopping of all hard floors",
      "Changing bed linens (1x per month)",
    ],
    estimatedTime: "3-4 hours per visit",
    optimizedRate: "$53-$55 per hour",
    stripeLink: "https://buy.stripe.com/8wM149dQp9pX3MAaEF", // Add your actual Stripe link here
  },
  {
    id: 3,
    name: "Handyman Maintenance Plan",
    price: "$200-$300",
    description:
      "Keep your home in top shape with regular maintenance and repairs.",
    services: [
      "Minor repairs and touch-ups",
      "Seasonal Tasks (Christmas Lights)",
      "Changing Light Bulbs/Furnace Filters/Air Purifiers",
    ],
    estimatedTime: "4-6 hours per month",
    optimizedRate: "$50-$50 per hour",
    stripeLink: "https://buy.stripe.com/7sIfZ3h2Bau12Iw4gi", // Add your actual Stripe link here
  },
];

const addOns: AddOn[] = [
  { name: "Deep cleaning", price: "$120", duration: "3 hours" },
  {
    name: "Handyman services",
    price: "$80 per hour",
    duration: "2-hour minimum",
  },
  { name: "Organization projects", price: "$100", duration: "2 hours" },
  { name: "Car detailing", price: "$150", duration: "2.5 hours" },
];

export default function ServicePackages() {
  const [expandedPackage, setExpandedPackage] = useState<number | null>(null);

  const togglePackage = (id: number) => {
    setExpandedPackage(expandedPackage === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
        ZapTasks Service Packages
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {pkg.name}
                </h2>
                <Package2 className="text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4">{pkg.description}</p>
              <p className="text-2xl font-bold text-blue-600 mb-4">
                {pkg.price}
                <span className="text-sm font-normal text-gray-500">
                  {" "}
                  / month
                </span>
              </p>
              <button
                onClick={() => togglePackage(pkg.id)}
                className="flex items-center justify-between w-full text-blue-500 hover:text-blue-700"
              >
                {expandedPackage === pkg.id ? "Hide details" : "Show details"}
                {expandedPackage === pkg.id ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            {expandedPackage === pkg.id && (
              <div className="px-6 pb-6">
                <ul className="list-disc list-inside mb-4">
                  {pkg.services.map((service, index) => (
                    <li key={index} className="text-gray-600">
                      {service}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-500">
                  Estimated time: {pkg.estimatedTime}
                </p>
                <p className="text-sm text-gray-500">
                  Optimized rate: {pkg.optimizedRate}
                </p>
              </div>
            )}
            <div className="px-6 pb-6">
              <SubscriptionButton stripeLink={pkg.stripeLink} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 mb-12 text-center">
        <p className="text-gray-600">
          All prices and time estimates are approximations and may vary based on
          location, property size, and specific client needs.
        </p>
        <p className="text-gray-600 mt-2">
          Package customization is available for an additional fee.
        </p>
      </div>
    </div>
  );
}
