"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/NavBar";

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  default_price?: {
    id: string;
    unit_amount: number | null;
    currency: string | null;
  } | null;
}

const currencyFormatter = (amountCents: number | null | undefined, currency?: string | null) => {
  if (!amountCents || !currency) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
};

export default function StorefrontPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params?.accountId ?? "";
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!accountId) return;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/connect/accounts/${accountId}/products`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to load products for this account");
        }
        const payload = await response.json();
        setProducts(payload.products ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [accountId]);

  const beginCheckout = async (product: StripeProduct) => {
    if (!accountId) {
      setError("Missing account id in URL.");
      return;
    }

    if (!product.default_price?.id || !product.default_price.unit_amount) {
      setError("Product is missing default price information.");
      return;
    }

    setProcessingProductId(product.id);
    setError(null);
    try {
      const response = await fetch(`/api/connect/accounts/${accountId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: product.default_price.id,
          quantity: 1,
          unitAmount: product.default_price.unit_amount,
          productName: product.name,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to start checkout");
      }

      const payload = await response.json();
      window.location.href = payload.url as string;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setProcessingProductId(null);
    }
  };

  const canceled = searchParams?.get("canceled");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/40 text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex flex-col gap-6 max-w-4xl">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-blue-700">Neighbourhood storefront</h1>
          <p className="text-sm text-slate-600">
            Showing products for account <code className="font-mono">{accountId}</code>. In production, expose a friendly slug instead of the raw Stripe id.
          </p>
          <Link href="/connect" className="text-xs text-blue-500 underline">
        Back to Connect demo
      </Link>
        </header>

        {canceled && (
          <div className="alert alert-warning text-sm">
            Checkout was cancelled. Choose another product to try again.
          </div>
        )}

        {error && (
          <div className="alert alert-error text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-600">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-600">
            This connected account hasn&apos;t published any products yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <li key={product.id} className="border border-slate-200 rounded-xl bg-white shadow-sm p-5 space-y-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
                  <p className="text-sm text-slate-600 min-h-[2.5rem]">
                    {product.description ?? "No description yet."}
                  </p>
                </div>
                <p className="text-lg font-semibold text-blue-700">
                  {currencyFormatter(product.default_price?.unit_amount ?? null, product.default_price?.currency)}
                </p>
                <button
                  className="btn btn-primary text-white"
                  disabled={processingProductId === product.id}
                  onClick={() => beginCheckout(product)}
                >
                  {processingProductId === product.id ? "Processing…" : "Buy now"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
