"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/NavBar";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "@/app/components/CheckoutForm";
import {
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  date: string;
  services: string[];
  paymentIntentClientSecret: string | null;
}

const ManageBookings: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!isSignedIn) return;
      try {
        const response = await fetch("/api/get-unpaid-remainder-invoices");
        if (!response.ok) {
          throw new Error("Failed to fetch invoices");
        }
        const data = await response.json();
        setInvoices(data.invoices);
      } catch (err) {
        setError("Failed to load invoices. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [isSignedIn]);

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="alert alert-error">
          <XCircle className="stroke-current shrink-0 h-6 w-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Manage Your Invoices
        </h1>
        {invoices.length === 0 ? (
          <div className="text-center">
            <p className="text-xl">You have no unpaid invoices.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4">
                    Invoice for {new Date(invoice.date).toLocaleDateString()}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Calendar className="mr-2" />
                      <span>{new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-2" />
                      <span>
                        Amount: ${(invoice.amount / 100).toFixed(2)}{" "}
                        {invoice.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="divider"></div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {invoice.services.map((service, index) => (
                      <span key={index} className="badge badge-primary">
                        {service}
                      </span>
                    ))}
                  </div>
                  {invoice.paymentIntentClientSecret ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: invoice.paymentIntentClientSecret,
                      }}
                    >
                      <CheckoutForm
                        depositAmount={invoice.amount}
                        remainingAmount={0}
                        invoiceId={invoice.id}
                        clientSecret={invoice.paymentIntentClientSecret}
                        depositIntentId={invoice.id}
                      />
                    </Elements>
                  ) : (
                    <div className="alert alert-warning">
                      <span>
                        Payment method not available for this invoice.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBookings;
