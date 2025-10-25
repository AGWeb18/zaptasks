import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClient, createClientWithUser } from "@/app/utils/supabase/server";
import {
  buildEscrowSchedule,
  createJobPaymentIntent,
  getOrCreateCustomer,
  stripe,
} from "@/app/lib/payments/stripeConnect";
import type { JobPaymentRecord } from "@/app/api/jobs/types";

type PostJobPayload = {
  jobRequestId: string;
  applicationId: string;
  overrideTotalAmount?: number;
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClientWithUser(userId);
    const { searchParams } = new URL(req.url);
    const jobRequestId = searchParams.get("jobRequestId");
    const scope = searchParams.get("scope") ?? "homeowner";

    let query = supabase
      .from("jobs")
      .select("*, job_requests(*), payments(*), job_milestones(*), provider_reviews(*)")
      .order("created_at", { ascending: false });

    if (jobRequestId) {
      query = query.eq("job_request_id", jobRequestId);
    }

    if (scope === "provider") {
      query = query.eq("provider_id", userId);
    } else {
      query = query.eq("homeowner_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load jobs", error);
      return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
    }

    const jobs = Array.isArray(data) ? data : [];

    for (const job of jobs) {
      if (!Array.isArray(job.payments)) continue;

      const payments = job.payments as JobPaymentRecord[];

      for (const payment of payments) {
        if (!payment?.stripe_payment_intent_id) continue;

        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            payment.stripe_payment_intent_id,
          );

          if (paymentIntent.status !== payment.status) {
            await supabase
              .from("payments")
              .update({ status: paymentIntent.status })
              .eq("id", payment.id);
            payment.status = paymentIntent.status;
          }
        } catch (statusError) {
          console.warn("Failed to refresh payment status", statusError);
        }
      }
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to list jobs:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as PostJobPayload | null;

    if (!body?.jobRequestId || !body?.applicationId) {
      return NextResponse.json({ error: "Missing job request or application id" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: jobRequest, error: jobRequestError } = await supabase
      .from("job_requests")
      .select(
        "*, job_applications(id, provider_id, provider_name, provider_email, proposed_rate, proposed_rate_type, status)"
      )
      .eq("id", body.jobRequestId)
      .single();

    if (jobRequestError || !jobRequest) {
      return NextResponse.json({ error: "Job request not found" }, { status: 404 });
    }

    if (jobRequest.homeowner_id !== userId) {
      return NextResponse.json({ error: "You cannot award this job" }, { status: 403 });
    }

    const selectedApplication = jobRequest.job_applications?.find(
      (app: { id: string }) => app.id === body.applicationId,
    );

    if (!selectedApplication) {
      return NextResponse.json({ error: "Selected application not found" }, { status: 404 });
    }

    const { data: providerRecord, error: providerLookupError } = await supabase
      .from("providers")
      .select("id, stripe_account_id, user_id")
      .eq("user_id", selectedApplication.provider_id)
      .maybeSingle();

    if (providerLookupError) {
      console.error("Failed to look up provider record", providerLookupError);
      return NextResponse.json({ error: "Unable to look up provider" }, { status: 500 });
    }

    let providerStripeAccountId = providerRecord?.stripe_account_id ?? null;

    if (!providerStripeAccountId) {
      const { data: historicalJob } = await supabase
        .from("jobs")
        .select("provider_stripe_account_id")
        .eq("provider_id", selectedApplication.provider_id)
        .eq("homeowner_id", userId)
        .not("provider_stripe_account_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historicalJob?.provider_stripe_account_id) {
        providerStripeAccountId = historicalJob.provider_stripe_account_id;
      }
    }

    let providerNeedsOnboarding = !providerStripeAccountId;
    if (providerStripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(providerStripeAccountId);
        const requirementsDue = account.requirements?.currently_due ?? [];
        const accountReady =
          Boolean(account.charges_enabled) &&
          Boolean(account.payouts_enabled) &&
          requirementsDue.length === 0;

        providerNeedsOnboarding = !accountReady;
      } catch (error) {
        console.warn("Failed to validate provider Stripe account", error);
        providerNeedsOnboarding = true;
      }
    }

    const amountFromPayload =
      typeof body.overrideTotalAmount === "number"
        ? body.overrideTotalAmount
        : null;

    const derivedAmount = (() => {
      if (amountFromPayload && amountFromPayload > 0) {
        return amountFromPayload;
      }

      if (
        selectedApplication.proposed_rate &&
        selectedApplication.proposed_rate > 0
      ) {
        if (
          selectedApplication.proposed_rate_type === "hourly" &&
          jobRequest.hours
        ) {
          return Number(selectedApplication.proposed_rate) * jobRequest.hours;
        }
        return Number(selectedApplication.proposed_rate);
      }

      if (jobRequest.budget_amount && jobRequest.budget_amount > 0) {
        if (jobRequest.budget_type === "hourly" && jobRequest.hours) {
          return Number(jobRequest.budget_amount) * jobRequest.hours;
        }
        return Number(jobRequest.budget_amount);
      }

      return null;
    })();

    if (!derivedAmount || Number.isNaN(derivedAmount) || derivedAmount <= 0) {
      return NextResponse.json({ error: "Unable to determine job total" }, { status: 400 });
    }

    const totalAmountCents = Math.round(Number(derivedAmount) * 100);

    const customerId = await getOrCreateCustomer({
      email: jobRequest.homeowner_email,
      name: jobRequest.homeowner_name,
    });

    const schedule = buildEscrowSchedule(totalAmountCents);

    const { data: insertedJob, error: insertJobError } = await supabase
      .from("jobs")
      .insert({
        job_request_id: jobRequest.id,
        homeowner_id: jobRequest.homeowner_id,
        provider_id: selectedApplication.provider_id,
        stripe_customer_id: customerId,
        provider_stripe_account_id: providerStripeAccountId,
        total_amount_cents: totalAmountCents,
        escrow_amount_cents: schedule.amounts.escrowCents,
        escrow_percentage: schedule.escrowPercentage,
        platform_fee_cents: schedule.amounts.platformFeeTotalCents,
        platform_fee_rate: schedule.platformFeeRate,
        milestone_plan: schedule,
        job_status: providerNeedsOnboarding ? "awaiting_provider_onboarding" : "awaiting_escrow",
      })
      .select()
      .single();

    if (insertJobError || !insertedJob) {
      console.error("Failed to insert job", insertJobError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    if (schedule.amounts.progressCents > 0) {
      await supabase.from("job_milestones").insert({
        job_id: insertedJob.id,
        label: "Mid-job progress payment",
        percentage: schedule.progressPercentage,
        amount_cents: schedule.amounts.progressCents,
      });
    }

    const escrowAmount = schedule.amounts.escrowCents;
    let escrowPaymentIntentResult: Awaited<ReturnType<typeof createJobPaymentIntent>> | null = null;

    if (escrowAmount > 0 && providerStripeAccountId) {
      escrowPaymentIntentResult = await createJobPaymentIntent({
        jobId: insertedJob.id,
        amountCents: escrowAmount,
        platformFeeCents: schedule.amounts.platformFeeEscrowCents,
        customerId,
        providerStripeAccountId,
        paymentType: "escrow",
        captureMethod: "automatic",
        metadata: {
          homeownerName: jobRequest.homeowner_name ?? undefined,
          providerName: selectedApplication.provider_name ?? undefined,
          jobTitle: jobRequest.job_title ?? undefined,
        },
      });

      const { error: insertPaymentError } = await supabase.from("payments").insert({
        job_id: insertedJob.id,
        stripe_payment_intent_id: escrowPaymentIntentResult.id,
        amount_cents: escrowAmount,
        platform_fee_cents: schedule.amounts.platformFeeEscrowCents,
        status: escrowPaymentIntentResult.status,
        payment_type: "escrow",
      });

      if (insertPaymentError) {
        console.error("Failed to record escrow payment", insertPaymentError);
        return NextResponse.json({ error: "Failed to record escrow payment" }, { status: 500 });
      }
    }

    const depositAmountDisplay = schedule.amounts.escrowCents / 100;
    const remainderAmountDisplay =
      (schedule.amounts.progressCents + schedule.amounts.completionCents) / 100;

    await supabase.from("job_requests").update({
      status: "awarded",
      selected_application_id: selectedApplication.id,
      selected_provider_id: selectedApplication.provider_id,
      selected_provider_name: selectedApplication.provider_name,
      agreed_total_amount: Number((totalAmountCents / 100).toFixed(2)),
      deposit_amount: Number(depositAmountDisplay.toFixed(2)),
      remainder_amount: Number(remainderAmountDisplay.toFixed(2)),
      deposit_invoice_id: null,
      deposit_invoice_url: null,
      remainder_invoice_id: null,
      remainder_invoice_url: null,
    }).eq("id", jobRequest.id);

    await supabase
      .from("job_applications")
      .update({ status: "awarded" })
      .eq("id", selectedApplication.id);

    await supabase
      .from("job_applications")
      .update({ status: "not_selected" })
      .eq("job_request_id", jobRequest.id)
      .neq("id", selectedApplication.id);

    await supabase.from("notifications").insert([
      providerNeedsOnboarding
        ? {
            user_id: selectedApplication.provider_id,
            type: "job_application_awarded_onboarding",
            payload: {
              jobId: jobRequest.id,
              jobTitle: jobRequest.job_title,
              message: "Finish Stripe payouts to unlock escrow deposits.",
            },
          }
        : {
            user_id: selectedApplication.provider_id,
            type: "job_application_awarded",
            payload: {
              jobId: jobRequest.id,
              jobTitle: jobRequest.job_title,
            },
          },
      {
        user_id: jobRequest.homeowner_id,
        type: providerNeedsOnboarding
          ? "job_awarded_onboarding_pending"
          : "job_awarded_escrow_required",
        payload: {
          jobId: jobRequest.id,
          jobTitle: jobRequest.job_title,
          tier: schedule.tier,
          escrowCents: schedule.amounts.escrowCents,
          remainderCents:
            schedule.amounts.progressCents + schedule.amounts.completionCents,
        },
      },
    ]);

    return NextResponse.json({
      job: insertedJob,
      schedule,
      escrowPaymentIntent: escrowPaymentIntentResult
        ? {
            id: escrowPaymentIntentResult.id,
            clientSecret: escrowPaymentIntentResult.client_secret,
            status: escrowPaymentIntentResult.status,
          }
        : null,
      requiresProviderOnboarding: providerNeedsOnboarding,
    });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
