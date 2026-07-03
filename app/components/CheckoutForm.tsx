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
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/payment-success/${invoiceId}`,
      },
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "An unknown error occurred");
      setIsProcessing(false);
    } else {
      router.push(`/payment-success/${invoiceId}`);
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
          {isProcessing ? "Processing..." : `Pay $${depositAmount / 100}`}
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
