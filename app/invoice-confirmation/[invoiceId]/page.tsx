"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/NavBar";
import {
  FileText,
  Calendar,
  Clock,
  Users,
  MapPin,
  HammerIcon,
  AlertCircle,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "../../components/CheckoutForm";

interface InvoiceData {
  id: string;
  amount_due: number;
  status: string;
  hosted_invoice_url: string;
  currency: string;
  payment_intent: {
    id: string;
    client_secret: string;
  } | null;
  metadata: {
    services: string;
    date: string;
    time: string;
    hours: string;
    people: string;
    description: string;
    address: string;
    bringEquipment: string;
    totalAmount: string;
    depositAmount: string;
    remainingAmount: string;
  };
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function InvoiceConfirmation() {
  const params = useParams();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStripeElements, setShowStripeElements] = useState(false);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      console.log("Fetching invoice data...");
      try {
        if (params.invoiceId) {
          console.log("Invoice ID:", params.invoiceId);
          const response = await fetch(`/api/get-invoice/${params.invoiceId}`);
          console.log("API Response status:", response.status);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch invoice data: ${response.statusText}`
            );
          }
          const data = await response.json();
          console.log("Received invoice data:", JSON.stringify(data, null, 2));
          setInvoiceData({
            ...data.invoice,
            payment_intent: data.paymentIntent,
          });
        } else {
          throw new Error("No invoice ID provided");
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    };

    fetchInvoiceData();

    // Cleanup function
    return () => {
      setShowStripeElements(false);
    };
  }, [params.invoiceId]);

  useEffect(() => {
    if (invoiceData && !loading && !error) {
      setShowStripeElements(true);
    }
  }, [invoiceData, loading, error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="ml-2">Loading invoice data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="alert alert-error shadow-lg">
          <AlertCircle />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="alert alert-warning shadow-lg">
          <AlertCircle />
          <span>No invoice data found.</span>
        </div>
      </div>
    );
  }

  console.log("Rendering invoice data:", invoiceData);

  const totalAmount = Number(invoiceData.metadata.totalAmount) / 100;
  const depositAmount = Number(invoiceData.metadata.depositAmount) / 100;
  const remainingAmount = Number(invoiceData.metadata.remainingAmount) / 100;

  const isDepositPaid = invoiceData.status === "paid";
  const isRemainderPaid = invoiceData.status === "paid";

  // Update how you access the client secret
  const depositOptions = invoiceData?.payment_intent?.client_secret
    ? {
        clientSecret: invoiceData.payment_intent.client_secret,
        appearance: { theme: "stripe" as const },
      }
    : null;
  console.log("invoiceData:", invoiceData);
  console.log("invoiceData.payment_intent:", invoiceData?.payment_intent);
  console.log("client_secret:", invoiceData?.payment_intent?.client_secret);
  console.log("depositOptions:", depositOptions);

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-primary">
              Invoice Confirmation
            </h1>
            <p className="text-xl mt-2">Thank you for your booking!</p>
          </div>

          <div className="bg-base-100 shadow-xl rounded-box p-8">
            <h2 className="text-3xl font-semibold mb-6 text-primary">
              Invoice Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <FileText className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Total Amount:</p>
                  <p>
                    ${totalAmount.toFixed(2)}{" "}
                    {invoiceData.currency.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Date:</p>
                  <p>{invoiceData.metadata.date}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Time:</p>
                  <p>{invoiceData.metadata.time}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Number of People:</p>
                  <p>{invoiceData.metadata.people}</p>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Address:</p>
                  <p>{invoiceData.metadata.address}</p>
                </div>
              </div>
              <div className="flex items-center">
                <HammerIcon className="mr-2 text-primary" />
                <div>
                  <p className="font-semibold">Equipment Provided:</p>
                  <p>
                    {invoiceData.metadata.bringEquipment === "Yes"
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-2">Services</h3>
              <div className="flex flex-wrap gap-2">
                {JSON.parse(invoiceData.metadata.services).map(
                  (service: string, index: number) => (
                    <span key={index} className="badge badge-primary">
                      {service}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-2">Description</h3>
              <p className="bg-base-200 p-4 rounded-lg">
                {invoiceData.metadata.description}
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Payment Status</h3>
              <div className="space-y-4">
                <div
                  className={`alert ${
                    isDepositPaid ? "alert-success" : "alert-warning"
                  }`}
                >
                  <div>
                    <h4 className="font-bold">Deposit Invoice</h4>
                    <p>
                      Amount: ${depositAmount.toFixed(2)}{" "}
                      {invoiceData.currency.toUpperCase()}
                    </p>
                    <p>Status: {isDepositPaid ? "Paid" : "Unpaid"}</p>
                  </div>
                </div>

                <div>
                  {depositOptions ? (
                    showStripeElements ? (
                      <div className="mt-2">
                        <Elements
                          stripe={stripePromise}
                          options={depositOptions}
                        >
                          <CheckoutForm
                            depositAmount={depositAmount * 100}
                            remainingAmount={remainingAmount * 100}
                            invoiceId={invoiceData.id}
                            clientSecret={depositOptions.clientSecret}
                            depositIntentId={
                              invoiceData.payment_intent?.id || ""
                            }
                          />
                        </Elements>
                      </div>
                    ) : (
                      <p>Stripe elements are not ready to be shown.</p>
                    )
                  ) : (
                    <p>Deposit options are not available.</p>
                  )}
                </div>

                <div
                  className={`alert ${
                    isRemainderPaid ? "alert-success" : "alert-info"
                  }`}
                >
                  <div>
                    <h4 className="font-bold">Remainder Invoice</h4>
                    <p>
                      Amount: ${remainingAmount.toFixed(2)}{" "}
                      {invoiceData.currency.toUpperCase()}
                    </p>
                    <p>
                      Status:{" "}
                      {isRemainderPaid ? "Paid" : "Pending (Due after service)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="link link-primary text-lg">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
