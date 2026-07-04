import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser, createServiceRoleClient } from "@/app/utils/supabase/server";

const TARGET_TYPES = new Set(["job_request", "review", "message", "user"]);
const MAX_REPORTS_PER_DAY = 10;

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const targetType = typeof body?.targetType === "string" ? body.targetType : null;
    const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const details = typeof body?.details === "string" ? body.details.trim() : "";

    if (!targetType || !TARGET_TYPES.has(targetType)) {
      return NextResponse.json({ error: "Invalid report target type" }, { status: 400 });
    }

    if (!targetId) {
      return NextResponse.json({ error: "Missing report target id" }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "A reason is required" }, { status: 400 });
    }

    if (details.length > 2000) {
      return NextResponse.json({ error: "Details are too long" }, { status: 400 });
    }

    // Naive rate limit: this uses the service-role client purely to count
    // across the reporter's own history (RLS would already scope a
    // client-authed count to just this user, but a count query needs no
    // per-row exposure so the lighter service client is fine here too).
    const serviceClient = createServiceRoleClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentReports } = await serviceClient
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", userId)
      .gte("created_at", since);

    if ((recentReports ?? 0) >= MAX_REPORTS_PER_DAY) {
      return NextResponse.json(
        { error: "You've reached the daily limit for reports. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const supabase = await createClientWithUser(userId);
    const { data: inserted, error: insertError } = await supabase
      .from("reports")
      .insert({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details || null,
      })
      .select("id, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("Failed to store report", insertError);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ report: inserted });
  } catch (error) {
    console.error("Failed to submit report", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
