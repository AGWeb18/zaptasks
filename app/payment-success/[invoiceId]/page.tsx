import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  CheckCircle,
  DollarSign,
  Calendar,
  Clock,
  Users,
  MapPin,
  HammerIcon,
} from "lucide-react";
import Navbar from "@/app/components/NavBar";
import Script from "next/script";

interface InvoiceData {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  created: number;
  pdf: string;
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

async function getInvoiceData(invoiceId: string): Promise<InvoiceData> {
  const url = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }/api/get-invoice/${invoiceId}`;

  try {
    console.log(`Fetching invoice data from: ${url}`);
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `API responded with status ${response.status}: ${errorText}`
      );
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Successfully fetched invoice data");
    return data;
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch invoice data: ${error.message}`);
    }
    throw new Error("Failed to fetch invoice data: Unknown error");
  }
}

function InvoiceDetails({ invoiceData }: { invoiceData: InvoiceData }) {
  const totalAmount = Number(invoiceData.metadata.totalAmount) / 100;
  const depositAmount = Number(invoiceData.metadata.depositAmount) / 100;
  const remainingAmount = Number(invoiceData.metadata.remainingAmount) / 100;

  return (
    <div className="max-w-3xl mx-auto bg-base-100 shadow-xl rounded-lg p-8">
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-success">
          Deposit Payment Successful!
        </h1>
        <p className="text-xl mt-2">Thank you for your payment.</p>
      </div>

      <div className="divider"></div>

      <h2 className="text-2xl font-semibold mb-4">Invoice Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <FileText className="mr-2 text-primary" />
          <div>
            <p className="font-semibold">Invoice Number:</p>
            <p>{invoiceData.number}</p>
          </div>
        </div>
        <div className="flex items-center">
          <DollarSign className="mr-2 text-primary" />
          <div>
            <p className="font-semibold">Total Amount:</p>
            <p>
              {totalAmount.toFixed(2)} {invoiceData.currency.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <DollarSign className="mr-2 text-success" />
          <div>
            <p className="font-semibold">Deposit Paid:</p>
            <p className="text-success font-bold">
              {depositAmount.toFixed(2)} {invoiceData.currency.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <DollarSign className="mr-2 text-warning" />
          <div>
            <p className="font-semibold">Remaining Balance:</p>
            <p className="text-warning">
              {remainingAmount.toFixed(2)} {invoiceData.currency.toUpperCase()}
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

      <div className="mt-6 flex items-center">
        <HammerIcon className="mr-2 text-primary" />
        <p>
          <span className="font-semibold">Equipment Provided:</span>{" "}
          {invoiceData.metadata.bringEquipment === "Yes" ? "Yes" : "No"}
        </p>
      </div>

      <div className="mt-8 bg-base-200 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Next Steps</h3>
        <ul className="list-disc list-inside">
          <li>
            Our team will contact you to confirm the details of your booking.
          </li>
          <li>
            The remaining balance of {remainingAmount.toFixed(2)}{" "}
            {invoiceData.currency.toUpperCase()} will be due after the service
            is completed.
          </li>
          <li>
            If you need to make any changes or have any questions, please
            contact our customer support.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href={invoiceData.pdf}
          download={`invoice-${invoiceData.number}.pdf`}
          className="btn btn-primary"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Invoice PDF
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="link link-primary">
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export default async function PaymentSuccessPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  try {
    const invoiceData = await getInvoiceData(params.invoiceId);

    return (
      <div className="min-h-screen bg-base-200">
        <Script id="google-analytics" strategy="afterInteractive">
          {`
      gtag('event', 'conversion', {
      'send_to': 'AW-850422848/u9FkCPXW3M0ZEMDYwZUD',
      'transaction_id': ''
  }); 
          `}
        </Script>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Suspense fallback={<div>Loading...</div>}>
            <InvoiceDetails invoiceData={invoiceData} />
          </Suspense>
        </div>
      </div>
    );
  } catch (error: unknown) {
    console.error("Error in PaymentSuccessPage:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{errorMessage}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
}
