import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(cookies());
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, payload, created_at, read_at")
    .eq("user_id", userId)
    .is("audience", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: data });
}

export async function PATCH(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ error: "Missing notification ID." }, { status: 400 });
    }

    const supabase = createClient(cookies());
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return NextResponse.json({ error: "Failed to mark as read." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error handling notification PATCH:", err);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
