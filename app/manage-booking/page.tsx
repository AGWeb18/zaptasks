"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/app/utils/supabase/client";
import { getServiceLabels } from "@/app/lib/services/catalog";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type EscrowTier = "small" | "medium" | "large";

interface EscrowScheduleAmounts {
  escrowCents: number;
  progressCents: number;
  completionCents: number;
  platformFeeTotalCents: number;
  platformFeeEscrowCents: number;
  platformFeeProgressCents: number;
  platformFeeCompletionCents: number;
}

interface EscrowSchedule {
  tier: EscrowTier;
  escrowPercentage: number;
  progressPercentage: number | null;
  completionPercentage: number;
  platformFeeRate: number;
  amounts: EscrowScheduleAmounts;
}

interface EscrowPaymentRecord {
  id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  status: string;
  payment_type: "escrow" | "progress" | "completion";
  created_at: string;
  captured_at: string | null;
}

interface EscrowMilestone {
  id: string;
  label: string;
  percentage: number | null;
  amount_cents: number | null;
  status: string;
}

interface EscrowJob {
  id: string;
  job_request_id: string | null;
  homeowner_id: string;
  provider_id: string;
  total_amount_cents: number;
  escrow_amount_cents: number;
  platform_fee_cents: number;
  platform_fee_rate: number;
  job_status: string;
  milestone_plan: EscrowSchedule | null;
  payments?: EscrowPaymentRecord[];
  job_milestones?: EscrowMilestone[];
}

interface UnsettledPaymentAction {
  type?: "escrow" | "progress" | "completion" | string;
  paymentIntentId?: string | null;
  clientSecret?: string | null;
  amountCents?: number | null;
  status?: string | null;
}

interface PaymentModalState {
  jobId: string;
  paymentType: "escrow" | "progress" | "completion";
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  label: string;
}

const parseEscrowSchedule = (raw: unknown): EscrowSchedule | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EscrowSchedule;
    } catch {
      return null;
    }
  }
  return raw as EscrowSchedule;
};

const formatPaymentStatus = (status: string | null | undefined) => {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "Waiting for card";
    case "requires_action":
      return "Needs your action";
    case "processing":
      return "Processing";
    case "requires_capture":
      return "Ready to release";
    case "succeeded":
      return "Paid";
    case "canceled":
      return "Canceled";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    default:
      return status ?? "Unknown";
  }
};

interface PaymentFormProps {
  modal: PaymentModalState;
  onSuccess: (paymentIntentId: string) => Promise<void>;
  onClose: () => void;
}

