import { Html, Head, Body, Container, Heading, Text, Button, Hr, Preview, Section } from "@react-email/components";

type Resolution = "release" | "refund" | "partial_refund";

interface Props {
  recipientName: string;
  jobTitle: string;
  resolution: Resolution;
  isProvider: boolean;
  actionUrl: string;
}

const RESOLUTION_COPY: Record<Resolution, { heading: string; detail: (isProvider: boolean) => string }> = {
  release: {
    heading: "Dispute resolved — funds released",
    detail: (isProvider) =>
      isProvider
        ? "After review, ZapTasks has decided to release the funds to you. Payment will be transferred to your Stripe account shortly."
        : "After review, ZapTasks has decided to release the funds to the provider. If you have further concerns, please contact us.",
  },
  refund: {
    heading: "Dispute resolved — refund issued",
    detail: (isProvider) =>
      isProvider
        ? "After review, ZapTasks has issued a full refund to the homeowner. If you believe this is an error, please contact us."
        : "After review, ZapTasks has issued a full refund to your original payment method. Please allow 5–10 business days.",
  },
  partial_refund: {
    heading: "Dispute resolved — partial refund issued",
    detail: (isProvider) =>
      isProvider
        ? "After review, ZapTasks has issued a partial refund to the homeowner. The remainder has been released to you."
        : "After review, ZapTasks has issued a partial refund to your original payment method. Please allow 5–10 business days.",
  },
};

export function DisputeResolved({ recipientName, jobTitle, resolution, isProvider, actionUrl }: Props) {
  const copy = RESOLUTION_COPY[resolution];

  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.heading}: {jobTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={logo}>⚡ ZapTasks</Text>
          <Hr style={hr} />

          <Heading style={h1}>{copy.heading}</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Section style={highlight}>
            <Text style={jobTitleText}>{jobTitle}</Text>
          </Section>

          <Text style={text}>{copy.detail(isProvider)}</Text>

          <Button href={actionUrl} style={button}>View Details</Button>

          <Hr style={hr} />
          <Text style={footer}>ZapTasks — Connecting your community</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px 0" };
const container = { maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", padding: "40px", border: "1px solid #e2e8f0" };
const logo = { fontSize: "22px", fontWeight: "700" as const, color: "#2563eb", margin: "0 0 0 0" };
const h1 = { fontSize: "28px", fontWeight: "700" as const, color: "#1e293b", margin: "16px 0" };
const text = { fontSize: "16px", color: "#475569", lineHeight: "1.6", margin: "0 0 16px 0" };
const highlight = { backgroundColor: "#eff6ff", borderRadius: "8px", padding: "16px 20px", margin: "20px 0" };
const jobTitleText = { fontSize: "18px", fontWeight: "600" as const, color: "#1e293b", margin: "0" };
const button = { backgroundColor: "#2563eb", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600" as const, textDecoration: "none", display: "inline-block" as const, margin: "8px 0 16px" };
const hr = { borderColor: "#e2e8f0", margin: "32px 0" };
const footer = { fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" };
