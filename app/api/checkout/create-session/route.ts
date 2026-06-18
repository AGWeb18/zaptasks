import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import { buildEscrowSchedule, stripe } from "@/app/lib/payments/stripeConnect";

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { jobId?: string };

    if (!body?.jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        "id, job_title, description, total_amount_cents, job_status, homeowner_id, stripe_customer_id, provider_stripe_account_id"
      )
      .eq("id", body.jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "You cannot pay for this job" }, { status: 403 });
    }

    if (!job.provider_stripe_account_id) {
      return NextResponse.json(
        { error: "Helper has not completed payment setup yet" },
        { status: 400 }
      );
    }

    if (!job.total_amount_cents || job.total_amount_cents <= 0) {
      return NextResponse.json({ error: "Job has no payment amount set" }, { status: 400 });
    }

    const schedule = buildEscrowSchedule(job.total_amount_cents);
    const amountCents = schedule.amounts.escrowCents;
    const platformFeeCents = schedule.amounts.platformFeeEscrowCents;

    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("host") ?? "localhost:3000";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: amountCents,
            product_data: {
              name: job.job_title,
              description: job.description
                ? String(job.description).slice(0, 500)
                : undefined,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: job.provider_stripe_account_id },
        capture_method: "manual",
        metadata: {
          jobId: body.jobId,
          paymentType: "escrow",
          providerStripeAccountId: job.provider_stripe_account_id,
          platformFeeCents: String(platformFeeCents),
        },
        transfer_group: body.jobId,
      },
      ...(job.stripe_customer_id ? { customer: job.stripe_customer_id } : {}),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&job_id=${encodeURIComponent(body.jobId)}`,
      cancel_url: `${appUrl}/manage-booking/${encodeURIComponent(body.jobId)}`,
      metadata: {
        jobId: body.jobId,
        paymentType: "escrow",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
