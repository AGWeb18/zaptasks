import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";

type RespondParams = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(req: NextRequest, context: RespondParams) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const reviewId = params?.reviewId;
    if (!reviewId) {
      return NextResponse.json({ error: "Missing review id" }, { status: 400 });
    }

    const payload = await req.json().catch(() => null);
    const response = typeof payload?.response === "string" ? payload.response.trim() : "";

    if (!response) {
      return NextResponse.json({ error: "Response cannot be empty" }, { status: 400 });
    }

    if (response.length > 1000) {
      return NextResponse.json({ error: "Response is too long" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    // RLS ("providers_respond_to_own_reviews") independently enforces that
    // this row belongs to the calling provider and has no existing response
    // yet -- this select just gives us a clean 404/409 instead of a raw
    // Postgres permission error when that's not the case.
    const { data: review, error: reviewError } = await supabase
      .from("provider_reviews")
      .select("id, provider_id, provider_response")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.provider_id !== userId) {
      return NextResponse.json({ error: "You can only respond to your own reviews" }, { status: 403 });
    }

    if (review.provider_response) {
      return NextResponse.json({ error: "You have already responded to this review" }, { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("provider_reviews")
      .update({
        provider_response: response,
        provider_response_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select("id, provider_response, provider_response_at")
      .single();

    if (updateError || !updated) {
      console.error("Failed to store review response", updateError);
      return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
    }

    return NextResponse.json({ review: updated });
  } catch (error) {
    console.error("Failed to respond to review", error);
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
  }
}
