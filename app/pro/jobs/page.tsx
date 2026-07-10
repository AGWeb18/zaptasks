"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  MapPin,
  MessageCircle,
  CheckCircle,
  Bell,
  Sparkles,
  XCircle,
  Star,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/app/utils/supabase/client";
import { useSupabaseClient } from "@/app/utils/supabase/useClient";
import { getServiceLabels, listServiceOptions } from "@/app/lib/services/catalog";
import ChatModal from "@/app/components/ChatModal";
import HomeownerTrustStrip from "@/app/components/HomeownerTrustStrip";
import ReportButton from "@/app/components/ReportButton";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  provider_reserve_cents?: number | null;
  reserve_releasable_at?: string | null;
  last_provider_transfer_id?: string | null;
  provider_transfer_total_cents?: number | null;
  provider_reviews?: ProviderReviewRecord[];
}

interface JobApplicationMeta {
  provider_id: string | null;
}

interface OpenJobRequest {
  id: string;
  homeowner_id: string;
  homeowner_name?: string | null;
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
  pricing_mode: string | null;
  status: string;
  created_at: string;
  job_applications?: JobApplicationMeta[];
  photo_urls?: string[] | null;
}

interface ProviderReviewRecord {
  id: string;
  rating: number | null;
  review_type: string | null;
  comment: string | null;
  created_at: string;
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

const renderStars = (value: number | null | undefined) => {
  if (!value || value <= 0) return null;
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rounded ? "text-amber-500" : "text-slate-300"
          }`}
          fill={index < rounded ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
};

const jobStatusCopy: Record<string, string> = {
  awaiting_provider_onboarding:
    "Finish Stripe Connect onboarding to unlock payouts",
  awaiting_escrow: "Waiting on homeowner payment",
  awaiting_capture: "Payment submitted – we’re tracking it",
  in_progress: "Payment secured – go ahead and work",
  awaiting_completion_confirmation: "Ready for homeowner sign-off",
  reserve_hold: "Reserve hold in progress",
  completed: "Paid out",
  canceled: "Canceled",
  cancelled: "Canceled",
  disputed: "Disputed",
  refunded: "Refunded",
};

const SERVICE_CATEGORY_STYLES: Record<
  string,
  { bg: string; color: string; dotBg: string; label: string }
> = {
  "yard-care":        { bg: "bg-emerald-500", color: "#047857", dotBg: "#ecfdf5", label: "Yard & Outdoor" },
  "property-cleanup": { bg: "bg-emerald-500", color: "#047857", dotBg: "#ecfdf5", label: "Yard & Outdoor" },
  "home-fixes":       { bg: "bg-orange-500",  color: "#c2410c", dotBg: "#fff7ed", label: "Home Fixes" },
  "handyman-jobs":    { bg: "bg-orange-500",  color: "#c2410c", dotBg: "#fff7ed", label: "Home Fixes" },
  "grocery-runs":     { bg: "bg-sky-500",     color: "#0369a1", dotBg: "#f0f9ff", label: "Grocery Runs" },
  "cleaning":         { bg: "bg-violet-500",  color: "#6d28d9", dotBg: "#f5f3ff", label: "Cleaning" },
  "snow-removal":     { bg: "bg-cyan-500",    color: "#0e7490", dotBg: "#ecfeff", label: "Snow Removal" },
};
const DEFAULT_CATEGORY_STYLE = { bg: "bg-slate-500", color: "#475569", dotBg: "#f8fafc", label: "General" };

function getCategoryStyle(services: string[]) {
  for (const svc of services) {
    if (SERVICE_CATEGORY_STYLES[svc]) return SERVICE_CATEGORY_STYLES[svc];
  }
  return DEFAULT_CATEGORY_STYLE;
}

const isCanceledStatus = (status?: string | null): boolean =>
  typeof status === "string" &&
  ["canceled", "cancelled"].includes(status.toLowerCase());

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
  const { openSignIn } = useClerk();
  const authenticatedSupabase = useSupabaseClient();
  const [jobs, setJobs] = useState<OpenJobRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [escrowJobs, setEscrowJobs] = useState<EscrowJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailJob, setDetailJob] = useState<OpenJobRequest | null>(null);
  const [composeMode, setComposeMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState(
    "Hello! I’d love to help with this job."
  );
  const [rateType, setRateType] = useState<"flat" | "hourly">("flat");
  const [rateAmount, setRateAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [chatModalHomeowner, setChatModalHomeowner] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const currentUserId = user?.id;
  const router = useRouter();

  const fetchJobs = async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setLoadingJobs(true);
      }
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
        throw new Error("Failed to load your booked jobs");
      }
      const data = await response.json();
      if (Array.isArray(data.jobs)) {
        const jobList = data.jobs as EscrowJob[];
        const sanitizedJobs = jobList.filter(
          (raw) => !isCanceledStatus(raw.job_status)
        );
        setEscrowJobs(
          sanitizedJobs.map((raw) => ({
            ...raw,
            milestone_plan: parseEscrowSchedule(raw.milestone_plan),
            payments: raw.payments ?? [],
            provider_reviews: raw.provider_reviews ?? [],
          }))
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
    if (!isLoaded) return;
    // The job board itself is public — only applying needs an account.
    fetchJobs();
    if (isSignedIn) {
      fetchNotifications();
      fetchMyEscrowJobs();
    } else {
      setLoadingNotifications(false);
      setLoadingEscrow(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!user?.id) return;
    const checkProviderStatus = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("providers")
        .select("stripe_account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // If no record or no stripe id, we need onboarding
      if (!data?.stripe_account_id) {
        setStripeAccountMissing(true);
      } else {
        setStripeAccountMissing(false);
      }
    };
    void checkProviderStatus();
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    const supabase = authenticatedSupabase;
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

    // The job board is served through the API (RLS blocks direct row reads to
    // protect homeowner details), so refresh it on a timer instead of realtime.
    const jobBoardRefresh = setInterval(() => {
      void fetchJobs({ silent: true });
    }, 60_000);

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
          setEscrowJobs((prev) => {
            if (isCanceledStatus(updatedJob.job_status)) {
              return prev.filter((job) => job.id !== updatedJob.id);
            }

            const next = prev.map((job) =>
              job.id === updatedJob.id
                ? {
                    ...job,
                    ...updatedJob,
                    milestone_plan: parseEscrowSchedule(
                      updatedJob.milestone_plan
                    ),
                    payments: updatedJob.payments ?? job.payments,
                  }
                : job
            );

            const exists = next.some((job) => job.id === updatedJob.id);
            if (!exists) {
              return [
                ...next,
                {
                  ...updatedJob,
                  milestone_plan: parseEscrowSchedule(
                    updatedJob.milestone_plan
                  ),
                  payments: updatedJob.payments ?? [],
                },
              ];
            }

            return next;
          });
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
      clearInterval(jobBoardRefresh);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(escrowChannel);
    };
  }, [isLoaded, isSignedIn, user?.id, authenticatedSupabase]);

  const hasApplied = useMemo(() => {
    if (!currentUserId) return () => false;
    return (jobId: string) => {
      const job = jobs.find((item) => item.id === jobId);
      if (!job) return false;
      return (
        job.job_applications?.some(
          (application) => application.provider_id === currentUserId
        ) ?? false
      );
    };
  }, [jobs, currentUserId]);

  const openJobCount = jobs.length;
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read_at
  );
  const requiresOnboarding = escrowJobs.some(
    (job) => job.job_status === "awaiting_provider_onboarding"
  );
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const [stripeAccountMissing, setStripeAccountMissing] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<
    "newest" | "highest_budget" | "fewest_applicants"
  >("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const startStripeOnboarding = useCallback(async () => {
    if (!userEmail) {
      setError(
        "Add an email address in your profile before setting up payouts."
      );
      return;
    }

    if (!user) {
      setError("Sign in to ZapTasks before enabling payouts.");
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
          email: userEmail,
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
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start Stripe onboarding."
      );
    } finally {
      setOnboardingLoading(false);
    }
  }, [userEmail, user]);

  const resetApplicationForm = (jobTitle?: string) => {
    setApplicationMessage(
      jobTitle
        ? `Hi! I’d love to help with "${jobTitle}".\n\n`
        : "Hi! I’d love to help with this job.\n\n"
    );
    setRateType("flat");
    setRateAmount("");
  };

  const openJobDetail = (job: OpenJobRequest) => {
    setDetailJob(job);
    setComposeMode(false);
  };

  const openJobCompose = (job: OpenJobRequest) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setDetailJob(job);
    setComposeMode(true);
    resetApplicationForm(job.job_title);
  };

  const closeJobModal = () => {
    setDetailJob(null);
    setComposeMode(false);
  };

  const markNotificationRead = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId
          ? { ...item, read_at: new Date().toISOString() }
          : item
      )
    );
  };

  const clearAllNotifications = async () => {
    await Promise.all(unreadNotifications.map((n) => markNotificationRead(n.id)));
  };

  const submitApplication = async () => {
    if (!detailJob || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      if (detailJob.homeowner_id && detailJob.homeowner_id === currentUserId) {
        throw new Error("You can't apply to a job you posted.");
      }

      const payload = {
        jobId: detailJob.id,
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
          job.id === detailJob.id
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
      closeJobModal();
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

  const detailJobIsOwn = detailJob?.homeowner_id === currentUserId;
  const detailJobApplied = detailJob ? hasApplied(detailJob.id) : false;

  // Close the job detail modal with Escape.
  useEffect(() => {
    if (!detailJob) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailJob(null);
        setComposeMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailJob]);

  const describeNotification = (notification: NotificationItem): string => {
    const payload = notification.payload ?? {};
    const jobTitle =
      (payload.jobTitle as string | undefined) ??
      jobs.find((job) => job.id === payload.jobId)?.job_title;
    const titled = jobTitle ? `“${jobTitle}”` : "a job";
    switch (notification.type) {
      case "job_application_submitted":
        return `Application sent for ${titled}.`;
      case "job_application_awarded":
        return `You got the job! You were hired for ${titled}.`;
      case "job_application_awarded_onboarding":
        return `You were hired for ${titled} — finish payout setup to get paid.`;
      case "job_application_received":
        return `${
          (payload.providerName as string | undefined) ?? "A helper"
        } applied to ${titled}.`;
      case "job_posted_confirmation":
        return `Your job ${titled} is live.`;
      case "job_awarded_escrow_required":
        return `Secure the payment for ${titled} to lock in your helper.`;
      case "job_awarded_onboarding_pending":
        return `Your helper for ${titled} is finishing payout setup.`;
      default:
        return (
          notification.type.charAt(0).toUpperCase() +
          notification.type.slice(1).replace(/_/g, " ")
        );
    }
  };

  const isJustPosted = (createdAt: string) =>
    Date.now() - new Date(createdAt).getTime() < 2 * 60 * 60 * 1000;

  const serviceOptions = listServiceOptions();

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (activeCategory !== "all") {
      result = result.filter((job) =>
        job.services.some(
          (svc) =>
            svc === activeCategory ||
            SERVICE_CATEGORY_STYLES[svc]?.label === SERVICE_CATEGORY_STYLES[activeCategory]?.label
        )
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (job) =>
          job.job_title.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q) ||
          (job.address ?? "").toLowerCase().includes(q)
      );
    }

    switch (sortOrder) {
      case "highest_budget":
        result.sort((a, b) => (b.budget_amount ?? 0) - (a.budget_amount ?? 0));
        break;
      case "fewest_applicants":
        result.sort(
          (a, b) =>
            (a.job_applications?.length ?? 0) - (b.job_applications?.length ?? 0)
        );
        break;
      default:
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [jobs, activeCategory, sortOrder, searchQuery]);

  // Onboarding handled via banner — no auto-redirect

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <section className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-[26px] leading-8 font-bold text-slate-900 m-0 flex items-center gap-2.5">
                Open jobs near you
                <span className="text-[13px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {loadingJobs ? "—" : `${filteredJobs.length} open`}
                </span>
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Apply with a quick note — chat, get chosen, get paid through ZapTasks.
              </p>
            </div>
            {isSignedIn && (
            <div className="flex items-center gap-2">
              <div className="relative">
                {notifOpen && (
                  <div
                    className="fixed inset-0 z-[65]"
                    onClick={() => setNotifOpen(false)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 px-3 py-2 border border-slate-200 rounded-[10px] bg-white hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  Alerts
                  {unreadNotifications.length > 0 && (
                    <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-px rounded-full">
                      {loadingNotifications ? "—" : unreadNotifications.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-[calc(100%+8px)] w-[300px] bg-white border border-slate-200 rounded-xl shadow-[0_16px_32px_-8px_rgba(15,23,42,0.2)] z-[70] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
                      <span className="text-[13px] font-bold text-slate-900">Notifications</span>
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void clearAllNotifications()}
                          className="text-xs font-semibold text-blue-600 bg-transparent border-none cursor-pointer p-0.5"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                      {unreadNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start justify-between gap-2 px-3.5 py-2.5 border-b border-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-slate-800 m-0">
                              {describeNotification(notification)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-0">
                              {format(new Date(notification.created_at), "MMM d, h:mma")}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="Dismiss"
                            onClick={() => void markNotificationRead(notification.id)}
                            className="bg-transparent border-none text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {unreadNotifications.length === 0 && (
                      <p className="py-6 px-3.5 text-center text-[12.5px] text-slate-400 m-0">
                        You’re all caught up
                      </p>
                    )}
                  </div>
                )}
              </div>
              <a
                href="#booked-jobs"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 no-underline px-3 py-2 border border-slate-200 rounded-[10px] bg-white hover:border-slate-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                My booked jobs
                {escrowJobs.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-1.5 py-px rounded-full">
                    {loadingEscrow ? "—" : escrowJobs.length}
                  </span>
                )}
              </a>
            </div>
            )}
          </header>

          {(requiresOnboarding || stripeAccountMissing) && (
            <Link
              href="/pro/onboard"
              className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-xl text-amber-900 mb-6 no-underline transition-colors"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <div>
                <h3 className="font-bold">Connect your bank to get paid</h3>
                <p className="text-sm mb-0">
                  Takes about 3 minutes through Stripe — required before
                  payouts can reach you.
                </p>
              </div>
            </Link>
          )}

          {isSignedIn && (loadingEscrow || escrowJobs.length > 0) && (
          <section id="booked-jobs" className="mb-12 scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> Your Booked Jobs
              </h2>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 mb-4">
              <div>
                <p className="font-semibold">Stay covered</p>
                <p>
                  ZapTasks connects you with homeowners, but you remain an
                  independent contractor. Keep your insurance, licences, and
                  safety gear up to date, and document site conditions in chat.
                </p>
              </div>
            </div>
            {loadingEscrow ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />{" "}
                Checking your payouts…
              </div>
            ) : escrowJobs.length === 0 ? (
              <p className="text-slate-500 text-sm">
                When a homeowner chooses you, the booking and payment details
                will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {escrowJobs.map((job) => {
                  const schedule = job.milestone_plan;
                  const jobTitle =
                    job.job_requests?.job_title ?? "ZapTasks job";
                  const jobAddress =
                    job.job_requests?.address ??
                    "Address shared after confirmation";
                  const total = job.total_amount_cents;
                  const platformFee = job.platform_fee_cents;
                  const providerTakeHome = Math.max(total - platformFee, 0);
                  const reviewCount = job.provider_reviews?.length ?? 0;
                  const averageRating = reviewCount
                    ? (job.provider_reviews ?? []).reduce(
                        (sum, review) => sum + (review?.rating ?? 0),
                        0
                      ) / reviewCount
                    : null;
                  const escrowPayment = job.payments?.find(
                    (payment) => payment.payment_type === "escrow"
                  );
                  const progressPayment = job.payments?.find(
                    (payment) => payment.payment_type === "progress"
                  );
                  const completionPayment = job.payments?.find(
                    (payment) => payment.payment_type === "completion"
                  );
                  const escrowFundedCents =
                    escrowPayment &&
                    ["succeeded", "requires_capture", "processing"].includes(
                      escrowPayment.status
                    )
                      ? escrowPayment.amount_cents
                      : 0;
                  const escrowFundedLabel =
                    escrowFundedCents > 0
                      ? formatCurrency(escrowFundedCents)
                      : "—";
                  const escrowStatusLabel = escrowPayment
                    ? formatPaymentStatus(escrowPayment.status)
                    : "Not funded yet";
                  const renderPaymentBlock = (
                    label: string,
                    payment: EscrowPaymentRecord | undefined,
                    plannedCents: number
                  ) => {
                    const funded = payment && payment.status !== "canceled";
                    const amountLabel = funded
                      ? formatCurrency(payment?.amount_cents)
                      : "—";
                    const statusLabel = funded
                      ? formatPaymentStatus(payment?.status)
                      : "Not funded yet";
                    const plannedLabel =
                      plannedCents > 0 ? formatCurrency(plannedCents) : null;

                    return (
                      <div className="border border-slate-200 rounded-lg p-3">
                        <p className="font-semibold">{label}</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {amountLabel}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {statusLabel}
                        </p>
                        {!funded && plannedLabel && (
                          <p className="text-xs text-slate-400 mt-1">
                            Projected: {plannedLabel}
                          </p>
                        )}
                      </div>
                    );
                  };

                  return (
                    <article
                      key={job.id}
                      className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4"
                    >
                      <header className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-blue-500">
                          {jobStatusCopy[job.job_status] ?? job.job_status}
                        </p>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {jobTitle}
                        </h3>
                        <p className="text-sm text-slate-600">{jobAddress}</p>
                        {reviewCount > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-amber-600">
                            {renderStars(averageRating)}
                            <span>
                              {averageRating?.toFixed(1)} ({reviewCount} review
                              {reviewCount === 1 ? "" : "s"})
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No homeowner reviews yet
                          </p>
                        )}
                        <button
                          className="mt-2 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                          onClick={() => {
                            if (job.job_requests?.homeowner_id) {
                              setChatModalHomeowner({
                                id: job.job_requests.homeowner_id,
                                name:
                                  job.job_requests.homeowner_name ??
                                  "Homeowner",
                              });
                            }
                          }}
                        >
                          Chat with Homeowner
                        </button>
                      </header>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                          <p className="text-xs uppercase text-emerald-600">
                            Projected payout
                          </p>
                          <p className="text-2xl font-semibold text-emerald-800">
                            {formatCurrency(providerTakeHome)}
                          </p>
                          <p className="text-xs text-emerald-700 mt-1">
                            After ZapTasks fee (
                            {Math.round(job.platform_fee_rate * 100)}%); Stripe
                            processing fees apply
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-xs uppercase text-slate-600">
                            Paid so far
                          </p>
                          <p className="text-2xl font-semibold text-slate-900">
                            {escrowFundedLabel}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {escrowStatusLabel}
                          </p>
                        </div>
                      </div>
                      {!job.provider_stripe_account_id && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                          <div>
                            <p className="font-semibold">
                              Connect payouts to receive funds
                            </p>
                            <p className="text-xs">
                              You need to connect Stripe to accept jobs and
                              receive payments from neighbours.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={startStripeOnboarding}
                            disabled={onboardingLoading}
                          >
                            {onboardingLoading
                              ? "Connecting..."
                              : "Finish setup"}
                          </button>
                        </div>
                      )}
                      {job.provider_stripe_account_id && schedule && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase text-slate-400 tracking-wide">
                            Payment
                          </p>
                          <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                            <p className="text-sm font-semibold">
                              Full $
                              {(schedule.amounts.escrowCents / 100).toFixed(2)}{" "}
                              secured by homeowner
                            </p>
                            <p className="text-xs text-blue-700">
                              Status: {escrowStatusLabel}
                            </p>
                            <p className="text-xs">
                              You&apos;ll receive $
                              {(providerTakeHome / 100).toFixed(2)} after
                              completion, less standard Stripe card-processing
                              fees
                            </p>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}


          {/* Search + filter bar */}
          <div className="sticky top-16 z-40 bg-slate-100 py-2 pb-3 mb-5 flex flex-wrap items-center gap-2.5 border-b border-slate-200/70">
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs"
                className="w-full box-border py-2 pl-8 pr-3 border border-slate-200 rounded-[10px] bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
                }`}
                onClick={() => setActiveCategory("all")}
              >
                All jobs
              </button>
              {serviceOptions.map((opt) => {
                const dotColor =
                  SERVICE_CATEGORY_STYLES[opt.id]?.bg ?? DEFAULT_CATEGORY_STYLE.bg;
                const active = activeCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
                    }`}
                    onClick={() => setActiveCategory(opt.id)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <select
                className="px-2.5 py-2 border border-slate-200 rounded-[10px] bg-white text-slate-700 text-[13px] outline-none"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              >
                <option value="newest">Newest first</option>
                <option value="highest_budget">Highest budget</option>
                <option value="fewest_applicants">Fewest applicants</option>
              </select>
            </div>
          </div>

          {loadingJobs ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-14 text-center">
              <div className="text-6xl mb-5">🏡</div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {jobs.length === 0
                  ? "No jobs in your area right now"
                  : "No jobs match this filter"}
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                {jobs.length === 0
                  ? "Jobs appear here the moment neighbours post them — check back soon, or tell a neighbour who needs a hand."
                  : "Try a different category or clear your search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-2">
                {filteredJobs.map((job) => {
                  const applied = hasApplied(job.id);
                  const isOwnJob = job.homeowner_id === currentUserId;
                  const catStyle = getCategoryStyle(job.services);
                  const justPosted = isJustPosted(job.created_at);
                  const applicantCount = job.job_applications?.length ?? 0;
                  // The API already strips the street address for open jobs.
                  const locationLabel = job.address ?? "Location shared after hire";
                  const isQuote = job.pricing_mode === "provider_quote";
                  const budgetLabel = isQuote
                    ? "Open to quotes"
                    : job.budget_amount
                    ? `$${job.budget_amount}`
                    : "Budget open";
                  const budgetSub = isQuote
                    ? ""
                    : job.budget_type === "hourly"
                    ? "CAD per hour"
                    : "CAD flat";
                  const disabled = applied || isOwnJob;

                  const photoUrl = job.photo_urls?.[0] ?? null;

                  return (
                    <article
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openJobDetail(job)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openJobDetail(job);
                        }
                      }}
                      className={`bg-white border border-slate-200 rounded-[14px] overflow-hidden flex flex-col cursor-pointer transition-shadow hover:shadow-[0_4px_10px_-2px_rgba(15,23,42,0.08)] hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        disabled ? "opacity-55" : ""
                      }`}
                    >
                      {photoUrl && (
                        <div className="relative aspect-video bg-slate-100 flex-shrink-0">
                          <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <div className="px-[18px] py-4 flex flex-col gap-2.5 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ color: catStyle.color, background: catStyle.dotBg }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.bg}`} />
                          {catStyle.label}
                        </span>
                        {justPosted ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            New
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-[15px] font-bold text-slate-900 leading-snug m-0 mb-0.5">
                          {job.job_title}
                        </h3>
                        <p className={`text-[17px] font-bold m-0 ${isQuote ? "text-emerald-600" : "text-slate-900"}`}>
                          {budgetLabel}{" "}
                          {budgetSub && (
                            <span className="text-xs font-medium text-slate-400">{budgetSub}</span>
                          )}
                        </p>
                      </div>

                      <p className="text-[13px] text-slate-500 leading-relaxed m-0 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                        <div className="flex flex-col gap-0.5 min-w-0 text-xs text-slate-500">
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{locationLabel}</span>
                          </span>
                          <span className={applicantCount === 0 ? "text-emerald-600" : "text-slate-400"}>
                            {applicantCount === 0 ? "Be the first to apply" : `${applicantCount} applied`}
                          </span>
                        </div>
                        <button
                          className="px-4 py-2 rounded-[10px] text-[13px] font-semibold whitespace-nowrap border disabled:cursor-not-allowed"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isOwnJob || applied) return;
                            openJobCompose(job);
                          }}
                          disabled={disabled || submitting}
                          style={
                            disabled
                              ? { borderColor: "#e2e8f0", background: "#f8fafc", color: "#94a3b8" }
                              : { borderColor: "#2563eb", background: "#2563eb", color: "#ffffff" }
                          }
                        >
                          {applied ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Applied
                            </span>
                          ) : isOwnJob ? (
                            "Your job"
                          ) : (
                            <span className="flex items-center gap-1">
                              Apply <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      </main>

      {chatModalHomeowner && (
        <ChatModal
          helperId={chatModalHomeowner.id}
          helperName={chatModalHomeowner.name}
          onClose={() => setChatModalHomeowner(null)}
        />
      )}

      {detailJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              closeJobModal();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-[18px]">
            {!composeMode ? (
              <>
                <header className="flex items-start justify-between gap-3">
                  <div>
                    {(() => {
                      const catStyle = getCategoryStyle(detailJob.services);
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2"
                          style={{ color: catStyle.color, background: catStyle.dotBg }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.bg}`} />
                          {catStyle.label}
                        </span>
                      );
                    })()}
                    <h3 className="font-bold text-[19px] text-slate-900 m-0">
                      {detailJob.job_title}
                    </h3>
                  </div>
                  <button
                    className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer flex-shrink-0"
                    onClick={closeJobModal}
                    aria-label="Close job details"
                  >
                    Close
                  </button>
                </header>

                {detailJob.photo_urls?.[0] && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                    <Image src={detailJob.photo_urls[0]} alt="" fill className="object-cover" unoptimized />
                  </div>
                )}

                <p className="text-[15px] leading-relaxed text-slate-700 m-0">
                  {detailJob.description}
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <div className="flex-1 min-w-[140px] bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-3">
                    <p className="text-[11px] uppercase text-slate-400 m-0">Budget</p>
                    <p
                      className={`text-base font-bold m-0 mt-0.5 ${
                        detailJob.pricing_mode === "provider_quote" ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {detailJob.pricing_mode === "provider_quote"
                        ? "Open to quotes"
                        : detailJob.budget_amount
                        ? `$${detailJob.budget_amount}${detailJob.budget_type === "hourly" ? "/hr" : ""}`
                        : "Budget open"}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[140px] bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-3">
                    <p className="text-[11px] uppercase text-slate-400 m-0">Location</p>
                    <p className="text-sm font-semibold text-slate-900 m-0 mt-0.5">
                      {detailJob.address ?? "Location shared after hire"}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[140px] bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-3">
                    <p className="text-[11px] uppercase text-slate-400 m-0">Posted</p>
                    <p className="text-sm font-semibold text-slate-900 m-0 mt-0.5">
                      {formatDistanceToNow(new Date(detailJob.created_at), { addSuffix: true })} ·{" "}
                      {(detailJob.job_applications?.length ?? 0) === 0
                        ? "be the first to apply"
                        : `${detailJob.job_applications?.length} applied`}
                    </p>
                  </div>
                </div>

                {detailJob.homeowner_id && !detailJobIsOwn && (
                  <div className="bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-3">
                    <p className="text-[11px] uppercase text-slate-400 m-0 mb-1.5">
                      About this poster
                    </p>
                    <HomeownerTrustStrip homeownerId={detailJob.homeowner_id} />
                  </div>
                )}

                {!detailJobIsOwn && (
                  <ReportButton
                    targetType="job_request"
                    targetId={detailJob.id}
                    label="Report this job"
                  />
                )}

                {detailJobIsOwn && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>You posted this job. Only other providers can apply.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2.5 bg-slate-100 border-none rounded-[10px] text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                    onClick={closeJobModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-[18px] py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer disabled:cursor-not-allowed"
                    onClick={() => {
                      if (detailJobIsOwn || detailJobApplied) return;
                      if (!isSignedIn) {
                        openSignIn();
                        return;
                      }
                      setComposeMode(true);
                      resetApplicationForm(detailJob.job_title);
                    }}
                    disabled={detailJobIsOwn || detailJobApplied}
                    style={
                      detailJobIsOwn || detailJobApplied
                        ? { background: "#f1f5f9", color: "#94a3b8" }
                        : { background: "#2563eb", color: "#ffffff" }
                    }
                  >
                    {detailJobApplied ? "Applied" : "Apply now"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <header className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900 m-0 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Apply to {detailJob.job_title}
                  </h3>
                  <button
                    className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={closeJobModal}
                    disabled={submitting}
                    aria-label="Close application form"
                  >
                    Close
                  </button>
                </header>

                {detailJobIsOwn && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      You posted this job. Only other providers can apply.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Introduce yourself
                  </label>
                  <textarea
                    className="w-full box-border p-3 border border-slate-200 rounded-[10px] text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-[13px] font-semibold text-slate-700">
                    <span className="block mb-1">Rate type</span>
                    <select
                      className="w-full box-border p-2.5 border border-slate-200 rounded-[10px] bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={rateType}
                      onChange={(e) =>
                        setRateType(e.target.value as "flat" | "hourly")
                      }
                    >
                      <option value="flat">Flat project estimate</option>
                      <option value="hourly">Hourly estimate</option>
                    </select>
                  </label>
                  <label className="text-[13px] font-semibold text-slate-700">
                    <span className="block mb-1">Rate amount (optional)</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full box-border p-2.5 border border-slate-200 rounded-[10px] text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Leave blank if flexible"
                      value={rateAmount}
                      onChange={(e) => setRateAmount(e.target.value)}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    className="flex items-center gap-1 bg-transparent border-none text-sm font-semibold text-blue-600 cursor-pointer p-0"
                    onClick={() => setComposeMode(false)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2.5 bg-slate-100 border-none rounded-[10px] text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                      onClick={closeJobModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2.5 bg-blue-600 border-none rounded-[10px] text-sm font-semibold text-white cursor-pointer hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={submitApplication}
                      disabled={submitting || detailJobIsOwn}
                    >
                      {submitting
                        ? "Submitting..."
                        : detailJobIsOwn
                        ? "You posted this job"
                        : "Send application"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProJobsPage;
