"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import { format } from "date-fns";
import { AlertTriangle, DollarSign, Briefcase, TrendingUp } from "lucide-react";

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

interface Payment {
  id: string;
  job_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  status: string;
  payment_type: string;
  created_at: string;
  jobs: { job_requests: { job_title: string } } | null;
}

interface StalledJob {
  id: string;
  job_status: string;
  created_at: string;
  job_request_id: string | null;
  job_requests: { job_title: string; homeowner_name: string } | null;
}

interface AdminStats {
  statusCounts: Record<string, number>;
  stalledJobs: StalledJob[];
  recentPayments: Payment[];
  revenueByMonth: Record<string, number>;
  totalRevenueCents: number;
  totalJobs: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  awaiting_provider_onboarding: "Awaiting Onboarding",
  awaiting_escrow: "Awaiting Payment",
  in_progress: "In Progress",
  awaiting_completion_confirmation: "Awaiting Completion",
  completed: "Completed",
  reserve_hold: "Reserve Hold",
  disputed: "Disputed",
  canceled: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-ghost",
  awaiting_provider_onboarding: "badge-warning",
  awaiting_escrow: "badge-warning",
  in_progress: "badge-info",
  awaiting_completion_confirmation: "badge-info",
  completed: "badge-success",
  reserve_hold: "badge-success",
  disputed: "badge-error",
  canceled: "badge-ghost",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  succeeded: "badge-success",
  requires_payment_method: "badge-warning",
  requires_capture: "badge-info",
  canceled: "badge-ghost",
  refunded: "badge-error",
};

type Tab = "overview" | "payments" | "disputes";

export default function AdminDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, disputesRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/disputes"),
      ]);

      if (statsRes.status === 401 || disputesRes.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!statsRes.ok || !disputesRes.ok) {
        throw new Error("Failed to load admin data");
      }

      const [statsData, disputesData] = await Promise.all([
        statsRes.json(),
        disputesRes.json(),
      ]);

      setStats(statsData);
      setDisputes(disputesData.disputes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchAll();
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
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error resolving dispute");
    } finally {
      setResolvingId(null);
    }
  };

  if (!isLoaded) return <div className="p-10">Loading...</div>;
  if (!isSignedIn) return <div className="p-10">Please sign in.</div>;
  if (!loading && error === "Unauthorized") return <div className="p-10">Access denied.</div>;

  const openDisputeCount = disputes.filter((d) => d.status === "open").length;
  const sortedMonths = stats ? Object.keys(stats.revenueByMonth).sort().reverse() : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-slate-500 mb-8">Platform health overview</p>

        {error && <div className="alert alert-error mb-6">{error}</div>}

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Briefcase className="w-4 h-4" /> Total Jobs
              </div>
              <p className="text-3xl font-bold">{stats.totalJobs}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <DollarSign className="w-4 h-4" /> Total Revenue
              </div>
              <p className="text-3xl font-bold">${(stats.totalRevenueCents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp className="w-4 h-4" /> Active Jobs
              </div>
              <p className="text-3xl font-bold">{stats.statusCounts["in_progress"] ?? 0}</p>
            </div>
            <div className={`rounded-xl border p-5 ${openDisputeCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" /> Open Disputes
              </div>
              <p className={`text-3xl font-bold ${openDisputeCount > 0 ? "text-red-600" : ""}`}>{openDisputeCount}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-bordered mb-6">
          <button className={`tab tab-lg ${activeTab === "overview" ? "tab-active" : ""}`} onClick={() => setActiveTab("overview")}>
            Overview
          </button>
          <button className={`tab tab-lg ${activeTab === "payments" ? "tab-active" : ""}`} onClick={() => setActiveTab("payments")}>
            Payments
          </button>
          <button className={`tab tab-lg ${activeTab === "disputes" ? "tab-active" : ""}`} onClick={() => setActiveTab("disputes")}>
            Disputes {openDisputeCount > 0 && <span className="badge badge-error badge-sm ml-1">{openDisputeCount}</span>}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && stats && (
              <div className="space-y-8">
                {/* Stalled jobs alert */}
                {stats.stalledJobs.length > 0 && (
                  <div className="alert alert-warning">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">{stats.stalledJobs.length} stalled job{stats.stalledJobs.length > 1 ? "s" : ""} — awaiting provider onboarding for 7+ days</p>
                      <ul className="text-sm mt-1 space-y-0.5">
                        {stats.stalledJobs.map((j) => (
                          <li key={j.id}>
                            {j.job_requests?.job_title ?? "Untitled"} — stuck since{" "}
                            {format(new Date(j.created_at), "MMM d, yyyy")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Jobs by status */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Jobs by Status</h2>
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th className="text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.statusCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([status, count]) => (
                          <tr key={status}>
                            <td>
                              <span className={`badge ${STATUS_BADGE[status] ?? "badge-ghost"}`}>
                                {STATUS_LABELS[status] ?? status}
                              </span>
                            </td>
                            <td className="text-right font-mono font-semibold">{count}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Revenue by month */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold mb-4">Revenue by Month (10% platform fee)</h2>
                  {sortedMonths.length === 0 ? (
                    <p className="text-slate-400 text-sm">No completed payments yet.</p>
                  ) : (
                    <table className="table table-sm w-full">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th className="text-right">Platform Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMonths.map((month) => (
                          <tr key={month}>
                            <td className="font-medium">{month}</td>
                            <td className="text-right font-mono font-semibold text-emerald-700">
                              ${(stats.revenueByMonth[month] / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 font-bold">
                          <td>All time</td>
                          <td className="text-right text-emerald-700">${(stats.totalRevenueCents / 100).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && stats && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Payments (last 20)</h2>
                {stats.recentPayments.length === 0 ? (
                  <p className="text-slate-400 text-sm">No payments yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr>
                          <th>Job</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th className="text-right">Amount</th>
                          <th className="text-right">Platform Fee</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="max-w-[180px] truncate text-sm">
                              {p.jobs?.job_requests?.job_title ?? "—"}
                            </td>
                            <td className="text-sm capitalize">{p.payment_type ?? "—"}</td>
                            <td>
                              <span className={`badge badge-sm ${PAYMENT_STATUS_BADGE[p.status] ?? "badge-ghost"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="text-right font-mono">${(p.amount_cents / 100).toFixed(2)}</td>
                            <td className="text-right font-mono text-emerald-700">${(p.platform_fee_cents / 100).toFixed(2)}</td>
                            <td className="text-sm text-slate-500">
                              {p.created_at ? format(new Date(p.created_at), "MMM d") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* DISPUTES TAB */}
            {activeTab === "disputes" && (
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
                    No disputes found.
                  </div>
                ) : (
                  disputes.map((dispute) => (
                    <div key={dispute.id} className="bg-white rounded-xl border border-slate-200 p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold">{dispute.jobs?.job_requests?.job_title || "Job"}</h2>
                          <p className="text-sm text-slate-500">
                            ID: {dispute.id} &bull; {format(new Date(dispute.created_at), "PPp")}
                          </p>
                          <p className="mt-2 font-semibold">
                            Status:{" "}
                            <span className={`badge ${dispute.status === "open" ? "badge-error" : "badge-success"}`}>
                              {dispute.status}
                            </span>
                          </p>
                          <div className="mt-4 bg-slate-100 p-3 rounded">
                            <p className="font-bold text-sm">Reason:</p>
                            <p>{dispute.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            Total: ${(dispute.jobs?.total_amount_cents / 100).toFixed(2)}
                          </p>
                          <p className="text-sm">{dispute.jobs?.job_requests?.homeowner_name}</p>
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
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
