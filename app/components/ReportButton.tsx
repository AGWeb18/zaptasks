"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

type TargetType = "job_request" | "review" | "message" | "user";

const REASONS_BY_TARGET: Record<TargetType, string[]> = {
  job_request: ["Scam or fake job", "Inappropriate content", "Spam", "Other"],
  review: ["Fake or fraudulent review", "Harassment or abuse", "Off-topic / spam", "Other"],
  message: ["Attempting to pay off-platform", "Harassment or abuse", "Scam attempt", "Other"],
  user: ["Suspected scam", "No-show / didn't pay", "Harassment", "Other"],
};

export default function ReportButton({
  targetType,
  targetId,
  label = "Report",
  className = "",
}: {
  targetType: TargetType;
  targetId: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS_BY_TARGET[targetType][0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Couldn't submit your report.");
        return;
      }
      setDone(true);
    } catch (err) {
      console.error(err);
      setError("Couldn't submit your report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 ${className}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3 w-3" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            {done ? (
              <>
                <p className="text-sm text-slate-700">
                  Thanks -- our team will take a look.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setOpen(false);
                      setDone(false);
                      setDetails("");
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Report this</h3>
                <select
                  className="select select-bordered select-sm w-full"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                >
                  {REASONS_BY_TARGET[targetType].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <textarea
                  className="textarea textarea-bordered w-full text-sm"
                  rows={3}
                  maxLength={2000}
                  placeholder="Any extra detail (optional)"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                />
                {error && (
                  <p className="text-xs text-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={submitting}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={submitting}
                    onClick={() => void submit()}
                  >
                    {submitting ? "Sending..." : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
