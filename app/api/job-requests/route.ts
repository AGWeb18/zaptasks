import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@/app/utils/supabase/server";
import {
  createJobInvoices,
  getOrCreateCustomer,
} from "@/app/lib/payments/stripeConnect";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(cookies());
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

    const supabase = createClient(cookies());
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
    const { jobId, status, selectedApplicationId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID." }, { status: 400 });
    }

    const supabase = createClient(cookies());

    const { data: jobRequest, error: jobError } = await supabase
      .from("job_requests")
      .select(
        "*, job_applications(id, provider_id, provider_name, provider_email, proposed_rate, proposed_rate_type, status)"
      )
      .eq("id", jobId)
      .single();

    if (jobError || !jobRequest || jobRequest.homeowner_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to update this job." }, { status: 403 });
    }

    const allowedStatuses = ["open", "awarded", "completed", "cancelled"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    let updatePayload: Record<string, unknown> = {};
    const notificationsToInsert: Array<Record<string, unknown>> = [];

    if (status) {
      updatePayload.status = status;
    }

    if (status === "awarded" && selectedApplicationId) {
      const selectedApplication = jobRequest.job_applications?.find(
        (app: { id: string }) => app.id === selectedApplicationId
      );

      if (!selectedApplication) {
        return NextResponse.json({ error: "Selected application not found." }, { status: 404 });
      }

      const { data: providerRecord, error: providerLookupError } = await supabase
        .from("providers")
        .select("id, stripe_account_id, user_id")
        .eq("user_id", selectedApplication.provider_id)
        .maybeSingle();

      if (providerLookupError || !providerRecord?.stripe_account_id) {
        return NextResponse.json({ error: "Selected pro has not completed Stripe Connect onboarding." }, { status: 400 });
      }

      const amountCandidate = (() => {
        if (selectedApplication.proposed_rate && selectedApplication.proposed_rate > 0) {
          if (selectedApplication.proposed_rate_type === "hourly" && jobRequest.hours) {
            return selectedApplication.proposed_rate * jobRequest.hours;
          }
          return selectedApplication.proposed_rate;
        }
        if (jobRequest.budget_amount && jobRequest.budget_amount > 0) {
          if (jobRequest.budget_type === "hourly" && jobRequest.hours) {
            return jobRequest.budget_amount * jobRequest.hours;
          }
          return jobRequest.budget_amount;
        }
        return null;
      })();

      if (!amountCandidate || Number.isNaN(amountCandidate) || amountCandidate <= 0) {
        return NextResponse.json({ error: "Unable to determine a total amount for this job." }, { status: 400 });
      }

      const customerId = await getOrCreateCustomer({
        email: jobRequest.homeowner_email,
        name: jobRequest.homeowner_name,
      });

      const invoiceMetadata = {
        services: jobRequest.services.join(", "),
        date: jobRequest.service_date ?? "",
        time: jobRequest.service_time ?? "",
        description: jobRequest.description ?? "",
      };

      const serviceDate = jobRequest.service_date ? new Date(jobRequest.service_date) : null;
      const remainderDaysUntilDue = serviceDate
        ? Math.max(
            1,
            Math.ceil(
              (serviceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ) + 30,
          )
        : 30;

      const invoices = await createJobInvoices({
        amount: amountCandidate,
        customerId,
        providerStripeAccountId: providerRecord.stripe_account_id,
        metadata: invoiceMetadata,
        remainderDaysUntilDue,
      });

      updatePayload = {
        ...updatePayload,
        selected_application_id: selectedApplication.id,
        selected_provider_id: selectedApplication.provider_id,
        selected_provider_name: selectedApplication.provider_name,
        agreed_total_amount: amountCandidate,
        deposit_amount: Number((invoices.totals.depositInvoiceCents / 100).toFixed(2)),
        remainder_amount: Number((invoices.totals.remainderInvoiceCents / 100).toFixed(2)),
        deposit_invoice_id: invoices.depositInvoiceId,
        deposit_invoice_url: invoices.depositInvoiceUrl,
        remainder_invoice_id: invoices.remainderInvoiceId,
        remainder_invoice_url: invoices.remainderInvoiceUrl,
      };

      await supabase
        .from("job_applications")
        .update({ status: "awarded" })
        .eq("id", selectedApplicationId);

      await supabase
        .from("job_applications")
        .update({ status: "not_selected" })
        .eq("job_request_id", jobId)
        .neq("id", selectedApplicationId);

      notificationsToInsert.push(
        {
          user_id: selectedApplication.provider_id,
          type: "job_application_awarded",
          payload: {
            jobId,
            applicationId: selectedApplication.id,
            depositInvoiceUrl: invoices.depositInvoiceUrl,
          },
        },
        {
          user_id: jobRequest.homeowner_id,
          type: "job_awarded_invoices_sent",
          payload: {
            jobId,
            depositInvoiceId: invoices.depositInvoiceId,
            depositInvoiceUrl: invoices.depositInvoiceUrl,
            remainderInvoiceId: invoices.remainderInvoiceId,
            remainderInvoiceUrl: invoices.remainderInvoiceUrl,
          },
        }
      );
    }

    const { error: updateError } = await supabase
      .from("job_requests")
      .update(updatePayload)
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job request:", updateError);
      return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return NextResponse.json({
      success: true,
      status,
      depositInvoiceUrl: (updatePayload as Record<string, unknown>).deposit_invoice_url ?? null,
      remainderInvoiceUrl: (updatePayload as Record<string, unknown>).remainder_invoice_url ?? null,
      agreedTotalAmount: (updatePayload as Record<string, unknown>).agreed_total_amount ?? null,
      depositAmount: (updatePayload as Record<string, unknown>).deposit_amount ?? null,
      remainderAmount: (updatePayload as Record<string, unknown>).remainder_amount ?? null,
    });
  } catch (error) {
    console.error("Error handling job request PATCH:", error);
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
