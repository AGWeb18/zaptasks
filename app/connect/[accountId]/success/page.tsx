"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/NavBar";

export default function CheckoutSuccessPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params?.accountId ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-white text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-20 text-center max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-emerald-600">Payment complete</h1>
        <p className="text-sm text-slate-600">
          Thanks for purchasing from this connected account. Stripe has recorded the charge and the platform fee.
        </p>
        <Link href={`/connect/${accountId}`} className="btn btn-primary text-white">
          Back to storefront
        </Link>
      </main>
    </div>
  );
}
