import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";

function isAuthorizedAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const adminList = process.env.ZAPTASKS_ADMIN_IDS?.split(",").map((id) => id.trim()).filter(Boolean);
  if (!adminList || adminList.length === 0) return false;
  return adminList.includes(userId);
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!isAuthorizedAdmin(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClientWithUser(userId ?? "");

    const { data: disputes, error } = await supabase
      .from("disputes")
      .select("*, jobs(*, job_requests(*), payments(*))")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load disputes", error);
      return NextResponse.json({ error: "Failed to load disputes" }, { status: 500 });
    }

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("Failed to list disputes:", error);
    return NextResponse.json({ error: "Failed to list disputes" }, { status: 500 });
  }
}
