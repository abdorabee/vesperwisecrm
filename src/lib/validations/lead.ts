import { z } from "zod";

export const newLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Must be a positive number",
    ),
  pipelineStageId: z.string().uuid("Select a stage"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export type NewLeadInput = z.infer<typeof newLeadSchema>;
