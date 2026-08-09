import { z } from "zod";

export const startDialerCallSchema = z.object({
  contactId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
  queueItemId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().uuid(),
});

export const dispositionCallSchema = z.object({
  attemptId: z.string().uuid(),
  dispositionId: z.string().uuid(),
  notes: z.string().trim().max(10000).default(""),
});

export const cancelCallSchema = z.object({
  attemptId: z.string().uuid(),
});

export const dialerQueueSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  ownerUserId: z.string().uuid().nullable(),
  leadGroupId: z.string().uuid().nullable(),
  maxActiveCalls: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).max(10),
  retryDelaySeconds: z.number().int().min(30).max(86400),
});

export const queueItemSchema = z.object({
  queueId: z.string().uuid(),
  leadId: z.string().uuid(),
});

export const dialerQueueStatusSchema = z.object({
  queueId: z.string().uuid(),
  status: z.enum(["active", "paused", "completed"]),
});

export const dispositionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  category: z.enum([
    "connected",
    "callback",
    "no_answer",
    "busy",
    "wrong_number",
    "do_not_call",
    "other",
  ]),
  displayOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
  isRetryable: z.boolean(),
  marksDoNotCall: z.boolean(),
});

export const dialerSettingsSchema = z.object({
  maxActiveCalls: z.number().int().min(1).max(100),
  maxCallsPerSecond: z.number().int().min(1).max(20),
  defaultMaxAttempts: z.number().int().min(1).max(10),
  defaultRetryDelaySeconds: z.number().int().min(30).max(86400),
});

export const clearDoNotCallSchema = z.object({
  contactId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export const dialerCredentialsSchema = z.object({
  accountSid: z.string().trim().regex(/^AC[a-zA-Z0-9]{32}$/, "Must be a Twilio Account SID (starts with AC)"),
  authToken: z.string().trim().min(1).max(200),
  apiKeySid: z.string().trim().regex(/^SK[a-zA-Z0-9]{32}$/, "Must be a Twilio API Key SID (starts with SK)"),
  apiKeySecret: z.string().trim().min(1).max(200),
  twimlAppSid: z.string().trim().regex(/^AP[a-zA-Z0-9]{32}$/, "Must be a Twilio TwiML App SID (starts with AP)"),
  fromNumber: z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Must be an E.164 phone number"),
});
