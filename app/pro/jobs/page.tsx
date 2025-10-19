"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  MessageCircle,
  CheckCircle,
  Bell,
  Sparkles,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/app/utils/supabase/client";
import { getServiceLabels } from "@/app/lib/services/catalog";

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
  payment_type: string;
  status: string;
  amount_cents: number;
  captured_at: string | null;
}

interface EscrowJob {
  id: string;
  job_request_id: string | null;
  job_requests?: OpenJobRequest;
  total_amount_cents: number;
  platform_fee_cents: number;
  platform_fee_rate: number;
  job_status: string;
  milestone_plan: EscrowSchedule | null;
  payments?: EscrowPaymentRecord[];
  provider_stripe_account_id?: string | null;
}

interface JobApplicationMeta {
  provider_id: string | null;
}

interface OpenJobRequest {
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
  created_at: string;
  job_applications?: JobApplicationMeta[];
  photo_urls?: string[] | null;
}

interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
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

const formatCurrency = (amountCents: number | null | undefined): string => {
  if (!amountCents || Number.isNaN(amountCents)) {
    return "$0.00";
  }
  return `$${(amountCents / 100).toFixed(2)}`;
};

const jobStatusCopy: Record<string, string> = {
  awaiting_provider_onboarding: "Finish Stripe Connect onboarding to unlock escrow",
  awaiting_escrow: "Waiting on homeowner to fund escrow",
  awaiting_capture: "Escrow funded, waiting for job",
  in_progress: "Progress payment secured",
  awaiting_completion_confirmation: "Ready for homeowner sign-off",
  completed: "Paid out",
  canceled: "Canceled",
  cancelled: "Canceled",
  disputed: "Disputed",
  refunded: "Refunded",
};

const formatPaymentStatus = (status: string | null | undefined): string => {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "Awaiting payment";
    case "requires_action":
      return "Action needed";
    case "processing":
      return "Processing";
    case "requires_capture":
      return "Ready to release";
    case "succeeded":
      return "Released";
    case "canceled":
      return "Canceled";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partial refund";
    default:
      return status ?? "Unknown";
  }
};

const ProJobsPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [jobs, setJobs] = useState<OpenJobRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [escrowJobs, setEscrowJobs] = useState<EscrowJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("Hello! I’d love to help with this job.");
  const [rateType, setRateType] = useState<"flat" | "hourly">("flat");
  const [rateAmount, setRateAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = user?.id;

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await fetch("/api/job-requests?scope=open");
      if (!response.ok) {
        throw new Error("Failed to load open jobs");
      }
      const data = await response.json();
      setJobs(data.jobRequests ?? []);
    } catch (err) {
      console.error(err);
      setError("We couldn’t load the open job board. Please try again.");
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }
      const data = await response.json();
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchMyEscrowJobs = async () => {
    try {
      setLoadingEscrow(true);
      const response = await fetch("/api/jobs?scope=provider");
      if (!response.ok) {
        throw new Error("Failed to load your escrow jobs");
      }
      const data = await response.json();
      if (Array.isArray(data.jobs)) {
        setEscrowJobs(
          data.jobs.map((raw: EscrowJob) => ({
            ...raw,
            milestone_plan: parseEscrowSchedule(raw.milestone_plan),
            payments: raw.payments ?? [],
          })),
        );
      } else {
        setEscrowJobs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEscrow(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchJobs();
      fetchNotifications();
      fetchMyEscrowJobs();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    const supabase = createClient();
    const notificationsChannel = supabase
      .channel(`notifications-provider-${user.id}`)
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
          setNotifications((prev) => [notification, ...prev]);
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel("job-board-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_requests",
          filter: "status=eq.open",
        },
        (payload) => {
          const newJob = payload.new as OpenJobRequest;
          setJobs((prev) => {
            const exists = prev.some((job) => job.id === newJob.id);
            return exists ? prev : [newJob, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_requests",
        },
        (payload) => {
          const updatedJob = payload.new as OpenJobRequest;
          setJobs((prev) => {
            if (updatedJob.status !== "open") {
              return prev.filter((job) => job.id !== updatedJob.id);
            }
            return prev.map((job) => (job.id === updatedJob.id ? updatedJob : job));
          });
        }
      )
      .subscribe();

    const escrowChannel = supabase
      .channel(`escrow-updates-provider-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `provider_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJob = payload.new as EscrowJob;
          setEscrowJobs((prev) =>
            prev.map((job) =>
              job.id === updatedJob.id
                ? {
                    ...job,
                    ...updatedJob,
                    milestone_plan: parseEscrowSchedule(updatedJob.milestone_plan),
                    payments: (updatedJob as EscrowJob).payments ?? job.payments,
                  }
                : job
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jobs",
          filter: `provider_id=eq.${user.id}`,
        },
        () => {
          fetchMyEscrowJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(escrowChannel);
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const hasApplied = useMemo(() => {
    if (!currentUserId) return () => false;
    return (jobId: string) => {
      const job = jobs.find((item) => item.id === jobId);
      if (!job) return false;
      return job.job_applications?.some((application) => application.provider_id === currentUserId) ?? false;
    };
  }, [jobs, currentUserId]);

  const openJobCount = jobs.length;
  const unreadNotifications = notifications.filter((notification) => !notification.read_at);
  const requiresOnboarding = escrowJobs.some((job) => !job.provider_stripe_account_id);

  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const startStripeOnboarding = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError("Add an email address in your profile before setting up payouts.");
      return;
    }

    try {
      setOnboardingLoading(true);
      setError(null);
      const displayName =
        user.fullName?.trim() ||
        user.username?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        undefined;
      const response = await fetch("/api/stripe-connect-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress.emailAddress,
          name: displayName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to start Stripe onboarding.");
      }

      const payload = await response.json();
      if (payload?.url) {
        window.location.href = payload.url as string;
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to start Stripe onboarding.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  const resetApplicationForm = () => {
    setApplicationMessage("Hello! I’d love to help with this job.");
    setRateType("flat");
    setRateAmount("");
  };

  const submitApplication = async () => {
    if (!selectedJobId || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        jobId: selectedJobId,
        message: applicationMessage,
        proposedRate: rateAmount ? Number(rateAmount) : null,
        proposedRateType: rateAmount ? rateType : null,
        providerName: user.fullName ?? user.username ?? "ZapTasks Provider",
        providerEmail: user.primaryEmailAddress?.emailAddress ?? undefined,
      };

      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message ?? "Failed to submit application");
      }

      setJobs((prev) =>
        prev.map((job) =>
          job.id === selectedJobId
            ? {
                ...job,
                job_applications: [
                  ...(job.job_applications ?? []),
                  { provider_id: currentUserId ?? "" },
                ],
              }
            : job
        )
      );

      resetApplicationForm();
      setSelectedJobId(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t submit your application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <section className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold text-blue-600 mb-2">Browse open jobs near you</h1>
              <p className="text-base-content/70 max-w-2xl">
                Scroll the community job board for tasks posted by neighbours across Canada. You don’t have to be a pro—apply with a quick note, chat through the details, and get paid through ZapTasks when you’re selected.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4 flex flex-col gap-3 min-w-[220px]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs uppercase text-base-content/50">Open jobs</p>
                  <p className="text-2xl font-semibold">{loadingJobs ? "—" : openJobCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs uppercase text-base-content/50">Unread alerts</p>
                  <p className="text-lg font-semibold">{loadingNotifications ? "—" : unreadNotifications.length}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> Your escrowed jobs
              </h2>
              {requiresOnboarding && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary text-white md:self-end"
                  onClick={startStripeOnboarding}
                  disabled={onboardingLoading}
                >
                  {onboardingLoading ? "Opening Stripe…" : "Enable instant payouts"}
                </button>
              )}
            </div>
            {loadingEscrow ? (
              <div className="flex items-center gap-2 text-base-content/60 text-sm">
                <span className="loading loading-spinner loading-xs"></span> Checking your payouts…
              </div>
            ) : escrowJobs.length === 0 ? (
              <p className="text-base-content/60 text-sm">
                When a homeowner chooses you, we’ll hold their payment safely in Stripe-powered escrow and show it here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {escrowJobs.map((job) => {
                  const schedule = job.milestone_plan;
                  const jobTitle = job.job_requests?.job_title ?? "ZapTasks job";
                  const jobAddress = job.job_requests?.address ?? "Address shared after confirmation";
                  const total = job.total_amount_cents;
                  const platformFee = job.platform_fee_cents;
                  const providerTakeHome = Math.max(total - platformFee, 0);
                  const escrowPayment = job.payments?.find((payment) => payment.payment_type === "escrow");
                  const progressPayment = job.payments?.find((payment) => payment.payment_type === "progress");
                  const completionPayment = job.payments?.find((payment) => payment.payment_type === "completion");
                  const escrowFundedCents = escrowPayment && ["succeeded", "requires_capture", "processing"].includes(escrowPayment.status)
                    ? escrowPayment.amount_cents
                    : 0;
                  const escrowFundedLabel = escrowFundedCents > 0 ? formatCurrency(escrowFundedCents) : "—";
                  const escrowStatusLabel = escrowPayment
                    ? formatPaymentStatus(escrowPayment.status)
                    : "Not funded yet";
                  const renderPaymentBlock = (
                    label: string,
                    payment: EscrowPaymentRecord | undefined,
                    plannedCents: number,
                  ) => {
                    const funded = payment && payment.status !== "canceled";
                    const amountLabel = funded ? formatCurrency(payment?.amount_cents) : "—";
                    const statusLabel = funded
                      ? formatPaymentStatus(payment?.status)
                      : "Not funded yet";
                    const plannedLabel = plannedCents > 0 ? formatCurrency(plannedCents) : null;

                    return (
                      <div className="border border-slate-200 rounded-lg p-3">
                        <p className="font-semibold">{label}</p>
                        <p className="text-lg font-semibold text-slate-900">{amountLabel}</p>
                        <p className="text-xs text-slate-500 mt-1">{statusLabel}</p>
                        {!funded && plannedLabel && (
                          <p className="text-xs text-slate-400 mt-1">Projected: {plannedLabel}</p>
                        )}
                      </div>
                    );
                  };

                  return (
                    <article key={job.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                      <header className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-blue-500">{jobStatusCopy[job.job_status] ?? job.job_status}</p>
                        <h3 className="text-xl font-semibold text-slate-900">{jobTitle}</h3>
                        <p className="text-sm text-slate-600">{jobAddress}</p>
                      </header>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                          <p className="text-xs uppercase text-emerald-600">Projected payout</p>
                          <p className="text-2xl font-semibold text-emerald-800">{formatCurrency(providerTakeHome)}</p>
                          <p className="text-xs text-emerald-700 mt-1">After ZapTasks fee ({Math.round(job.platform_fee_rate * 100)}%)</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-xs uppercase text-slate-600">Escrow funded so far</p>
                          <p className="text-2xl font-semibold text-slate-900">{escrowFundedLabel}</p>
                          <p className="text-xs text-slate-500 mt-1">{escrowStatusLabel}</p>
                        </div>
                      </div>
                      {!job.provider_stripe_account_id && (
                        <div className="alert alert-warning text-sm">
                          <div>
                            <p className="font-semibold">Connect payouts to receive funds</p>
                            <p className="text-xs">Stripe unlocks once you finish onboarding. It takes about two minutes.</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary text-white"
                            onClick={startStripeOnboarding}
                            disabled={onboardingLoading}
                          >
                            {onboardingLoading ? "Opening Stripe…" : "Finish setup"}
                          </button>
                        </div>
                      )}
                      {schedule && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase text-slate-400 tracking-wide">Escrow timeline</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
                            {renderPaymentBlock("Escrow", escrowPayment, schedule.amounts.escrowCents)}
                            {schedule.amounts.progressCents > 0 &&
                              renderPaymentBlock("Progress", progressPayment, schedule.amounts.progressCents)}
                            {renderPaymentBlock("Completion", completionPayment, schedule.amounts.completionCents)}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {error && (
            <div className="alert alert-error shadow mb-6">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <section className="mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h2>
            {loadingNotifications ? (
              <div className="flex items-center gap-2 text-base-content/60 text-sm">
                <span className="loading loading-spinner loading-xs"></span> Loading alerts…
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-base-content/60 text-sm">
                No notifications yet. Apply to jobs and we’ll keep you posted on homeowner decisions.
              </p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm flex justify-between items-start ${
                      notification.read_at ? "opacity-75" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold capitalize mb-1">
                        {notification.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-base-content/70 text-xs">
                        {format(new Date(notification.created_at), "MMM d, yyyy h:mma")}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={async () => {
                          await fetch("/api/notifications", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ notificationId: notification.id }),
                          });
                          setNotifications((prev) =>
                            prev.map((item) =>
                              item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
                            )
                          );
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {loadingJobs ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center">
              <CheckCircle className="w-14 h-14 mx-auto text-green-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">All caught up</h2>
              <p className="text-base-content/70">
                There are no open job requests right now. Check back soon—we’ll ping you when new work lands.
              </p>
            </div>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-2">
                {jobs.map((job) => {
                  const applied = hasApplied(job.id);
                  const primaryPhoto = job.photo_urls?.[0] ?? "/images/job-card-placeholder.svg";
                  const serviceLabels = getServiceLabels(job.services);
                  return (
                    <article
                      key={job.id}
                      className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
                    >
                      <div className="flex-1 flex flex-col p-6">
                        <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 bg-slate-200">
                          <Image
                            src={primaryPhoto}
                            alt={`${job.job_title} photo`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 50vw, 33vw"
                            unoptimized={primaryPhoto.startsWith("/images/")}
                          />
                        </div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{job.job_title}</h3>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-blue-700">
                              {serviceLabels.map((label) => (
                                <span key={label} className="badge badge-outline">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500">
                            Posted {format(new Date(job.created_at), "MMM d")}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/70 leading-relaxed mb-4">
                          {job.description}
                        </p>
                        <div className="space-y-2 text-sm text-base-content/80">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {job.service_date
                                ? format(new Date(job.service_date), "MMM d, yyyy")
                                : "Date flexible"}
                              {job.service_time ? ` • ${job.service_time}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{job.address ?? "Exact address shared after award"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {job.hours ? `${job.hours} hour${job.hours > 1 ? "s" : ""}` : "Hours TBD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>
                              {job.people ? `${job.people} helper${job.people > 1 ? "s" : ""} ideal` : "Solo or team"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {job.budget_amount
                                ? job.budget_type === "hourly"
                                  ? `$${job.budget_amount}/hr`
                                  : `$${job.budget_amount} flat`
                                : "Budget open"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            <span>{job.contact_preference === "phone" ? "Prefers phone chat" : job.contact_preference === "email" ? "Prefers email" : "Prefers ZapTasks chat"}</span>
                          </div>
                        </div>
                        {job.budget_notes && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-base-content/70 mt-4">
                            Homeowner notes: {job.budget_notes}
                          </div>
                        )}
                      </div>
                      <div className="p-6 pt-0">
                        <button
                          className="btn btn-primary btn-block"
                          onClick={() => {
                            setSelectedJobId(job.id);
                            resetApplicationForm();
                          }}
                          disabled={applied || submitting}
                        >
                          {applied ? "Application submitted" : "Apply to this job"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5">
            <header className="flex items-center justify-between">
              <h3 className="font-bold text-xl flex items-center gap-2 text-slate-900">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Apply to {selectedJob?.job_title ?? "this job"}
              </h3>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setSelectedJobId(null)}
                disabled={submitting}
                aria-label="Close application form"
              >
                Close
              </button>
            </header>

            <div className="space-y-4 text-slate-800">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Introduce yourself
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={4}
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-slate-700">
                  <span className="block mb-1">Rate type</span>
                  <select
                    className="select select-bordered w-full"
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value as "flat" | "hourly")}
                  >
                    <option value="flat">Flat project estimate</option>
                    <option value="hourly">Hourly estimate</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  <span className="block mb-1">Rate amount (optional)</span>
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered w-full"
                    placeholder="Leave blank if flexible"
                    value={rateAmount}
                    onChange={(e) => setRateAmount(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setSelectedJobId(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitApplication} disabled={submitting}>
                {submitting ? "Submitting..." : "Send application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProJobsPage;
