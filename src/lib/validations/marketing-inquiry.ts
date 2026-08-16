import { z } from "zod";

import { isValidDemoSlot } from "@/lib/marketing/demo-slots";

export const TEAM_SIZES = ["solo", "2-5", "6-15", "16+"] as const;

export const demoBookingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid work email").max(160),
  company: z.string().trim().min(1, "Company is required").max(160),
  teamSize: z.enum(TEAM_SIZES, { message: "Select a team size" }),
  notes: z.string().trim().max(2000).optional().default(""),
  dateKey: z.string().min(1, "Select a date"),
  time: z.string().min(1, "Select a time"),
  timeZone: z.string().trim().min(1).max(80),
  website: z.string().optional().default(""),
});

export const contactInquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid work email").max(160),
  company: z.string().trim().min(1, "Company is required").max(160),
  message: z.string().trim().min(10, "Tell us a little more").max(2000),
  website: z.string().optional().default(""),
});

export type DemoBookingInput = z.infer<typeof demoBookingSchema>;
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export type MarketingInquiryParseResult<T> =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; data: T }
  | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

export function parseDemoBooking(
  input: unknown,
  now = new Date(),
): MarketingInquiryParseResult<DemoBookingInput> {
  const parsed = demoBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  if (parsed.data.website.trim()) {
    return { ok: true, honeypot: true };
  }

  if (!isValidDemoSlot(parsed.data.dateKey, parsed.data.time, now)) {
    return {
      ok: false,
      error: "Select a weekday time slot in the future.",
    };
  }

  return { ok: true, honeypot: false, data: parsed.data };
}

export function parseContactInquiry(
  input: unknown,
): MarketingInquiryParseResult<ContactInquiryInput> {
  const parsed = contactInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  if (parsed.data.website.trim()) {
    return { ok: true, honeypot: true };
  }

  return { ok: true, honeypot: false, data: parsed.data };
}
