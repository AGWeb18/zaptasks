"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Navbar from "@/app/components/NavBar";
import {
  MapPin,
  Users,
  MessageCircle,
  CheckCircle,
  Bell,
  Sparkles,
  XCircle,
  Star,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/app/utils/supabase/client";
import { getServiceLabels, listServiceOptions } from "@/app/lib/services/catalog";
import ChatModal from "@/app/components/ChatModal";
import Link from "next/link";
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

const SERVICE_CATEGORY_STYLES: Record<string, { bg: string; emoji: string; label: string }> = {
  "yard-care":        { bg: "bg-emerald-500", emoji: "🌿", label: "Yard & Outdoor" },
  "property-cleanup": { bg: "bg-emerald-500", emoji: "🌿", label: "Yard & Outdoor" },
  "home-fixes":       { bg: "bg-orange-500", emoji: "🔧", label: "Home Fixes" },
  "handyman-jobs":    { bg: "bg-orange-500", emoji: "🔧", label: "Home Fixes" },
  "grocery-runs":     { bg: "bg-sky-500",    emoji: "🛒", label: "Grocery Runs" },
};
const DEFAULT_CATEGORY_STYLE = { bg: "bg-slate-500", emoji: "⚡", label: "General" };

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
  const [jobs, setJobs] = useState<OpenJobRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [escrowJobs, setEscrowJobs] = useState<EscrowJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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
    if (isLoaded && isSignedIn) {
      fetchJobs();
      fetchNotifications();
      fetchMyEscrowJobs();
    } else if (isLoaded && !isSignedIn) {
      setLoadingJobs(false);
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
            return prev.map((job) =>
              job.id === updatedJob.id ? updatedJob : job
            );
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
  const [onboardingAutoAttempted, setOnboardingAutoAttempted] = useState(false);
  const [releasingReserveId, setReleasingReserveId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "highest_budget" | "fewest_bids">("newest");

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

  const releaseReserve = useCallback(
    async (jobId: string) => {
      setReleasingReserveId(jobId);
      setError(null);
      try {
        const response = await fetch(`/api/jobs/${jobId}/release-reserve`, {
          method: "POST",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to release reserve funds.");
        }

        setEscrowJobs((prev) =>
          prev.map((job) => {
            if (job.id !== jobId) {
              return job;
            }

            const reserveCents = job.provider_reserve_cents ?? 0;
            return {
              ...job,
              job_status: "completed",
              provider_reserve_cents: 0,
              reserve_releasable_at: null,
              last_provider_transfer_id:
                (payload?.transferId as string | undefined) ??
                job.last_provider_transfer_id ??
                null,
              provider_transfer_total_cents:
                (job.provider_transfer_total_cents ?? 0) + reserveCents,
            };
          })
        );
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn’t release the reserve. Please try again later."
        );
      } finally {
        setReleasingReserveId(null);
      }
    },
    [setEscrowJobs, setError]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!requiresOnboarding) return;
    if (onboardingAutoAttempted || onboardingLoading) return;
    if (!userEmail) return;

    setOnboardingAutoAttempted(true);
    void startStripeOnboarding();
  }, [
    isLoaded,
    isSignedIn,
    requiresOnboarding,
    onboardingAutoAttempted,
    onboardingLoading,
    userEmail,
    startStripeOnboarding,
  ]);

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
      const job = jobs.find((item) => item.id === selectedJobId);
      if (job?.homeowner_id && job.homeowner_id === currentUserId) {
        throw new Error("You can't apply to a job you posted.");
      }

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
  const selectedJobIsOwn = selectedJob?.homeowner_id === currentUserId;

  const isJustPosted = (createdAt: string) =>
    Date.now() - new Date(createdAt).getTime() < 2 * 60 * 60 * 1000;

  const isHighDemand = (job: OpenJobRequest) =>
    (job.job_applications?.length ?? 0) >= 5;

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

    switch (sortOrder) {
      case "highest_budget":
        result.sort((a, b) => (b.budget_amount ?? 0) - (a.budget_amount ?? 0));
        break;
      case "fewest_bids":
        result.sort(
          (a, b) => (a.job_applications?.length ?? 0) - (b.job_applications?.length ?? 0)
        );
        break;
      default:
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [jobs, activeCategory, sortOrder]);

  // Banner: link to onboard page
  useEffect(() => {
    if (requiresOnboarding && !onboardingAutoAttempted) {
      router.push("/pro/onboard");
      setOnboardingAutoAttempted(true);
    }
  }, [requiresOnboarding, onboardingAutoAttempted, router]);

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <section className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold text-blue-600 mb-2">
                Browse open jobs near you
              </h1>
              <p className="text-base-content/70 max-w-2xl">
                Scroll the community job board for tasks posted by neighbours
                across Canada. Anyone can apply—send a quick note, chat through
                the details, and get paid through ZapTasks when you&apos;re
                selected.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4 flex flex-col gap-3 min-w-[220px]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs uppercase text-base-content/50">
                    Open jobs
                  </p>
                  <p className="text-2xl font-semibold">
                    {loadingJobs ? "—" : openJobCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs uppercase text-base-content/50">
                    Unread alerts
                  </p>
                  <p className="text-lg font-semibold">
                    {loadingNotifications ? "—" : unreadNotifications.length}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {(requiresOnboarding || stripeAccountMissing) && (
            <Link
              href="/pro/onboard"
              className="alert alert-warning mb-6 no-underline"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold">Connect Bank Account</h3>
                  <p className="text-sm mb-0">
                    Required to receive payouts when hired.
                  </p>
                </div>
              </div>
            </Link>
          )}

          {isSignedIn && (loadingEscrow || escrowJobs.length > 0) && (
          <section className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> Your Booked Jobs
              </h2>
            </div>
            <div className="alert alert-info bg-blue-50 border border-blue-100 text-xs text-blue-700 mb-4">
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
              <div className="flex items-center gap-2 text-base-content/60 text-sm">
                <span className="loading loading-spinner loading-xs"></span>{" "}
                Checking your payouts…
              </div>
            ) : escrowJobs.length === 0 ? (
              <p className="text-base-content/60 text-sm">
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
                  const reserveCents = job.provider_reserve_cents ?? 0;
                  const reserveReleaseAt = job.reserve_releasable_at
                    ? new Date(job.reserve_releasable_at)
                    : null;
                  const reserveReady = reserveReleaseAt
                    ? reserveReleaseAt.getTime() <= Date.now()
                    : false;
                  const reserveCountdown = reserveReleaseAt
                    ? formatDistanceToNow(reserveReleaseAt, { addSuffix: true })
                    : null;
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
                          className="btn btn-xs btn-secondary mt-2"
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
                            {Math.round(job.platform_fee_rate * 100)}%)
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
                        <div className="alert alert-warning text-sm">
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
                            className="btn btn-sm btn-primary text-white"
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
                              in escrow
                            </p>
                            <p className="text-xs text-blue-700">
                              Status: {escrowStatusLabel}
                            </p>
                            <p className="text-xs">
                              You&apos;ll receive $
                              {(providerTakeHome / 100).toFixed(2)} after
                              completion
                            </p>
                          </div>
                        </div>
                      )}
                      {reserveCents > 0 && (
                        <div className="border border-amber-200 bg-amber-50 text-amber-700 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                Reserve hold
                              </p>
                              <p className="text-xs">
                                {formatCurrency(reserveCents)} held until{" "}
                                {reserveReleaseAt
                                  ? format(reserveReleaseAt, "MMM d, yyyy")
                                  : "processing"}
                                {reserveReleaseAt
                                  ? ` (${reserveCountdown ?? "processing"})`
                                  : ""}
                              </p>
                            </div>
                            {reserveReady ? (
                              <button
                                className="btn btn-sm btn-primary text-white"
                                onClick={() => releaseReserve(job.id)}
                                disabled={releasingReserveId === job.id}
                              >
                                {releasingReserveId === job.id
                                  ? "Releasing..."
                                  : "Release reserve"}
                              </button>
                            ) : (
                              <span className="text-xs font-medium">
                                Hold active
                              </span>
                            )}
                          </div>
                          <p className="text-xs">
                            ZapTasks keeps a short-term reserve to cover refunds
                            and disputes. Funds become eligible once the hold
                            period expires.
                          </p>
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
            <div className="alert alert-error shadow mb-6">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {isSignedIn && (loadingNotifications || notifications.length > 0) && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h2>
            {loadingNotifications ? (
              <div className="flex items-center gap-2 text-base-content/60 text-sm">
                <span className="loading loading-spinner loading-xs"></span>{" "}
                Loading alerts…
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-base-content/60 text-sm">
                No notifications yet. Apply to jobs and we’ll keep you posted on
                homeowner decisions.
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
                        {format(
                          new Date(notification.created_at),
                          "MMM d, yyyy h:mma"
                        )}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={async () => {
                          await fetch("/api/notifications", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              notificationId: notification.id,
                            }),
                          });
                          setNotifications((prev) =>
                            prev.map((item) =>
                              item.id === notification.id
                                ? { ...item, read_at: new Date().toISOString() }
                                : item
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
          )}

          {/* Filter bar */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-2">
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
              {serviceOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    activeCategory === opt.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
                  }`}
                  onClick={() => setActiveCategory(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">Sort:</span>
              <select
                className="select select-sm select-bordered bg-white text-slate-700 text-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              >
                <option value="newest">Newest first</option>
                <option value="highest_budget">Highest budget</option>
                <option value="fewest_bids">Fewest bids</option>
              </select>
            </div>
          </div>

          {loadingJobs ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : !isSignedIn ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-14 text-center">
              <div className="text-6xl mb-5">🔑</div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Sign in to browse jobs
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                Create a free account or sign in to see open jobs posted by neighbours and start applying.
              </p>
              <SignInButton mode="modal">
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                  Sign In to Browse
                </button>
              </SignInButton>
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
                  ? "We’ll notify you when new jobs are posted nearby. Make sure your notifications are turned on."
                  : "Try a different category or check back soon — new jobs are posted daily."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-2">
                {filteredJobs.map((job) => {
                  const applied = hasApplied(job.id);
                  const isOwnJob = job.homeowner_id === currentUserId;
                  const catStyle = getCategoryStyle(job.services);
                  const bidCount = job.job_applications?.length ?? 0;
                  const justPosted = isJustPosted(job.created_at);
                  const highDemand = isHighDemand(job);
                  const locationLabel = (() => {
                    if (!job.address) return "Location shared after hire";
                    const parts = job.address.split(",").map((p) => p.trim()).filter(Boolean);
                    if (parts.length <= 1) return "Location shared after hire";
                    return parts.slice(1).join(", ");
                  })();
                  const budgetLabel = (() => {
                    if (job.pricing_mode === "provider_quote") return "Open to quotes";
                    if (!job.budget_amount) return "Budget open";
                    return job.budget_type === "hourly"
                      ? `$${job.budget_amount}/hr CAD`
                      : `$${job.budget_amount} CAD`;
                  })();

                  return (
                    <article
                      key={job.id}
                      className={`bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
                        applied || isOwnJob ? "opacity-60" : ""
                      }`}
                    >
                      {/* Colored category band */}
                      <div className={`${catStyle.bg} px-4 py-3 flex items-center justify-between`}>
                        <span className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wide">
                          <span>{catStyle.emoji}</span>
                          {catStyle.label}
                        </span>
                        <span className="bg-white/25 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          {budgetLabel}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="flex-1 flex flex-col px-5 pt-4 pb-1">
                        {/* Status badges */}
                        {(justPosted || highDemand) && (
                          <div className="flex gap-2 mb-2">
                            {justPosted && (
                              <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                Just posted
                              </span>
                            )}
                            {highDemand && (
                              <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                🔥 High demand
                              </span>
                            )}
                          </div>
                        )}

                        <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">
                          {job.job_title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {job.description}
                        </p>

                        {/* Location + bids row */}
                        <div className="flex items-center justify-between mt-auto pb-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{locationLabel}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{bidCount} {bidCount === 1 ? "bid" : "bids"}</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="px-5 pb-5">
                        <button
                          className="btn btn-primary btn-sm btn-block gap-1.5"
                          onClick={() => {
                            if (isOwnJob) return;
                            setSelectedJobId(job.id);
                            resetApplicationForm();
                          }}
                          disabled={applied || submitting || isOwnJob}
                        >
                          {applied ? (
                            <>
                              <CheckCircle className="w-4 h-4" /> Applied
                            </>
                          ) : isOwnJob ? (
                            "Your job"
                          ) : (
                            <>
                              Apply Now <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
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
              {selectedJobIsOwn && (
                <div className="alert alert-info shadow-sm text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    You posted this job. Only other providers can apply.
                  </span>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Introduce yourself
                </label>
                <textarea
                  className="textarea textarea-bordered w-full bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-slate-700">
                  <span className="block mb-1">Rate type</span>
                  <select
                    className="select select-bordered w-full bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={rateType}
                    onChange={(e) =>
                      setRateType(e.target.value as "flat" | "hourly")
                    }
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
                    className="input input-bordered w-full bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave blank if flexible"
                    value={rateAmount}
                    onChange={(e) => setRateAmount(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => setSelectedJobId(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitApplication}
                disabled={submitting || selectedJobIsOwn}
              >
                {submitting
                  ? "Submitting..."
                  : selectedJobIsOwn
                  ? "You posted this job"
                  : "Send application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProJobsPage;
