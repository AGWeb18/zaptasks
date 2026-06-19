import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@keystoneaipartners.com";

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string | null | undefined;
  subject: string;
  template: ReactElement;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${to}`);
    return;
  }

  if (!to || !to.includes("@")) {
    console.warn(`[email] Invalid recipient — skipping`);
    return;
  }

  try {
    const html = await render(template);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[email] Resend error to ${to}:`, error);
    }
  } catch (err) {
    // Never let email failures break the main API response
    console.error(`[email] Failed to send to ${to}:`, err);
  }
}
