import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "mine") {
    const { data, error } = await supabase
      .from("job_requests")
      .select("*, job_applications(*)")
      .eq("homeowner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching homeowner job requests:", error);
      return NextResponse.json({ error: "Failed to load job requests." }, { status: 500 });
    }

    return NextResponse.json({ jobRequests: data });
  }

  if (scope === "open") {
    const { data, error } = await supabase
      .from("job_requests")
      .select("*, job_applications(provider_id)")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching open job requests:", error);
      return NextResponse.json({ error: "Failed to load open jobs." }, { status: 500 });
    }

    return NextResponse.json({ jobRequests: data });
  }

  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.jobTitle || !Array.isArray(body.services) || body.services.length === 0) {
      return NextResponse.json({ error: "Missing required job details." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_requests")
      .insert({
        homeowner_id: body.homeownerId,
        homeowner_name: body.homeownerName,
        homeowner_email: body.homeownerEmail,
        job_title: body.jobTitle,
        services: body.services,
        description: body.description,
        service_date: body.date || null,
        service_time: body.time || null,
        hours: body.hours,
        people: body.people,
        bring_equipment: body.bringEquipment,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        budget_type: body.budget?.type,
        budget_amount: body.budget?.amount,
        budget_notes: body.budget?.notes,
        contact_preference: body.contactPreference,
        photo_urls: Array.isArray(body.photoUrls) && body.photoUrls.length > 0 ? body.photoUrls : null,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error inserting job request:", error);
      return NextResponse.json({ error: "Failed to store job request." }, { status: 500 });
    }

    if (data?.id) {
      const notificationPayload = {
        jobId: data.id,
        jobTitle: body.jobTitle,
        services: body.services,
        serviceDate: body.date,
        serviceTime: body.time,
      };

      await supabase.from("notifications").insert([
        {
          user_id: body.homeownerId,
          type: "job_posted_confirmation",
          payload: notificationPayload,
        },
      ]);
    }

    return NextResponse.json({ jobId: data?.id });
  } catch (error) {
    console.error("Error handling job request POST:", error);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, status } = body ?? {};

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: jobRequest, error: jobError } = await supabase
      .from("job_requests")
      .select("id, homeowner_id")
      .eq("id", jobId)
      .single();

    if (jobError || !jobRequest || jobRequest.homeowner_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to update this job." }, { status: 403 });
    }

    if (body?.selectedApplicationId) {
      return NextResponse.json({
        error: "Use POST /api/jobs to award applications and set up escrow.",
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("job_requests")
      .update({ status })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job request:", updateError);
      return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Error handling job request PATCH:", error);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
