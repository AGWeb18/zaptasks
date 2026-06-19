import { Html, Head, Body, Container, Heading, Text, Button, Hr, Preview, Section } from "@react-email/components";

interface Props {
  recipientName: string;
  jobTitle: string;
  amountDollars: string;
  isProvider: boolean;
  actionUrl: string;
}

export function PaymentSecured({ recipientName, jobTitle, amountDollars, isProvider, actionUrl }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Payment confirmed for {jobTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={logo}>⚡ ZapTasks</Text>
          <Hr style={hr} />

          <Heading style={h1}>Payment confirmed</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Section style={highlight}>
            <Text style={jobTitleText}>{jobTitle}</Text>
            <Text style={amountText}><strong>${amountDollars}</strong> secured in escrow</Text>
          </Section>

          {isProvider ? (
            <Text style={text}>
              The homeowner has funded the escrow. Funds are held securely and will be released to you upon job completion. You can begin work now.
            </Text>
          ) : (
            <Text style={text}>
              Your payment is held securely in escrow. It will only be released to the provider once you confirm the work is complete.
            </Text>
          )}

          <Button href={actionUrl} style={button}>
            {isProvider ? "View Job" : "Manage Job"}
          </Button>

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
const highlight = { backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "16px 20px", margin: "20px 0", border: "1px solid #bbf7d0" };
const jobTitleText = { fontSize: "18px", fontWeight: "600" as const, color: "#1e293b", margin: "0 0 4px 0" };
const amountText = { fontSize: "16px", color: "#059669", margin: "0" };
const button = { backgroundColor: "#2563eb", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600" as const, textDecoration: "none", display: "inline-block" as const, margin: "8px 0 16px" };
const hr = { borderColor: "#e2e8f0", margin: "32px 0" };
const footer = { fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" };
