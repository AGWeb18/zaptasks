import { Html, Head, Body, Container, Heading, Text, Button, Hr, Preview, Section } from "@react-email/components";

interface Props {
  providerName: string;
  homeownerName: string;
  jobTitle: string;
  totalAmountDollars: string;
  needsOnboarding: boolean;
  actionUrl: string;
}

export function JobAwardedProvider({ providerName, homeownerName, jobTitle, totalAmountDollars, needsOnboarding, actionUrl }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>You&apos;ve been hired: {jobTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={logo}>⚡ ZapTasks</Text>
          <Hr style={hr} />

          <Heading style={h1}>You got the job!</Heading>

          <Text style={text}>
            Hi {providerName}, <strong>{homeownerName}</strong> has selected you for:
          </Text>

          <Section style={highlight}>
            <Text style={jobTitleText}>{jobTitle}</Text>
            <Text style={amountText}>Total: <strong>${totalAmountDollars}</strong></Text>
          </Section>

          {needsOnboarding ? (
            <>
              <Text style={text}>
                Before you can receive payment, you need to complete your Stripe payout setup. This only takes a few minutes.
              </Text>
              <Button href={actionUrl} style={button}>Complete Payout Setup</Button>
            </>
          ) : (
            <>
              <Text style={text}>
                The homeowner will now fund the escrow. You&apos;ll receive another email as soon as funds are secured and you can begin work.
              </Text>
              <Button href={actionUrl} style={button}>View Job</Button>
            </>
          )}

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
const jobTitleText = { fontSize: "18px", fontWeight: "600" as const, color: "#1e293b", margin: "0 0 4px 0" };
const amountText = { fontSize: "16px", color: "#475569", margin: "0" };
const button = { backgroundColor: "#2563eb", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600" as const, textDecoration: "none", display: "inline-block" as const, margin: "8px 0 16px" };
const hr = { borderColor: "#e2e8f0", margin: "32px 0" };
const footer = { fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" };
