"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/NavBar";
import { CheckCircle, Calendar, Clock, MapPin, FileText } from "lucide-react";
import Confetti from "react-confetti";
interface InvoiceData {
  id: string;
  amount_paid: number;
  currency: string;
  metadata: {
    services: string;
    date: string;
    time: string;
    address: string;
  };
}

const OrderCompletePage: React.FC = () => {
  const router = useRouter();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const invoiceId = localStorage.getItem("lastPaidInvoiceId");
      if (invoiceId) {
        try {
          const response = await fetch(`/api/get-invoice/${invoiceId}`);
          if (response.ok) {
            const data = await response.json();
            setInvoiceData(data.invoice);
          } else {
            console.error("Failed to fetch invoice data");
          }
        } catch (error) {
          console.error("Error fetching invoice data:", error);
        }
      } else {
        router.push("/");
      }
    };

    fetchInvoiceData();

    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!invoiceData) {
    return <div>Loading...</div>;
  }

  const services = JSON.parse(invoiceData.metadata.services);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      {showConfetti && <Confetti />}
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Thank You for Your Order!
              </h1>
              <p className="text-xl text-gray-600">
                Your booking has been confirmed.
              </p>
            </div>

            <div className="border-t border-b border-gray-200 py-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Booking Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    {invoiceData.metadata.date}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    {invoiceData.metadata.time}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    {invoiceData.metadata.address}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    Invoice #{invoiceData.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Services Booked
              </h3>
              <div className="flex flex-wrap gap-2">
                {services.map((service: string, index: number) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 mb-2">
                Total Paid: {(invoiceData.amount_paid / 100).toFixed(2)}{" "}
                {invoiceData.currency.toUpperCase()}
              </p>
              <p className="text-gray-600 mb-6">
                You will receive a confirmation email shortly with all the
                details.
              </p>
              <Link href="/" className="btn btn-primary text-white">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCompletePage;