const EscrowPaymentForm = ({ modal, onSuccess, onClose }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please try again.");
      return;
    }

    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed. Try again.");
      setProcessing(false);
      return;
    }

    const status = result.paymentIntent?.status;

    if (status === "succeeded" || status === "requires_capture") {
      await onSuccess(result.paymentIntent!.id);
      onClose();
    } else {
      setError(`Payment is ${status}. We’ll keep watching it.`);
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={processing || !stripe || !elements}
        >
          {processing ? "Processing..." : modal.label}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          disabled={processing}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

interface JobApplication {
  id: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_email: string | null;
  message: string | null;
  proposed_rate: number | null;
  proposed_rate_type: string | null;
  status: string;
  created_at: string;
}

interface JobRequest {
  id: string;
  job_title: string;
  services: string[];
  description: string;
  service_date: string | null;
  service_time: string | null;
  hours: number | null;
  people: number | null;
  bring_equipment: boolean;
  address: string | null;
  budget_type: string | null;
  budget_amount: number | null;
  budget_notes: string | null;
  contact_preference: string | null;
  status: string;
  selected_provider_id: string | null;
  selected_provider_name: string | null;
  selected_application_id: string | null;
  agreed_total_amount: number | string | null;
  deposit_amount: number | string | null;
  remainder_amount: number | string | null;
  deposit_invoice_url: string | null;
  remainder_invoice_url: string | null;
  created_at: string;
  job_applications?: JobApplication[];
}

interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

const statusBadgeClasses: Record<string, string> = {
  open: "badge-info",
  awarded: "badge-success",
  completed: "badge-primary",
  cancelled: "badge-ghost",
  disputed: "badge-error",
};

const isCanceledStatus = (status?: string | null): boolean =>
  typeof status === "string" &&
  ["canceled", "cancelled"].includes(status.toLowerCase());

const prettyStatus: Record<string, string> = {
  open: "Open",
  awarded: "Awarded",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const ManageJobsPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] =
    useState<NotificationItem | null>(null);
  const [jobsByRequestId, setJobsByRequestId] = useState<
    Record<string, EscrowJob>
  >({});
  const [jobsById, setJobsById] = useState<Record<string, EscrowJob>>({});
  const [paymentModal, setPaymentModal] = useState<PaymentModalState | null>(
    null
  );
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const fetchJobs = useCallback(async ({ silent } = { silent: false }) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const [requestsResponse, jobsResponse] = await Promise.all([
        fetch("/api/job-requests?scope=mine"),
        fetch("/api/jobs"),
      ]);

      if (!requestsResponse.ok) {
        throw new Error("Failed to load job requests");
      }

      if (!jobsResponse.ok) {
        throw new Error("Failed to load job payment data");
      }

      const requestData = await requestsResponse.json();
      const jobsData = await jobsResponse.json();

      const requestList = Array.isArray(requestData.jobRequests)
        ? (requestData.jobRequests as JobRequest[])
        : [];
      const filteredRequests = requestList.filter(
        (request) => !isCanceledStatus(request.status)
      );

      setJobRequests(filteredRequests);

      const requestMap: Record<string, EscrowJob> = {};
      const jobIdMap: Record<string, EscrowJob> = {};

      const jobsList = Array.isArray(jobsData.jobs)
        ? (jobsData.jobs as EscrowJob[])
        : [];

      if (jobsList.length > 0) {
        for (const rawJob of jobsList) {
          if (isCanceledStatus(rawJob?.job_status)) {
            continue;
          }
          const mappedJob: EscrowJob = {
            ...rawJob,
            milestone_plan: parseEscrowSchedule(rawJob.milestone_plan),
            payments: rawJob.payments ?? [],
            job_milestones: rawJob.job_milestones ?? [],
          };

          if (mappedJob.job_request_id) {
            requestMap[mappedJob.job_request_id] = mappedJob;
          }
          jobIdMap[mappedJob.id] = mappedJob;
        }
      }

      setJobsByRequestId(requestMap);
      setJobsById(jobIdMap);
    } catch (err) {
      console.error(err);
      setError("We couldn’t load your job requests. Please try again.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchJobs();
    }
  }, [isLoaded, isSignedIn, fetchJobs]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-homeowner-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationItem;
          setLatestNotification(notification);

          if (
            notification.type === "job_application_received" ||
            notification.type === "job_application_awarded"
          ) {
            fetchJobs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, isSignedIn, user?.id, fetchJobs]);

  const handleToggleJob = (jobId: string) => {
    setExpandedJob((prev) => (prev === jobId ? null : jobId));
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Delete this job request? This cannot be undone.")) {
      return;
    }

    try {
      setUpdatingJobId(jobId);
      setError(null);

      const response = await fetch("/api/job-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to delete job");
      }

      setJobRequests((prev) => prev.filter((job) => job.id !== jobId));
      setJobsByRequestId((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
      setJobsById((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key]?.job_request_id === jobId) {
            delete next[key];
          }
        }
        return next;
      });
      setExpandedJob((prev) => (prev === jobId ? null : prev));
      setInfoMessage("Job removed. It will no longer appear to providers.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t delete that job. Please try again."
      );
    } finally {
      setUpdatingJobId(null);
    }
  };

  const awardApplication = async (
    jobId: string,
    application: JobApplication
  ) => {
    try {
      setUpdatingJobId(jobId);
      setError(null);
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobRequestId: jobId,
          applicationId: application.id,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error ?? "Failed to create job escrow");
      }

      const payload = await response.json();

      if (payload?.job) {
        const mappedJob: EscrowJob = {
          ...payload.job,
          milestone_plan: parseEscrowSchedule(
            payload.schedule ?? payload.job?.milestone_plan
          ),
          payments: payload.job.payments ?? [],
          job_milestones: payload.job.job_milestones ?? [],
        };

        setJobsByRequestId((prev) =>
          mappedJob.job_request_id
            ? { ...prev, [mappedJob.job_request_id]: mappedJob }
            : prev
        );

        setJobsById((prev) => ({ ...prev, [mappedJob.id]: mappedJob }));
      }

      if (payload?.requiresProviderOnboarding) {
        setInfoMessage(
          "Your provider has been awarded, but they need to finish Stripe payouts before escrow can be funded. We'll alert you as soon as it's ready."
        );
      } else if (
        payload?.schedule?.amounts &&
        payload?.escrowPaymentIntent?.clientSecret
      ) {
        setInfoMessage(
          `Escrow created: hold $${(
            payload.schedule.amounts.escrowCents / 100
          ).toFixed(2)} now, pay the rest when the job is complete.`
        );
      }

      if (payload?.escrowPaymentIntent?.clientSecret) {
        setPaymentModal({
          jobId: payload.job?.id ?? "",
          paymentType: "escrow",
          clientSecret: payload.escrowPaymentIntent.clientSecret,
          paymentIntentId: payload.escrowPaymentIntent.id,
          amountCents: payload.schedule?.amounts?.escrowCents ?? 0,
          label: "Pay Escrow",
        });
      }

      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError("We couldn’t award this application. Please try again.");
    } finally {
      setUpdatingJobId(null);
    }
  };

  const openPaymentIntent = async (
    job: EscrowJob,
    paymentType: "escrow" | "progress" | "completion",
    options?: { milestoneId?: string; label?: string }
  ) => {
    try {
      setUpdatingJobId(job.job_request_id ?? job.id);
      setError(null);

      const response = await fetch("/api/payments/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          paymentType,
          milestoneId: options?.milestoneId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to start payment");
      }

      const payload = await response.json();

      if (!payload?.paymentIntent?.clientSecret) {
        throw new Error("Payment intent was not returned");
      }

      setPaymentModal({
        jobId: job.id,
        paymentType,
        clientSecret: payload.paymentIntent.clientSecret,
        paymentIntentId: payload.paymentIntent.id,
        amountCents: payload.paymentRecord?.amount_cents ?? 0,
        label:
          options?.label ??
          (paymentType === "escrow"
            ? "Pay Escrow"
            : paymentType === "progress"
            ? "Pay Progress"
            : "Pay Remaining"),
      });

      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We couldn’t start that payment."
      );
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleMarkComplete = async (job: EscrowJob) => {
    try {
      setUpdatingJobId(job.job_request_id ?? job.id);
      setError(null);

      const response = await fetch(`/api/jobs/${job.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null);

      if (response.status === 409 && payload?.requiresPaymentActions) {
        const unsettled = Array.isArray(payload.unsettled)
          ? (payload.unsettled as UnsettledPaymentAction[])
          : [];
        const actionable = unsettled.find(
          (item) => item?.clientSecret && item?.type,
        );

        if (actionable) {
          const paymentType = (actionable.type ?? "escrow") as PaymentModalState["paymentType"];
          const payments = jobsById[job.id]?.payments ?? [];
          const matchedPayment = payments.find((payment) =>
            payment.stripe_payment_intent_id === actionable.paymentIntentId,
          );
          if (!actionable.clientSecret) {
            setError("We still need to finish the payment. Please try again in a moment.");
            await fetchJobs({ silent: true });
            return;
          }
          const fallbackAmount = (() => {
            if (paymentType === "completion") {
              return jobsById[job.id]?.milestone_plan?.amounts?.completionCents ?? 0;
            }
            if (paymentType === "progress") {
              return jobsById[job.id]?.milestone_plan?.amounts?.progressCents ?? 0;
            }
            return jobsById[job.id]?.milestone_plan?.amounts?.escrowCents ?? 0;
          })();

          setPaymentModal({
            jobId: job.id,
            paymentType,
            clientSecret: actionable.clientSecret,
            paymentIntentId: actionable.paymentIntentId ?? matchedPayment?.stripe_payment_intent_id ?? "",
            amountCents:
              actionable.amountCents ?? matchedPayment?.amount_cents ?? fallbackAmount,
            label:
              paymentType === "completion"
                ? "Pay Remaining"
                : paymentType === "progress"
                ? "Pay Progress"
                : "Pay Escrow",
          });
        }

        setInfoMessage("We still need to finish your payment before we can wrap up this job.");
        await fetchJobs({ silent: true });
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not complete job");
      }

      setInfoMessage(
        "All payments released to your pro. Thanks for using ZapTasks!"
      );
      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We couldn’t wrap up this job."
      );
    } finally {
      setUpdatingJobId(null);
    }
  };

  const finalizeCompletion = async (jobId: string, paymentIntentId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalPaymentIntentId: paymentIntentId }),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 409 && payload?.requiresPaymentActions) {
        setError("We still need you to confirm the payment. Please try again.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to finalize payment");
      }

      await fetchJobs({ silent: true });
      setInfoMessage("Payment confirmed and escrow released. Thank you!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We couldn’t finalize the payment."
      );
    }
  };

  const handleCancelJob = async (job: EscrowJob) => {
    try {
      setUpdatingJobId(job.job_request_id ?? job.id);
      setError(null);

      const response = await fetch(`/api/jobs/${job.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to cancel job");
      }

      setInfoMessage(
        "Job cancelled and any escrow will be released within 5-10 days."
      );
      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We couldn’t cancel this job."
      );
    } finally {
      setUpdatingJobId(null);
    }
  };

  const submitDispute = async () => {
    if (!disputeJobId || !disputeReason.trim()) {
      setError("Please let us know what happened so we can help.");
      return;
    }

    try {
      setUpdatingJobId(disputeJobId);
      const response = await fetch(`/api/jobs/${disputeJobId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to open dispute");
      }

      setInfoMessage(
        "We’ve logged your dispute. A ZapTasks specialist will reach out within 24 hours."
      );
      setDisputeJobId(null);
      setDisputeReason("");
      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We couldn’t open a dispute."
      );
    } finally {
      setUpdatingJobId(null);
    }
  };

  const groupedJobs = useMemo(() => {
    return {
      active: jobRequests.filter(
        (job) => job.status === "open" || job.status === "awarded"
      ),
      archived: jobRequests.filter(
        (job) => job.status === "completed" || job.status === "cancelled"
      ),
    };
  }, [jobRequests]);

  const latestNotificationMessage = useMemo(() => {
    if (!latestNotification) return null;
    const payload = latestNotification.payload as
      | Record<string, unknown>
      | undefined;
    switch (latestNotification.type) {
      case "job_application_received": {
        const providerName =
          (payload?.providerName as string | undefined) ??
          (payload?.provider_name as string | undefined);
        return `${
          providerName ?? "A local pro"
        } just applied to one of your jobs.`;
      }
      case "job_application_awarded":
        return "Your selected pro has been notified.";
      case "job_awarded_invoices_sent":
        return "Deposit and completion invoices were generated for your awarded job.";
      default:
        return "You have a new update on your job requests.";
    }
  }, [latestNotification]);

  const renderCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return null;
    const numericValue = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numericValue)) return null;
    return numericValue.toFixed(2);
  };

  useEffect(() => {
    if (!latestNotification) return;
    const timer = setTimeout(() => setLatestNotification(null), 6000);
    return () => clearTimeout(timer);
  }, [latestNotification]);

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <section className="max-w-5xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-4xl font-bold text-blue-600 mb-3">
              My Job Requests
            </h1>
            <p className="text-base-content/70">
              Track service requests, review applicant messages, and award jobs
              to your preferred pro.
            </p>
          </header>

          {latestNotificationMessage && (
            <div className="alert alert-info shadow mb-6">
              <Sparkles className="h-5 w-5" />
              <span>{latestNotificationMessage}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error shadow mb-6">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="alert alert-success shadow mb-6">
              <CheckCircle className="h-5 w-5" />
              <span>{infoMessage}</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => setInfoMessage(null)}
              >
                Close
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : jobRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center">
              <Inbox className="w-14 h-14 mx-auto text-blue-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">
                No job requests yet
              </h2>
              <p className="text-base-content/70">
                Post your first job request to start receiving applications from
                trusted local pros.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {(["active", "archived"] as const).map((group) => {
                const jobs = groupedJobs[group];
                if (jobs.length === 0) return null;

                return (
                  <section key={group}>
                    <div className="flex items-center gap-2 mb-4">
                      {group === "active" ? (
                        <Sparkles className="text-blue-500" />
                      ) : (
                        <CheckCircle className="text-slate-400" />
                      )}
                      <h2 className="text-xl font-semibold text-gray-800">
                        {group === "active"
                          ? "Active requests"
                          : "Past requests"}
                      </h2>
                    </div>
                    <div className="grid gap-6">
                      {jobs.map((job) => {
                        const isExpanded = expandedJob === job.id;
                        const badgeClass =
                          statusBadgeClasses[job.status] ?? "badge-ghost";
                        const applications = job.job_applications ?? [];
                        const awardedApplication = applications.find(
                          (app) => app.id === job.selected_application_id
                        );
                        const escrowJob = jobsByRequestId[job.id];
                        const escrowSchedule =
                          escrowJob?.milestone_plan ?? null;
                        const escrowPayment = escrowJob?.payments?.find(
                          (payment) => payment.payment_type === "escrow"
                        );
                        const progressPayment = escrowJob?.payments?.find(
                          (payment) => payment.payment_type === "progress"
                        );
                        const completionPayment = escrowJob?.payments?.find(
                          (payment) => payment.payment_type === "completion"
                        );
                        const activeMilestone = escrowJob?.job_milestones?.find(
                          (milestone) =>
                            milestone.status === "pending" ||
                            milestone.status === "funding_in_progress"
                        );
                        const escrowStatusLabel = formatPaymentStatus(
                          escrowPayment?.status
                        );
                        const progressStatusLabel = formatPaymentStatus(
                          progressPayment?.status
                        );
                        const completionStatusLabel = formatPaymentStatus(
                          completionPayment?.status
                        );
                        const escrowNeedsPayment =
                          !escrowPayment ||
                          [
                            "requires_payment_method",
                            "requires_confirmation",
                            "requires_action",
                            "canceled",
                          ].includes(escrowPayment.status ?? "");
                        const progressNeedsPayment =
                          !!progressPayment &&
                          [
                            "requires_payment_method",
                            "requires_confirmation",
                            "requires_action",
                          ].includes(progressPayment.status ?? "");
                        const completionNeedsPayment =
                          !!completionPayment &&
                          [
                            "requires_payment_method",
                            "requires_confirmation",
                            "requires_action",
                          ].includes(completionPayment.status ?? "");
                        const escrowFundedCents =
                          escrowPayment &&
                          [
                            "succeeded",
                            "requires_capture",
                            "processing",
                          ].includes(escrowPayment.status ?? "")
                            ? escrowPayment.amount_cents
                            : 0;
                        const progressFundedCents =
                          progressPayment &&
                          [
                            "succeeded",
                            "requires_capture",
                            "processing",
                          ].includes(progressPayment.status ?? "")
                            ? progressPayment.amount_cents
                            : 0;
                        const completionFundedCents =
                          completionPayment &&
                          [
                            "succeeded",
                            "requires_capture",
                            "processing",
                          ].includes(completionPayment.status ?? "")
                            ? completionPayment.amount_cents
                            : 0;
                        const escrowFundedLabel =
                          escrowFundedCents > 0
                            ? `$${(escrowFundedCents / 100).toFixed(2)}`
                            : "—";
                        const progressFundedLabel =
                          progressFundedCents > 0
                            ? `$${(progressFundedCents / 100).toFixed(2)}`
                            : "—";
                        const completionFundedLabel =
                          completionFundedCents > 0
                            ? `$${(completionFundedCents / 100).toFixed(2)}`
                            : "—";
                        const plannedRemainingCents = escrowSchedule
                          ? escrowSchedule.amounts.progressCents +
                            escrowSchedule.amounts.completionCents
                          : 0;
                        const plannedRemainingLabel =
                          plannedRemainingCents > 0
                            ? `$${(plannedRemainingCents / 100).toFixed(2)}`
                            : "—";

                        return (
                          <article
                            key={job.id}
                            className="card bg-white shadow-md border border-slate-200"
                          >
                            <div className="card-body">
                              <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-semibold text-gray-900">
                                      {job.job_title}
                                    </h3>
                                    <span
                                      className={`badge ${badgeClass} text-xs uppercase tracking-wide`}
                                    >
                                      {prettyStatus[job.status] ?? job.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-sm text-blue-700 mb-3">
                                    {getServiceLabels(job.services).map(
                                      (label) => (
                                        <span
                                          key={label}
                                          className="badge badge-outline"
                                        >
                                          {label}
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <p className="text-base-content/70 leading-relaxed mb-4">
                                    {job.description}
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-base-content/80">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      <span>
                                        {job.service_date
                                          ? format(
                                              new Date(job.service_date),
                                              "MMM d, yyyy"
                                            )
                                          : "Date flexible"}
                                        {job.service_time
                                          ? ` • ${job.service_time}`
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      <span>
                                        {job.address ??
                                          "Location provided to awarded pro"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {job.hours
                                          ? `${job.hours} hour${
                                              job.hours > 1 ? "s" : ""
                                            }`
                                          : "Hours TBD"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4" />
                                      <span>
                                        {job.people
                                          ? `${job.people} person crew`
                                          : "Crew size flexible"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4" />
                                      <span>
                                        {job.budget_amount
                                          ? `${
                                              job.budget_type === "hourly"
                                                ? "Hourly"
                                                : "Flat"
                                            } • $${job.budget_amount.toFixed(
                                              0
                                            )}`
                                          : "Budget hidden"}
                                      </span>
                                    </div>
                                  </div>

                                  {escrowJob && escrowSchedule && (
                                    <section className="mt-6 border-t border-slate-200 pt-6">
                                      <h4 className="text-lg font-semibold text-slate-800 mb-3">
                                        Payment plan
                                      </h4>
                                      <p className="text-sm text-slate-600 mb-4">
                                        We hold funds in Stripe-powered escrow
                                        so both sides feel safe.
                                      </p>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 border border-blue-100 rounded-lg bg-blue-50 flex flex-col gap-2">
                                          <span className="text-xs uppercase tracking-wide text-blue-600">
                                            Deposit
                                          </span>
                                          <p className="text-2xl font-semibold text-blue-800">
                                            {"$" +
                                              (
                                                escrowSchedule.amounts
                                                  .escrowCents / 100
                                              ).toFixed(2)}
                                          </p>
                                          <p className="text-xs text-blue-700">
                                            Paid so far: {escrowFundedLabel}
                                          </p>
                                          <p className="text-sm text-blue-700">
                                            Status: {escrowStatusLabel}
                                          </p>
                                          {escrowNeedsPayment && (
                                            <button
                                              className="btn btn-sm btn-primary mt-1"
                                              disabled={!stripePromise}
                                              onClick={() =>
                                                openPaymentIntent(
                                                  escrowJob,
                                                  "escrow"
                                                )
                                              }
                                            >
                                              Pay deposit now
                                            </button>
                                          )}
                                          {!escrowNeedsPayment &&
                                            escrowPayment?.status ===
                                              "requires_capture" && (
                                              <p className="text-xs text-blue-700">
                                                Funds secured. Release happens
                                                after completion.
                                              </p>
                                            )}
                                        </div>

                                        {escrowSchedule.amounts.progressCents >
                                          0 && (
                                          <div className="p-4 border border-amber-100 rounded-lg bg-amber-50 flex flex-col gap-2">
                                            <span className="text-xs uppercase tracking-wide text-amber-600">
                                              Progress milestone
                                            </span>
                                            <p className="text-2xl font-semibold text-amber-800">
                                              {"$" +
                                                (
                                                  escrowSchedule.amounts
                                                    .progressCents / 100
                                                ).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-amber-700">
                                              Paid so far: {progressFundedLabel}
                                            </p>
                                            <p className="text-sm text-amber-700">
                                              Status: {progressStatusLabel}
                                            </p>
                                            {(!progressPayment ||
                                              progressNeedsPayment) &&
                                              activeMilestone && (
                                                <button
                                                  className="btn btn-sm btn-warning mt-1"
                                                  disabled={!stripePromise}
                                                  onClick={() =>
                                                    openPaymentIntent(
                                                      escrowJob,
                                                      "progress",
                                                      {
                                                        milestoneId:
                                                          activeMilestone?.id,
                                                        label: "Pay progress",
                                                      }
                                                    )
                                                  }
                                                >
                                                  Pay progress
                                                </button>
                                              )}
                                            {progressPayment?.status ===
                                              "requires_capture" && (
                                              <p className="text-xs text-amber-700">
                                                Progress funds ready to release
                                                when you finish.
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        <div className="p-4 border border-emerald-100 rounded-lg bg-emerald-50 flex flex-col gap-2">
                                          <span className="text-xs uppercase tracking-wide text-emerald-600">
                                            Completion
                                          </span>
                                          <p className="text-2xl font-semibold text-emerald-800">
                                            {"$" +
                                              (
                                                escrowSchedule.amounts
                                                  .completionCents / 100
                                              ).toFixed(2)}
                                          </p>
                                          <p className="text-xs text-emerald-700">
                                            Paid so far: {completionFundedLabel}
                                          </p>
                                          <p className="text-sm text-emerald-700">
                                            Status: {completionStatusLabel}
                                          </p>
                                          {completionNeedsPayment && (
                                            <button
                                              className="btn btn-sm btn-success mt-1"
                                              disabled={!stripePromise}
                                              onClick={() =>
                                                openPaymentIntent(
                                                  escrowJob,
                                                  "completion"
                                                )
                                              }
                                            >
                                              Pay remainder
                                            </button>
                                          )}
                                          {!completionNeedsPayment &&
                                            completionPayment?.status ===
                                              "succeeded" && (
                                              <p className="text-xs text-emerald-700">
                                                Final payment received. Thank
                                                you!
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                      <p className="mt-4 text-xs text-slate-500">
                                        ZapTasks fee (
                                        {(
                                          escrowSchedule.platformFeeRate * 100
                                        ).toFixed(1)}
                                        %) is included automatically. You’ll see
                                        it on the payout summary.
                                      </p>
                                    </section>
                                  )}
                                </div>
                                <div className="flex flex-col items-start gap-2">
                                  {job.status === "open" && (
                                    <button
                                      className="btn btn-sm btn-ghost text-error"
                                      onClick={() => handleDeleteJob(job.id)}
                                      disabled={updatingJobId === job.id}
                                    >
                                      {updatingJobId === job.id
                                        ? "Deleting..."
                                        : "Delete job"}
                                    </button>
                                  )}
                                  {job.status === "awarded" &&
                                    awardedApplication &&
                                    escrowJob && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 text-sm text-blue-700 space-y-2">
                                        <p className="font-semibold flex items-center gap-2">
                                          <Award className="w-4 h-4" /> Awarded
                                          to{" "}
                                          {awardedApplication.provider_name ??
                                            "Selected pro"}
                                        </p>
                                        {renderCurrency(
                                          job.agreed_total_amount
                                        ) && (
                                          <p className="text-xs text-blue-600">
                                            Total budget: $
                                            {renderCurrency(
                                              job.agreed_total_amount
                                            )}{" "}
                                            CAD
                                          </p>
                                        )}
                                        <p className="text-xs text-blue-600">
                                          Escrow status: {escrowStatusLabel} •
                                          Secured so far: {escrowFundedLabel}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            className="btn btn-xs btn-primary"
                                            disabled={
                                              !escrowJob ||
                                              updatingJobId ===
                                                (escrowJob.job_request_id ??
                                                  escrowJob.id)
                                            }
                                            onClick={() =>
                                              handleMarkComplete(escrowJob)
                                            }
                                          >
                                            Mark job complete
                                          </button>
                                          <button
                                            className="btn btn-xs btn-ghost"
                                            disabled={
                                              !escrowJob ||
                                              updatingJobId ===
                                                (escrowJob.job_request_id ??
                                                  escrowJob.id)
                                            }
                                            onClick={() =>
                                              handleCancelJob(escrowJob)
                                            }
                                          >
                                            Cancel job
                                          </button>
                                          <button
                                            className="btn btn-xs btn-outline"
                                            onClick={() => {
                                              if (escrowJob) {
                                                setDisputeJobId(escrowJob.id);
                                                setDisputeReason("");
                                              }
                                            }}
                                          >
                                            Report issue
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  <button
                                    onClick={() => handleToggleJob(job.id)}
                                    className="btn btn-sm btn-outline"
                                  >
                                    {isExpanded ? (
                                      <>
                                        Hide details
                                        <ChevronUp className="w-4 h-4" />
                                      </>
                                    ) : (
                                      <>
                                        View details & applicants
                                        <ChevronDown className="w-4 h-4" />
                                      </>
                                    )}
                                  </button>
                                </div>
                              </header>

                              {isExpanded && (
                                <section className="mt-6 space-y-6">
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-base-content/80">
                                    <h4 className="font-semibold text-base text-gray-800 mb-2">
                                      Additional details
                                    </h4>
                                    <p className="mb-2">
                                      <span className="font-medium">
                                        Contact preference:
                                      </span>{" "}
                                      {job.contact_preference ??
                                        "ZapTasks messages"}
                                    </p>
                                    {escrowSchedule && (
                                      <div className="text-xs text-slate-600 space-y-2">
                                        <p>
                                          Planned escrow releases:{" "}
                                          {escrowSchedule.escrowPercentage}%
                                          upfront,{" "}
                                          {escrowSchedule.progressPercentage ??
                                            0}
                                          % mid-job,{" "}
                                          {escrowSchedule.completionPercentage}%
                                          on completion.
                                        </p>
                                        <p>
                                          Escrow funded so far:{" "}
                                          {escrowFundedLabel}. Planned remaining
                                          releases: {plannedRemainingLabel}.
                                        </p>
                                        <p>
                                          ZapTasks fee (
                                          {(
                                            escrowSchedule.platformFeeRate * 100
                                          ).toFixed(1)}
                                          %) automatically covers processing and
                                          trust & safety support.
                                        </p>
                                      </div>
                                    )}
                                    {job.budget_notes && (
                                      <p className="mt-3 text-xs text-slate-600">
                                        <span className="font-medium text-slate-700">
                                          Budget notes:
                                        </span>{" "}
                                        {job.budget_notes}
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-base text-gray-800 mb-3">
                                      Applicants ({applications.length})
                                    </h4>
                                    {applications.length === 0 ? (
                                      <p className="text-base-content/60 text-sm">
                                        No applications yet. We’ll alert you as
                                        soon as local pros respond.
                                      </p>
                                    ) : (
                                      <div className="space-y-4">
                                        {applications.map((application) => (
                                          <div
                                            key={application.id}
                                            className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                                          >
                                            <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                <h5 className="text-lg font-semibold text-gray-900">
                                                  {application.provider_name ??
                                                    "Prospective provider"}
                                                </h5>
                                                {application.status ===
                                                  "awarded" && (
                                                  <span className="badge badge-success badge-sm">
                                                    Awarded
                                                  </span>
                                                )}
                                                {application.status ===
                                                  "not_selected" && (
                                                  <span className="badge badge-ghost badge-sm">
                                                    Not selected
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-base-content/60 mb-2">
                                                Applied on{" "}
                                                {format(
                                                  new Date(
                                                    application.created_at
                                                  ),
                                                  "MMM d, yyyy"
                                                )}
                                              </p>
                                              {application.message && (
                                                <p className="text-sm text-base-content/80 leading-relaxed">
                                                  {application.message}
                                                </p>
                                              )}
                                              <div className="flex flex-wrap gap-3 text-xs text-base-content/70 mt-3">
                                                {application.proposed_rate && (
                                                  <span className="badge badge-outline">
                                                    Proposed{" "}
                                                    {application.proposed_rate_type ===
                                                    "hourly"
                                                      ? "hourly"
                                                      : "flat"}
                                                    : $
                                                    {application.proposed_rate}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                              {job.status === "open" && (
                                                <button
                                                  className="btn btn-primary btn-sm"
                                                  onClick={() =>
                                                    awardApplication(
                                                      job.id,
                                                      application
                                                    )
                                                  }
                                                  disabled={
                                                    updatingJobId === job.id
                                                  }
                                                >
                                                  {updatingJobId === job.id
                                                    ? "Awarding..."
                                                    : "Award job"}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </section>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </main>
      {paymentModal && stripePromise && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <header className="space-y-1">
              <p className="text-sm uppercase tracking-wide text-blue-500">
                Secure Stripe Checkout
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                {paymentModal.label}
              </h3>
              <p className="text-sm text-slate-600">
                We’ll hold ${(paymentModal.amountCents / 100).toFixed(2)} until
                the job step is done.
              </p>
            </header>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: paymentModal.clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <EscrowPaymentForm
                modal={paymentModal}
                onSuccess={async (paymentIntentId) => {
                  if (paymentModal.paymentType === "completion") {
                    await finalizeCompletion(
                      paymentModal.jobId,
                      paymentIntentId
                    );
                  } else {
                    await fetchJobs({ silent: true });
                    setInfoMessage(
                      "Payment secured. Funds release once the job step is approved."
                    );
                  }
                }}
                onClose={() => setPaymentModal(null)}
              />
            </Elements>
          </div>
        </div>
      )}

      {disputeJobId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <header className="space-y-1">
              <p className="text-sm uppercase tracking-wide text-rose-500">
                Need help?
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                Tell us what went wrong
              </h3>
              <p className="text-sm text-slate-600">
                ZapTasks pauses payout while our trust & safety team reviews
                your note.
              </p>
            </header>
            <textarea
              className="textarea textarea-bordered w-full h-32"
              placeholder="Share what happened, when, and any detail that helps."
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setDisputeJobId(null);
                  setDisputeReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={submitDispute}
                disabled={updatingJobId === disputeJobId}
              >
                {updatingJobId === disputeJobId
                  ? "Submitting..."
                  : "Submit dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageJobsPage;
