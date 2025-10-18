import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { createClientWithUser } from "@/app/utils/supabase/server";
import {
  cancelJobPaymentIntent,
  refundJobPaymentIntent,
  stripe,
} from "@/app/lib/payments/stripeConnect";
import type { JobPaymentRecord } from "@/app/api/jobs/types";

type CancelJobParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: CancelJobParams) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const jobId = params?.id;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const supabase = await createClientWithUser(userId);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, job_requests(id), payments(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.homeowner_id !== userId) {
      return NextResponse.json({ error: "Only the homeowner can cancel" }, { status: 403 });
    }

    const payments: JobPaymentRecord[] = Array.isArray(job.payments)
      ? (job.payments as JobPaymentRecord[])
      : [];
    const refundResults: Array<{ paymentId: string; action: string }> = [];

    for (const payment of payments) {
      if (!payment.stripe_payment_intent_id) {
        continue;
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
      );

      let action = "noop";

      if (paymentIntent.status === "succeeded") {
        await refundJobPaymentIntent({ paymentIntentId: paymentIntent.id });
        action = "refunded";
        await supabase
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("id", payment.id);
      } else if (
        paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "requires_payment_method" ||
        paymentIntent.status === "requires_confirmation"
      ) {
        await cancelJobPaymentIntent(paymentIntent.id);
        action = "canceled";
        await supabase
          .from("payments")
          .update({ status: "canceled" })
          .eq("id", payment.id);
      }

      refundResults.push({ paymentId: String(payment.id), action });
    }

    await supabase
      .from("jobs")
      .update({ job_status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (job.job_requests?.id) {
      await supabase
        .from("job_requests")
        .update({ status: "cancelled" })
        .eq("id", job.job_requests.id);
    }

    await supabase.from("payment_logs").insert({
      job_id: jobId,
      action: "job_canceled",
      payload: { refundResults },
    });

    return NextResponse.json({ success: true, refundResults });
  } catch (error) {
    console.error("Failed to cancel job:", error);
    return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
  }
}
