"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import { format } from "date-fns";

interface Dispute {
  id: string;
  job_id: string;
  status: string;
  reason: string;
  resolution: string | null;
  created_at: string;
  jobs: {
    total_amount_cents: number;
    job_requests: {
      job_title: string;
      homeowner_name: string;
    };
    payments: Array<{
      id: string;
      amount_cents: number;
      status: string;
      payment_type: string;
    }>;
  };
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/disputes");
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        throw new Error("Failed to load disputes");
      }
      const data = await res.json();
      setDisputes(data.disputes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDisputes();
    }
  }, [isLoaded, isSignedIn]);

  const handleResolve = async (
    disputeId: string,
    resolution: "release" | "refund" | "partial_refund",
    partialAmount?: number
  ) => {
    if (!window.confirm(`Are you sure you want to ${resolution} funds?`)) return;

    setResolvingId(disputeId);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          partialRefundCents: partialAmount ? Math.round(partialAmount * 100) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resolve");
      }

      alert("Dispute resolved successfully");
      fetchDisputes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error resolving dispute");
    } finally {
      setResolvingId(null);
    }
  };

  if (!isLoaded) return <div className="p-10">Loading...</div>;
  if (!isSignedIn) return <div className="p-10">Please sign in.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard: Disputes</h1>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {loading ? (
          <div>Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div>No disputes found.</div>
        ) : (
          <div className="grid gap-6">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="card bg-white shadow border p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{dispute.jobs?.job_requests?.job_title || "Job"}</h2>
                    <p className="text-sm text-slate-500">
                      Dispute ID: {dispute.id} • Created: {format(new Date(dispute.created_at), "PPp")}
                    </p>
                    <p className="mt-2 font-semibold">Status: <span className={`badge ${dispute.status === 'open' ? 'badge-error' : 'badge-success'}`}>{dispute.status}</span></p>
                    <div className="mt-4 bg-slate-100 p-3 rounded">
                      <p className="font-bold text-sm">Reason:</p>
                      <p>{dispute.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">Total: ${(dispute.jobs?.total_amount_cents / 100).toFixed(2)}</p>
                    <p className="text-sm">Homeowner: {dispute.jobs?.job_requests?.homeowner_name}</p>
                  </div>
                </div>

                {dispute.status === "open" && (
                  <div className="mt-6 border-t pt-4 flex gap-3 justify-end">
                    <button
                      className="btn btn-success btn-sm"
                      disabled={!!resolvingId}
                      onClick={() => handleResolve(dispute.id, "release")}
                    >
                      Release to Provider
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      disabled={!!resolvingId}
                      onClick={() => handleResolve(dispute.id, "refund")}
                    >
                      Full Refund to Homeowner
                    </button>
                  </div>
                )}

                {dispute.resolution && (
                  <div className="mt-4 text-sm text-slate-600">
                    Resolved: {dispute.resolution}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
