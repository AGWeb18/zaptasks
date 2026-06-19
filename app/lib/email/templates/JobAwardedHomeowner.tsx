import { Html, Head, Body, Container, Heading, Text, Button, Hr, Preview, Section } from "@react-email/components";

interface Props {
  homeownerName: string;
  providerName: string;
  jobTitle: string;
  escrowAmountDollars: string;
  needsOnboarding: boolean;
  actionUrl: string;
}

export function JobAwardedHomeowner({ homeownerName, providerName, jobTitle, escrowAmountDollars, needsOnboarding, actionUrl }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{needsOnboarding ? `Waiting for ${providerName} to finish setup` : `Fund escrow to get started — ${jobTitle}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={logo}>⚡ ZapTasks</Text>
          <Hr style={hr} />

          <Heading style={h1}>Your job has been awarded</Heading>

          <Text style={text}>
            Hi {homeownerName}, you&apos;ve selected <strong>{providerName}</strong> for:
          </Text>

          <Section style={highlight}>
            <Text style={jobTitleText}>{jobTitle}</Text>
            <Text style={amountText}>Escrow amount: <strong>${escrowAmountDollars}</strong> (held securely)</Text>
          </Section>

          {needsOnboarding ? (
            <>
              <Text style={text}>
                We&apos;re waiting for <strong>{providerName}</strong> to complete their payout setup before payment can be collected. You&apos;ll receive another email once they&apos;re ready.
              </Text>
              <Button href={actionUrl} style={buttonOutline}>View Status</Button>
            </>
          ) : (
            <>
              <Text style={text}>
                To secure the job, fund the escrow now. The money is held safely until the work is complete — you release it when you&apos;re satisfied.
              </Text>
              <Button href={actionUrl} style={button}>Fund Escrow Now</Button>
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
const buttonOutline = { backgroundColor: "#f1f5f9", color: "#2563eb", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600" as const, textDecoration: "none", display: "inline-block" as const, margin: "8px 0 16px", border: "1px solid #2563eb" };
const hr = { borderColor: "#e2e8f0", margin: "32px 0" };
const footer = { fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" };
