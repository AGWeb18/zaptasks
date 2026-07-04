"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

interface HomeownerReputation {
  jobsPosted: number;
  jobsCompleted: number;
  jobsPaid: number;
  memberSince: string | null;
}

// Module-level cache mirrors ProviderTrustStrip's pattern so the same poster
// appearing across multiple job cards doesn't trigger duplicate fetches.
const reputationCache = new Map<string, HomeownerReputation>();

const formatMemberSince = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export default function HomeownerTrustStrip({
  homeownerId,
}: {
  homeownerId: string;
}) {
  const [rep, setRep] = useState<HomeownerReputation | null>(
    reputationCache.get(homeownerId) ?? null
  );
  const [loading, setLoading] = useState(!reputationCache.has(homeownerId));

  useEffect(() => {
    if (reputationCache.has(homeownerId)) {
      setRep(reputationCache.get(homeownerId)!);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/homeowners/${homeownerId}/reputation`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const next: HomeownerReputation = {
          jobsPosted: data.jobsPosted ?? 0,
          jobsCompleted: data.jobsCompleted ?? 0,
          jobsPaid: data.jobsPaid ?? 0,
          memberSince: data.memberSince ?? null,
        };
        reputationCache.set(homeownerId, next);
        setRep(next);
      })
      .catch(() => {
        /* trust strip is non-critical -- fail quietly */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [homeownerId]);

  if (loading) {
    return <div className="h-6 w-36 animate-pulse rounded-full bg-slate-100" />;
  }

  if (!rep) {
    return null;
  }

  const memberSince = formatMemberSince(rep.memberSince);
  const isNewPoster = rep.jobsPosted === 0;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {rep.jobsPaid > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 border border-emerald-100">
          <BadgeCheck className="h-3.5 w-3.5" />
          {rep.jobsPaid} job{rep.jobsPaid === 1 ? "" : "s"} paid through ZapTasks
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 border border-blue-100">
          New poster
        </span>
      )}

      {!isNewPoster && memberSince && (
        <span className="text-slate-400">Member since {memberSince}</span>
      )}
    </div>
  );
}
