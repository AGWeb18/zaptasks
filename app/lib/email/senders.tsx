import { sendEmail } from "./send";
import { JobAwardedProvider } from "./templates/JobAwardedProvider";
import { JobAwardedHomeowner } from "./templates/JobAwardedHomeowner";
import { PaymentSecured } from "./templates/PaymentSecured";
import { JobCompleted } from "./templates/JobCompleted";
import { DisputeOpened } from "./templates/DisputeOpened";
import { DisputeResolved } from "./templates/DisputeResolved";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://zaptasks.ca";

export async function sendJobAwardedEmails({
  providerEmail,
  providerName,
  homeownerEmail,
  homeownerName,
  jobTitle,
  totalAmountCents,
  escrowAmountCents,
  needsOnboarding,
}: {
  providerEmail: string | null | undefined;
  providerName: string;
  homeownerEmail: string | null | undefined;
  homeownerName: string;
  jobTitle: string;
  totalAmountCents: number;
  escrowAmountCents: number;
  needsOnboarding: boolean;
}) {
  const totalDollars = (totalAmountCents / 100).toFixed(2);
  const escrowDollars = (escrowAmountCents / 100).toFixed(2);

  await Promise.all([
    sendEmail({
      to: providerEmail,
      subject: `You've been hired: ${jobTitle}`,
      template: (
        <JobAwardedProvider
          providerName={providerName}
          homeownerName={homeownerName}
          jobTitle={jobTitle}
          totalAmountDollars={totalDollars}
          needsOnboarding={needsOnboarding}
          actionUrl={needsOnboarding ? `${appUrl}/pro/onboard` : `${appUrl}/pro/jobs`}
        />
      ),
    }),
    sendEmail({
      to: homeownerEmail,
      subject: needsOnboarding
        ? `Waiting for ${providerName} to finish setup — ${jobTitle}`
        : `Fund escrow to get started — ${jobTitle}`,
      template: (
        <JobAwardedHomeowner
          homeownerName={homeownerName}
          providerName={providerName}
          jobTitle={jobTitle}
          escrowAmountDollars={escrowDollars}
          needsOnboarding={needsOnboarding}
          actionUrl={`${appUrl}/manage-booking`}
        />
      ),
    }),
  ]);
}

export async function sendPaymentSecuredEmails({
  homeownerEmail,
  homeownerName,
  providerEmail,
  providerName,
  jobTitle,
  amountCents,
}: {
  homeownerEmail: string | null | undefined;
  homeownerName: string;
  providerEmail: string | null | undefined;
  providerName: string;
  jobTitle: string;
  amountCents: number;
}) {
  const amountDollars = (amountCents / 100).toFixed(2);

  await Promise.all([
    sendEmail({
      to: homeownerEmail,
      subject: `Payment confirmed — ${jobTitle}`,
      template: (
        <PaymentSecured
          recipientName={homeownerName}
          jobTitle={jobTitle}
          amountDollars={amountDollars}
          isProvider={false}
          actionUrl={`${appUrl}/manage-booking`}
        />
      ),
    }),
    sendEmail({
      to: providerEmail,
      subject: `Payment secured — you can start work on ${jobTitle}`,
      template: (
        <PaymentSecured
          recipientName={providerName}
          jobTitle={jobTitle}
          amountDollars={amountDollars}
          isProvider={true}
          actionUrl={`${appUrl}/pro/jobs`}
        />
      ),
    }),
  ]);
}

export async function sendJobCompletedEmails({
  homeownerEmail,
  homeownerName,
  providerEmail,
  providerName,
  jobTitle,
  totalAmountCents,
}: {
  homeownerEmail: string | null | undefined;
  homeownerName: string;
  providerEmail: string | null | undefined;
  providerName: string;
  jobTitle: string;
  totalAmountCents: number;
}) {
  const totalDollars = (totalAmountCents / 100).toFixed(2);

  await Promise.all([
    sendEmail({
      to: homeownerEmail,
      subject: `Job complete — ${jobTitle}`,
      template: (
        <JobCompleted
          recipientName={homeownerName}
          jobTitle={jobTitle}
          totalAmountDollars={totalDollars}
          isProvider={false}
          actionUrl={`${appUrl}/manage-booking`}
        />
      ),
    }),
    sendEmail({
      to: providerEmail,
      subject: `Job complete — ${jobTitle}`,
      template: (
        <JobCompleted
          recipientName={providerName}
          jobTitle={jobTitle}
          totalAmountDollars={totalDollars}
          isProvider={true}
          actionUrl={`${appUrl}/pro/jobs`}
        />
      ),
    }),
  ]);
}

export async function sendDisputeOpenedEmail({
  adminEmail,
  jobTitle,
  homeownerName,
  reason,
  jobId,
}: {
  adminEmail: string;
  jobTitle: string;
  homeownerName: string;
  reason: string;
  jobId: string;
}) {
  await sendEmail({
    to: adminEmail,
    subject: `[Action Required] Dispute opened: ${jobTitle}`,
    template: (
      <DisputeOpened
        jobTitle={jobTitle}
        homeownerName={homeownerName}
        reason={reason}
        jobId={jobId}
        adminUrl={`${appUrl}/admin`}
      />
    ),
  });
}

export async function sendDisputeResolvedEmails({
  homeownerEmail,
  homeownerName,
  providerEmail,
  providerName,
  jobTitle,
  resolution,
}: {
  homeownerEmail: string | null | undefined;
  homeownerName: string;
  providerEmail: string | null | undefined;
  providerName: string;
  jobTitle: string;
  resolution: "release" | "refund" | "partial_refund";
}) {
  await Promise.all([
    sendEmail({
      to: homeownerEmail,
      subject: `Dispute resolved — ${jobTitle}`,
      template: (
        <DisputeResolved
          recipientName={homeownerName}
          jobTitle={jobTitle}
          resolution={resolution}
          isProvider={false}
          actionUrl={`${appUrl}/manage-booking`}
        />
      ),
    }),
    sendEmail({
      to: providerEmail,
      subject: `Dispute resolved — ${jobTitle}`,
      template: (
        <DisputeResolved
          recipientName={providerName}
          jobTitle={jobTitle}
          resolution={resolution}
          isProvider={true}
          actionUrl={`${appUrl}/pro/jobs`}
        />
      ),
    }),
  ]);
}
