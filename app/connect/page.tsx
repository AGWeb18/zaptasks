"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/NavBar";

interface StripeAccountStatus {
  id: string;
  email: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

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

// Demo page showing how to onboard, create products, and share a storefront.
export default function ConnectDemoPage() {
  const [email, setEmail] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [errors, setErrors] = useState<string | null>(null);

  const appendMessage = useCallback((message: string) => {
    setMessages((prev) => [message, ...prev].slice(0, 5));
  }, []);

  const fetchAccountStatus = useCallback(async (accountId: string) => {
    setStatusLoading(true);
    setErrors(null);
    try {
      const response = await fetch(`/api/connect/accounts/${accountId}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to load account status");
      }
      const payload = await response.json();
      setAccountStatus(payload);
      appendMessage(`Account status refreshed at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error(error);
      setErrors(error instanceof Error ? error.message : "Failed to load account status");
    } finally {
      setStatusLoading(false);
    }
  }, [appendMessage]);

  const fetchProducts = useCallback(async (accountId: string) => {
    setProductLoading(true);
    setErrors(null);
    try {
      const response = await fetch(`/api/connect/accounts/${accountId}/products`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to load products");
      }
      const payload = await response.json();
      setProducts(payload.products ?? []);
    } catch (error) {
      console.error(error);
      setErrors(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setProductLoading(false);
    }
  }, []);

  const createAccount = async () => {
    setErrors(null);
    try {
      const response = await fetch("/api/connect/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to create connected account");
      }

      const payload = await response.json();
      setSelectedAccountId(payload.accountId);
      appendMessage(`Created connected account ${payload.accountId}`);
      await fetchAccountStatus(payload.accountId);
      await fetchProducts(payload.accountId);
    } catch (error) {
      console.error(error);
      setErrors(error instanceof Error ? error.message : "Failed to create account");
    }
  };

  const startOnboarding = async () => {
    setErrors(null);
    try {
      const response = await fetch(`/api/connect/accounts/${selectedAccountId}/onboarding-link`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to start onboarding");
      }

      const payload = await response.json();
      window.location.href = payload.url as string;
    } catch (error) {
      console.error(error);
      setErrors(error instanceof Error ? error.message : "Failed to create onboarding link");
    }
  };

  const createProduct = async (formData: FormData) => {
    setErrors(null);
    try {
      const name = String(formData.get("name") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const price = Number(formData.get("price"));
      const currency = String(formData.get("currency") ?? "cad").trim().toLowerCase();

      const response = await fetch(`/api/connect/accounts/${selectedAccountId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, price, currency }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to create product");
      }

      appendMessage(`Created ${name} on account ${selectedAccountId}`);
      await fetchProducts(selectedAccountId);
    } catch (error) {
      console.error(error);
      setErrors(error instanceof Error ? error.message : "Failed to create product");
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const accountIdFromQuery = url.searchParams.get("accountId");
    if (accountIdFromQuery) {
      setSelectedAccountId(accountIdFromQuery);
    }
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    void fetchAccountStatus(selectedAccountId);
    void fetchProducts(selectedAccountId);
  }, [selectedAccountId, fetchAccountStatus, fetchProducts]);

  const storeHref = useMemo(() =>
    selectedAccountId ? `/connect/${selectedAccountId}` : null,
  [selectedAccountId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex flex-col gap-6 max-w-4xl">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold text-blue-700">Stripe Connect demo</h1>
          <p className="text-sm text-slate-600">
            Onboard a connected account, add products, then share a storefront that runs on Stripe Checkout.
          </p>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">1. Create a connected account</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 text-sm">
              <span className="block font-medium text-slate-700 mb-1">Contact email (optional)</span>
              <input
                className="input input-bordered w-full"
                placeholder="person@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="btn btn-primary text-white" onClick={createAccount}>
              Create account
            </button>
          </div>
          {selectedAccountId && (
            <p className="text-xs text-slate-500">
              Connected account id: <code className="font-mono">{selectedAccountId}</code>. Store this in your database for real integrations.
            </p>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">2. Check onboarding status</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 text-sm">
              <span className="block font-medium text-slate-700 mb-1">Connected account id</span>
              <input
                className="input input-bordered w-full"
                placeholder="acct_..."
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value.trim())}
              />
            </label>
            <div className="flex gap-2 items-end">
              <button
                className="btn btn-outline"
                disabled={!selectedAccountId || statusLoading}
                onClick={() => fetchAccountStatus(selectedAccountId)}
              >
                {statusLoading ? "Refreshing..." : "Refresh status"}
              </button>
              <button
                className="btn btn-primary text-white"
                disabled={!selectedAccountId}
                onClick={startOnboarding}
              >
                Onboard to collect payments
              </button>
            </div>
          </div>
          {accountStatus && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                <dt className="font-semibold">Email</dt>
                <dd>{accountStatus.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Details submitted</dt>
                <dd>{accountStatus.detailsSubmitted ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Charges enabled</dt>
                <dd>{accountStatus.chargesEnabled ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Payouts enabled</dt>
                <dd>{accountStatus.payoutsEnabled ? "Yes" : "No"}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">3. Create products for the connected account</h2>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!selectedAccountId) {
                setErrors("Select or create an account first");
                return;
              }
              const formData = new FormData(event.currentTarget);
              await createProduct(formData);
              event.currentTarget.reset();
            }}
          >
            <label className="text-sm">
              <span className="block font-medium text-slate-700 mb-1">Product name</span>
              <input name="name" className="input input-bordered w-full" placeholder="Snow shoveling" required />
            </label>
            <label className="text-sm">
              <span className="block font-medium text-slate-700 mb-1">Price (CAD)</span>
              <input name="price" type="number" min="1" step="0.01" className="input input-bordered w-full" placeholder="50" required />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block font-medium text-slate-700 mb-1">Description</span>
              <textarea name="description" className="textarea textarea-bordered w-full" rows={3} placeholder="One-off snow removal job"></textarea>
            </label>
            <label className="text-sm">
              <span className="block font-medium text-slate-700 mb-1">Currency</span>
              <input name="currency" defaultValue="cad" className="input input-bordered w-full" />
            </label>
            <div className="flex items-end">
              <button className="btn btn-primary text-white" type="submit" disabled={!selectedAccountId}>
                Create product
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Products</h3>
            {productLoading ? (
              <p className="text-xs text-slate-500">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="text-xs text-slate-500">No products yet. Add one above to populate the storefront.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((product) => (
                  <li key={product.id} className="border border-slate-200 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500 min-h-[2rem]">
                      {product.description || "No description provided."}
                    </p>
                    <p className="text-sm text-blue-700 font-semibold">
                      {currencyFormatter(product.default_price?.unit_amount ?? null, product.default_price?.currency)}
                    </p>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="btn btn-xs btn-outline"
                      >
                        View storefront
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {storeHref && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Share your storefront</h2>
            <p className="text-sm text-slate-600">
              Customers can browse products and pay using Stripe Checkout. For this demo we expose the account id in the URL;
              in production, use a human-friendly slug instead of the raw Stripe identifier.
            </p>
            <Link href={storeHref} className="btn btn-outline w-fit">
              Open storefront
            </Link>
          </section>
        )}

        {(messages.length > 0 || errors) && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-sm">
            <h2 className="text-lg font-semibold text-slate-900">Activity log</h2>
            {errors && <p className="text-error">{errors}</p>}
            <ul className="space-y-1 text-slate-600">
              {messages.map((message, index) => (
                <li key={`${message}-${index}`} className="text-xs">• {message}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
