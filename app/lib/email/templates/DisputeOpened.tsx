import { Html, Head, Body, Container, Heading, Text, Button, Hr, Preview, Section } from "@react-email/components";

interface Props {
  jobTitle: string;
  homeownerName: string;
  reason: string;
  jobId: string;
  adminUrl: string;
}

export function DisputeOpened({ jobTitle, homeownerName, reason, jobId, adminUrl }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Dispute opened on: {jobTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={logo}>⚡ ZapTasks Admin</Text>
          <Hr style={hr} />

          <Heading style={h1}>New dispute opened</Heading>

          <Section style={alertBox}>
            <Text style={alertText}>Action required — a homeowner has opened a dispute.</Text>
          </Section>

          <Text style={text}><strong>Job:</strong> {jobTitle}</Text>
          <Text style={text}><strong>Homeowner:</strong> {homeownerName}</Text>
          <Text style={text}><strong>Job ID:</strong> {jobId}</Text>

          <Text style={label}>Reason:</Text>
          <Section style={reasonBox}>
            <Text style={reasonText}>{reason}</Text>
          </Section>

          <Button href={adminUrl} style={button}>Review Dispute</Button>

          <Hr style={hr} />
          <Text style={footer}>ZapTasks Admin Notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px 0" };
const container = { maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", padding: "40px", border: "1px solid #e2e8f0" };
const logo = { fontSize: "22px", fontWeight: "700" as const, color: "#2563eb", margin: "0 0 0 0" };
const h1 = { fontSize: "28px", fontWeight: "700" as const, color: "#1e293b", margin: "16px 0" };
const text = { fontSize: "16px", color: "#475569", lineHeight: "1.6", margin: "0 0 8px 0" };
const label = { fontSize: "14px", fontWeight: "600" as const, color: "#374151", margin: "16px 0 6px 0" };
const alertBox = { backgroundColor: "#fef2f2", borderRadius: "8px", padding: "12px 16px", margin: "0 0 20px", border: "1px solid #fecaca" };
const alertText = { fontSize: "15px", color: "#dc2626", margin: "0", fontWeight: "500" as const };
const reasonBox = { backgroundColor: "#f8fafc", borderRadius: "8px", padding: "14px 16px", margin: "0 0 20px", border: "1px solid #e2e8f0" };
const reasonText = { fontSize: "15px", color: "#374151", margin: "0", fontStyle: "italic" as const };
const button = { backgroundColor: "#dc2626", color: "#ffffff", borderRadius: "8px", padding: "14px 28px", fontSize: "16px", fontWeight: "600" as const, textDecoration: "none", display: "inline-block" as const, margin: "8px 0 16px" };
const hr = { borderColor: "#e2e8f0", margin: "32px 0" };
const footer = { fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" };
