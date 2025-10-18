import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient, createClientWithUser } from "@/app/utils/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, message, proposedRate, proposedRateType, providerName, providerEmail } = body;

    if (!jobId || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: jobRequest, error: jobError } = await supabase
      .from("job_requests")
      .select("id, homeowner_id")
      .eq("id", jobId)
      .single();

    if (jobError || !jobRequest) {
      return NextResponse.json({ error: "Job request not found." }, { status: 404 });
    }

    const { data: existingApplication } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_request_id", jobId)
      .eq("provider_id", userId)
      .maybeSingle();

    if (existingApplication) {
      return NextResponse.json({ error: "You have already applied to this job." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_request_id: jobId,
        provider_id: userId,
        provider_name: providerName,
        provider_email: providerEmail,
        message,
        proposed_rate: proposedRate ?? null,
        proposed_rate_type: proposedRateType ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error inserting job application:", error);
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
    }

    await supabase.from("notifications").insert([
      {
        user_id: jobRequest.homeowner_id,
        type: "job_application_received",
        payload: {
          jobId,
          applicationId: data.id,
          providerId: userId,
          providerName,
        },
      },
      {
        user_id: userId,
        type: "job_application_submitted",
        payload: {
          jobId,
          applicationId: data.id,
        },
      },
    ]);

    return NextResponse.json({ applicationId: data.id, createdAt: data.created_at });
  } catch (error) {
    console.error("Error handling job application POST:", error);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClientWithUser(userId);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "mine") {
    const { data, error } = await supabase
      .from("job_applications")
      .select("*, job_requests(job_title, homeowner_name, status)")
      .eq("provider_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
    }

    return NextResponse.json({ applications: data });
  }

  if (scope === "for-job") {
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID." }, { status: 400 });
    }

    const { data: jobRequest, error: jobError } = await supabase
      .from("job_requests")
      .select("homeowner_id")
      .eq("id", jobId)
      .single();

    if (jobError || !jobRequest || jobRequest.homeowner_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to view applicants." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_request_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job applicants:", error);
      return NextResponse.json({ error: "Failed to load applicants." }, { status: 500 });
    }

    return NextResponse.json({ applications: data });
  }

  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}
