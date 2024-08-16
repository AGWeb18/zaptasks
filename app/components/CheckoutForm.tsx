import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

interface CheckoutFormProps {
  depositAmount: number;
  remainingAmount: number;
  invoiceId: string;
  clientSecret: string;
  depositIntentId: string; // Changed from paymentIntentId
}

export default function CheckoutForm({
  depositAmount,
  remainingAmount,
  invoiceId,
  clientSecret,
  depositIntentId,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "http://localhost:3000",
      },
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "An unknown error occurred");
      setIsProcessing(false);
    } else {
      // Payment succeeded, update the invoice status
      try {
        const response = await fetch("/api/update-invoice-deposit-paid", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceId,
            depositIntentId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update invoice status");
        }

        router.push(`/payment-success/${invoiceId}`);
      } catch (error) {
        console.error("Error updating invoice status:", error);
        setErrorMessage(
          "Payment successful, but there was an error updating the invoice. Please contact support."
        );
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
      <div className="flex justify-center">
        <button
          disabled={isProcessing || !stripe || !elements}
          className="btn btn-lg w-full btn-primary justify-center my-10"
          type="submit"
        >
          {isProcessing
            ? "Processing..."
            : `Pay Deposit $${depositAmount / 100}`}
        </button>
      </div>
      <div className="flex justify-center">
        <p>
          Remaining balance of ${remainingAmount / 100} will be due after
          service completion.
        </p>
      </div>
    </form>
  );
}
