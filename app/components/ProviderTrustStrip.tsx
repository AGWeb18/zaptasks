"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, BadgeCheck, ExternalLink } from "lucide-react";

interface Reputation {
  verified: boolean;
  completedJobs: number;
  averageRating: number | null;
  reviewCount: number;
  memberSince: string | null;
}

// Module-level cache so the same helper applying to multiple jobs (or being
// re-rendered) doesn't trigger duplicate network calls within a session.
const reputationCache = new Map<string, Reputation>();

const formatMemberSince = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export default function ProviderTrustStrip({
  providerId,
}: {
  providerId: string;
}) {
  const [rep, setRep] = useState<Reputation | null>(
    reputationCache.get(providerId) ?? null
  );
  const [loading, setLoading] = useState(!reputationCache.has(providerId));

  useEffect(() => {
    if (reputationCache.has(providerId)) {
      setRep(reputationCache.get(providerId)!);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/providers/${providerId}/reputation`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const next: Reputation = {
          verified: Boolean(data.verified),
          completedJobs: data.completedJobs ?? 0,
          averageRating:
            typeof data.averageRating === "number" ? data.averageRating : null,
          reviewCount: data.reviewCount ?? 0,
          memberSince: data.memberSince ?? null,
        };
        reputationCache.set(providerId, next);
        setRep(next);
      })
      .catch(() => {
        /* trust strip is non-critical — fail quietly */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  if (loading) {
    return (
      <div className="h-6 w-44 animate-pulse rounded-full bg-slate-100" />
    );
  }

  if (!rep) {
    return (
      <Link
        href={`/providers/${providerId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
      >
        View full profile
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  const memberSince = formatMemberSince(rep.memberSince);
  const isNewHelper = rep.reviewCount === 0 && rep.completedJobs === 0;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {rep.averageRating != null ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 border border-amber-100">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          {rep.averageRating.toFixed(1)}
          <span className="font-normal text-amber-600/80">
            ({rep.reviewCount})
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 border border-blue-100">
          New helper
        </span>
      )}

      {rep.completedJobs > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 border border-slate-200">
          <BadgeCheck className="h-3.5 w-3.5 text-slate-500" />
          {rep.completedJobs} job{rep.completedJobs === 1 ? "" : "s"} done
        </span>
      )}

      {rep.verified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 border border-emerald-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          ID verified
        </span>
      )}

      {isNewHelper && memberSince && (
        <span className="text-slate-400">Joined {memberSince}</span>
      )}

      <Link
        href={`/providers/${providerId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
      >
        View full profile
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
