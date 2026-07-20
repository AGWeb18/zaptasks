import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/utils/supabase/server";

// Pinged once a day by Vercel Cron (see vercel.json) so the free-tier
// Supabase project never goes a week without activity and gets paused.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_requests")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    console.error("Supabase keep-alive failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
