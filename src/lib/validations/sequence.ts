import { z } from "zod";

export const sequenceStepSchema = z.object({
  channel: z.enum(["email", "sms"]),
  delayDays: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0),
      "Must be a whole number",
    ),
  subject: z.string().optional(),
  bodyTemplate: z.string().min(1, "Message is required"),
});

export const sequenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  steps: z.array(sequenceStepSchema).min(1, "Add at least one step"),
});

export type SequenceStepInput = z.infer<typeof sequenceStepSchema>;
export type SequenceInput = z.infer<typeof sequenceSchema>;
