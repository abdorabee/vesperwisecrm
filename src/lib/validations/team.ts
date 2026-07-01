import { z } from "zod";

export const updateMemberRestrictionsSchema = z.object({
  leadVisibility: z.enum(["all", "assigned_only"]),
  maxOpenLeads: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0),
      "Must be a whole number",
    ),
});

export type UpdateMemberRestrictionsInput = z.infer<
  typeof updateMemberRestrictionsSchema
>;
