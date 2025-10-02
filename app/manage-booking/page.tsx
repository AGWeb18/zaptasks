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
};

const prettyStatus: Record<string, string> = {
  open: "Open",
  awarded: "Awarded",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ManageJobsPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);

  const fetchJobs = useCallback(async ({ silent } = { silent: false }) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch("/api/job-requests?scope=mine");
      if (!response.ok) {
        throw new Error("Failed to load job requests");
      }
      const data = await response.json();
      setJobRequests(data.jobRequests ?? []);
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

  const awardApplication = async (jobId: string, application: JobApplication) => {
    try {
      setUpdatingJobId(jobId);
      setError(null);
      const response = await fetch("/api/job-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          status: "awarded",
          selectedApplicationId: application.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to award application");
      }

      setJobRequests((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "awarded",
                selected_application_id: application.id,
                selected_provider_id: application.provider_id,
                selected_provider_name: application.provider_name,
                job_applications: job.job_applications?.map((app) =>
                  app.id === application.id
                    ? { ...app, status: "awarded" }
                    : { ...app, status: "not_selected" }
                ),
              }
            : job
        )
      );

      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError("We couldn’t award this application. Please try again.");
    } finally {
      setUpdatingJobId(null);
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      setUpdatingJobId(jobId);
      setError(null);
      const response = await fetch("/api/job-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update job status");
      }
      setJobRequests((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status } : job))
      );

      await fetchJobs({ silent: true });
    } catch (err) {
      console.error(err);
      setError("We couldn’t update the job status. Please try again.");
    } finally {
      setUpdatingJobId(null);
    }
  };

  const groupedJobs = useMemo(() => {
    return {
      active: jobRequests.filter((job) => job.status === "open" || job.status === "awarded"),
      archived: jobRequests.filter((job) => job.status === "completed" || job.status === "cancelled"),
    };
  }, [jobRequests]);

  const latestNotificationMessage = useMemo(() => {
    if (!latestNotification) return null;
    const payload = latestNotification.payload as Record<string, unknown> | undefined;
    switch (latestNotification.type) {
      case "job_application_received": {
        const providerName = (payload?.providerName as string | undefined) ??
          (payload?.provider_name as string | undefined);
        return `${providerName ?? "A local pro"} just applied to one of your jobs.`;
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
            <h1 className="text-4xl font-bold text-blue-600 mb-3">My Job Requests</h1>
            <p className="text-base-content/70">
              Track winter service requests, review applicant messages, and award jobs to your preferred pro.
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

          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : jobRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center">
              <Inbox className="w-14 h-14 mx-auto text-blue-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No job requests yet</h2>
              <p className="text-base-content/70">
                Post your first fall or winter job request to start receiving applications from trusted local pros.
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
                        {group === "active" ? "Active requests" : "Past requests"}
                      </h2>
                    </div>
                    <div className="grid gap-6">
                      {jobs.map((job) => {
                        const isExpanded = expandedJob === job.id;
                        const badgeClass = statusBadgeClasses[job.status] ?? "badge-ghost";
                        const applications = job.job_applications ?? [];
                        const awardedApplication = applications.find(
                          (app) => app.id === job.selected_application_id
                        );

                        return (
                          <article key={job.id} className="card bg-white shadow-md border border-slate-200">
                            <div className="card-body">
                              <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-semibold text-gray-900">
                                      {job.job_title}
                                    </h3>
                                    <span className={`badge ${badgeClass} text-xs uppercase tracking-wide`}> 
                                      {prettyStatus[job.status] ?? job.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-sm text-blue-700 mb-3">
                                    {getServiceLabels(job.services).map((label) => (
                                      <span key={label} className="badge badge-outline">
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-base-content/70 leading-relaxed mb-4">
                                    {job.description}
                                  </p>
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
                                      <span>{job.address ?? "Location provided to awarded pro"}</span>
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
                                        {job.people ? `${job.people} person crew` : "Crew size flexible"}
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
                                </div>
                                <div className="flex flex-col items-start gap-2">
                                  {job.status === "awarded" && awardedApplication && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                                      <p className="font-semibold flex items-center gap-2">
                                        <Award className="w-4 h-4" /> Awarded to {awardedApplication.provider_name ?? "Selected pro"}
                                      </p>
                                      {renderCurrency(job.agreed_total_amount) && (
                                        <p className="mt-1 text-xs text-blue-600">
                                          Agreed total: ${renderCurrency(job.agreed_total_amount)} CAD
                                        </p>
                                      )}
                                      {job.deposit_invoice_url && (
                                        <a
                                          href={job.deposit_invoice_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-link btn-xs text-blue-600"
                                        >
                                          View deposit invoice
                                        </a>
                                      )}
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
                                  {job.status === "awarded" && (
                                    <div className="dropdown dropdown-end">
                                      <label tabIndex={0} className="btn btn-sm btn-ghost">Update status</label>
                                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 text-sm">
                                        <li>
                                          <button
                                            onClick={() => updateJobStatus(job.id, "completed")}
                                            disabled={updatingJobId === job.id}
                                          >
                                            Mark as completed
                                          </button>
                                        </li>
                                        <li>
                                          <button
                                            onClick={() => updateJobStatus(job.id, "cancelled")}
                                            disabled={updatingJobId === job.id}
                                          >
                                            Cancel request
                                          </button>
                                        </li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </header>

                              {isExpanded && (
                                <section className="mt-6 space-y-6">
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-base-content/80">
                                    <h4 className="font-semibold text-base text-gray-800 mb-2">Additional details</h4>
                                    <p className="mb-2">
                                      <span className="font-medium">Contact preference:</span> {job.contact_preference ?? "ZapTasks messages"}
                                    </p>
                                    {renderCurrency(job.deposit_amount) && (
                                      <p className="mb-2">
                                        <span className="font-medium">Deposit invoice:</span> ${renderCurrency(job.deposit_amount)} CAD
                                      </p>
                                    )}
                                    {renderCurrency(job.remainder_amount) && (
                                      <p className="mb-2">
                                        <span className="font-medium">Remaining balance:</span> ${renderCurrency(job.remainder_amount)} CAD
                                      </p>
                                    )}
                                    {job.remainder_invoice_url && (
                                      <p className="text-xs">
                                        <a
                                          className="link text-blue-600"
                                          href={job.remainder_invoice_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View completion invoice
                                        </a>
                                      </p>
                                    )}
                                    {job.budget_notes && (
                                      <p>
                                        <span className="font-medium">Budget notes:</span> {job.budget_notes}
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="font-semibold text-base text-gray-800 mb-3">
                                      Applicants ({applications.length})
                                    </h4>
                                    {applications.length === 0 ? (
                                      <p className="text-base-content/60 text-sm">
                                        No applications yet. We’ll alert you as soon as local pros respond.
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
                                                  {application.provider_name ?? "Prospective provider"}
                                                </h5>
                                                {application.status === "awarded" && (
                                                  <span className="badge badge-success badge-sm">Awarded</span>
                                                )}
                                                {application.status === "not_selected" && (
                                                  <span className="badge badge-ghost badge-sm">Not selected</span>
                                                )}
                                              </div>
                                              <p className="text-xs text-base-content/60 mb-2">
                                                Applied on {format(new Date(application.created_at), "MMM d, yyyy" )}
                                              </p>
                                              {application.message && (
                                                <p className="text-sm text-base-content/80 leading-relaxed">
                                                  {application.message}
                                                </p>
                                              )}
                                              <div className="flex flex-wrap gap-3 text-xs text-base-content/70 mt-3">
                                                {application.proposed_rate && (
                                                  <span className="badge badge-outline">
                                                    Proposed {application.proposed_rate_type === "hourly" ? "hourly" : "flat"}: ${application.proposed_rate}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                              {job.status === "open" && (
                                                <button
                                                  className="btn btn-primary btn-sm"
                                                  onClick={() => awardApplication(job.id, application)}
                                                  disabled={updatingJobId === job.id}
                                                >
                                                  {updatingJobId === job.id ? "Awarding..." : "Award job"}
                                                </button>
                                              )}
                                              {job.status === "awarded" && application.id === job.selected_application_id && (
                                                <button
                                                  className="btn btn-outline btn-sm"
                                                  onClick={() => updateJobStatus(job.id, "completed")}
                                                  disabled={updatingJobId === job.id}
                                                >
                                                  {updatingJobId === job.id ? "Updating..." : "Mark completed"}
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
    </div>
  );
};

export default ManageJobsPage;
