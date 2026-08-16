"use server";

import { headers } from "next/headers";

import {
  sendContactInquiryEmail,
  sendDemoBookingEmail,
} from "@/lib/email/marketing-inquiry";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  parseContactInquiry,
  parseDemoBooking,
} from "@/lib/validations/marketing-inquiry";

export type MarketingInquiryResult =
  | { ok: true }
  | { ok: false; error: string };

async function withinInquiryBudget(): Promise<boolean> {
  return consumeRateLimit({
    scope: "marketing-inquiry",
    identifier: (await headers()).get("x-forwarded-for") ?? "unknown",
    limit: 8,
    windowSeconds: 3600,
  });
}

export async function submitDemoBooking(
  input: unknown,
): Promise<MarketingInquiryResult> {
  const parsed = parseDemoBooking(input);
  if (!parsed.ok) return parsed;
  if (parsed.honeypot) return { ok: true };

  if (!(await withinInquiryBudget())) {
    return { ok: false, error: "Too many requests. Try again later." };
  }

  try {
    await sendDemoBookingEmail(parsed.data);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not send the request. Try again or email us from the contact page.",
    };
  }
}

export async function submitContactInquiry(
  input: unknown,
): Promise<MarketingInquiryResult> {
  const parsed = parseContactInquiry(input);
  if (!parsed.ok) return parsed;
  if (parsed.honeypot) return { ok: true };

  if (!(await withinInquiryBudget())) {
    return { ok: false, error: "Too many requests. Try again later." };
  }

  try {
    await sendContactInquiryEmail(parsed.data);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not send the message. Try again in a few minutes.",
    };
  }
}
