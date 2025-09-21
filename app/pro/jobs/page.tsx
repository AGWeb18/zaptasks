"use client";

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
}

interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

const ProJobsPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [jobs, setJobs] = useState<OpenJobRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
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

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchJobs();
      fetchNotifications();
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

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(jobsChannel);
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
        <section className="max-w-5xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold text-blue-600 mb-2">Open Seasonal Jobs</h1>
              <p className="text-base-content/70 max-w-2xl">
                Browse homeowner requests across the Kawarthas and GTA. Apply with a quick message, tailor your rate, and let ZapTasks handle payments when you’re awarded the job.
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
            <div className="grid gap-6">
              {jobs.map((job) => {
                const applied = hasApplied(job.id);
                return (
                  <article key={job.id} className="card bg-white shadow border border-slate-200">
                    <div className="card-body">
                      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2">{job.job_title}</h3>
                          <div className="flex flex-wrap gap-2 text-sm text-blue-700 mb-3">
                            {job.services.map((service) => (
                              <span key={service} className="badge badge-outline">
                                {service}
                              </span>
                            ))}
                          </div>
                          <p className="text-base-content/70 leading-relaxed max-w-3xl">
                            {job.description}
                          </p>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedJobId(job.id);
                            resetApplicationForm();
                          }}
                          disabled={applied || submitting}
                        >
                          {applied ? "Application submitted" : "Apply now"}
                        </button>
                      </header>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-base-content/80">
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
                            {job.people ? `${job.people} person crew requested` : "Crew size flexible"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {job.budget_amount
                              ? `${job.budget_type === "hourly" ? "Hourly" : "Flat"} • $${job.budget_amount.toFixed(0)}`
                              : "Budget hidden"}
                          </span>
                        </div>
                      </div>

                      {job.budget_notes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-base-content/70 mt-4">
                          Homeowner notes: {job.budget_notes}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <input type="checkbox" className="modal-toggle" checked={!!selectedJobId} readOnly />
      <div className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Apply to {selectedJob?.job_title ?? "this job"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label text-sm font-semibold">Introduce yourself</label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={4}
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-sm font-semibold">Rate type</label>
                <select
                  className="select select-bordered w-full"
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as "flat" | "hourly")}
                >
                  <option value="flat">Flat project estimate</option>
                  <option value="hourly">Hourly estimate</option>
                </select>
              </div>
              <div>
                <label className="label text-sm font-semibold">Rate amount (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="input input-bordered w-full"
                  placeholder="Leave blank if flexible"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={() => setSelectedJobId(null)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submitApplication} disabled={submitting}>
              {submitting ? "Submitting..." : "Send application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProJobsPage;
