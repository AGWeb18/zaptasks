"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/NavBar";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "@/app/components/CheckoutForm";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  FileText,
  PlusCircle,
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
  lines: Array<{
    description: string;
    amount: number;
  }>;
  rating: number | null;
}

const ManageBookings: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
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
  }, []);

  const toggleInvoice = (invoiceId: string) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  const handleRating = async (invoiceId: string, rating: number) => {
    try {
      const response = await fetch("/api/rate-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId, rating }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit rating");
      }

      setInvoices(
        invoices.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, rating } : invoice
        )
      );
    } catch (err) {
      console.error("Error submitting rating:", err);
      // You might want to show an error message to the user here
    }
  };

  const RatingStars = ({
    invoiceId,
    currentRating,
  }: {
    invoiceId: string;
    currentRating: number | null;
  }) => {
    return (
      <div className="flex items-center mt-4">
        <span className="mr-2">Rate your experience:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRating(invoiceId, star)}
            className={`btn btn-ghost btn-sm p-0 mr-1 ${
              currentRating && star <= currentRating
                ? "text-yellow-500"
                : "text-gray-300"
            }`}
          >
            <Star
              fill={
                currentRating && star <= currentRating ? "currentColor" : "none"
              }
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-200">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">
          Manage Your Invoices
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="alert alert-error max-w-md">
              <XCircle className="stroke-current shrink-0 h-6 w-6" />
              <span>{error}</span>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No Invoices Found
            </h2>
            <p className="text-gray-500 mb-6">
              You currently have no unpaid invoices.
            </p>
            <Link href="/booking" className="btn btn-primary">
              <PlusCircle className="mr-2 h-5 w-5" />
              Book a New Service
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="card bg-white shadow-xl">
                <div className="card-body">
                  <div className="flex justify-between items-center">
                    <h2 className="card-title text-2xl">
                      Invoice for {new Date(invoice.date).toLocaleDateString()}
                    </h2>
                    <button
                      onClick={() => toggleInvoice(invoice.id)}
                      className="btn btn-circle btn-ghost"
                    >
                      {expandedInvoice === invoice.id ? (
                        <ChevronUp size={24} />
                      ) : (
                        <ChevronDown size={24} />
                      )}
                    </button>
                  </div>
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
                    {invoice.lines.map((line, index) => (
                      <span key={index} className="badge badge-primary">
                        {line.description}: ${(line.amount / 100).toFixed(2)}
                      </span>
                    ))}
                  </div>
                  <RatingStars
                    invoiceId={invoice.id}
                    currentRating={invoice.rating}
                  />
                  {expandedInvoice === invoice.id && (
                    <>
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
                        <div className="alert alert-warning mt-4">
                          <span>
                            Payment method not available for this invoice.
                          </span>
                        </div>
                      )}
                    </>
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
