import { escapeHtml, sanitizeEmailHeader } from "@/lib/email/escape-html";
import { getResendClient } from "@/lib/resend/client";
import { formatDemoDate, formatTimeLabel, parseDateKey } from "@/lib/marketing/demo-slots";
import type {
  ContactInquiryInput,
  DemoBookingInput,
} from "@/lib/validations/marketing-inquiry";

function fromAddress(): string | null {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return null;
  return from.includes("<") ? from : `VesperWise <${from}>`;
}

function canSendInquiryEmail(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.DEMO_INBOX_EMAIL,
  );
}

function demoEmailText(data: DemoBookingInput): string {
  const date = parseDateKey(data.dateKey);
  const when = date
    ? `${formatDemoDate(date)} at ${formatTimeLabel(data.time)}`
    : `${data.dateKey} ${data.time}`;

  return [
    "New demo request",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Team size: ${data.teamSize}`,
    `When: ${when}`,
    `Time zone: ${data.timeZone}`,
    data.notes ? `Notes: ${data.notes}` : "Notes: (none)",
  ].join("\n");
}

function contactEmailText(data: ContactInquiryInput): string {
  return [
    "New contact message",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    "",
    data.message,
  ].join("\n");
}

function asHtml(text: string): string {
  return `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
}

export async function sendDemoBookingEmail(data: DemoBookingInput): Promise<void> {
  if (!canSendInquiryEmail()) {
    console.info(
      JSON.stringify({
        scope: "marketing-inquiry",
        kind: "demo",
        email: data.email,
        dateKey: data.dateKey,
        time: data.time,
        delivered: false,
      }),
    );
    return;
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: fromAddress()!,
    to: process.env.DEMO_INBOX_EMAIL!,
    replyTo: data.email,
    subject: sanitizeEmailHeader(`Demo request — ${data.company}`),
    text: demoEmailText(data),
    html: asHtml(demoEmailText(data)),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendContactInquiryEmail(
  data: ContactInquiryInput,
): Promise<void> {
  if (!canSendInquiryEmail()) {
    console.info(
      JSON.stringify({
        scope: "marketing-inquiry",
        kind: "contact",
        email: data.email,
        delivered: false,
      }),
    );
    return;
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: fromAddress()!,
    to: process.env.DEMO_INBOX_EMAIL!,
    replyTo: data.email,
    subject: sanitizeEmailHeader(`Contact — ${data.company}`),
    text: contactEmailText(data),
    html: asHtml(contactEmailText(data)),
  });

  if (error) {
    throw new Error(error.message);
  }
}
