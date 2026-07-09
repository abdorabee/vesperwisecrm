import { z } from "zod";

const emailLocalPartPattern = /^[a-z0-9._-]+$/;

const jobFunctionSchema = z.enum([
  "cold_caller",
  "lead_manager",
  "acquisitions_manager",
]);

export const updateMemberRestrictionsSchema = z.object({
  leadVisibility: z.enum(["all", "assigned_only"]),
  jobFunction: jobFunctionSchema.optional().or(z.literal("")),
  maxOpenLeads: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0),
      "Must be a whole number",
    ),
  fromDisplayName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal("")),
  fromEmailLocalPart: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || emailLocalPartPattern.test(v), {
      message: "Use only letters, numbers, dots, hyphens, and underscores",
    }),
});

export type UpdateMemberRestrictionsInput = z.infer<
  typeof updateMemberRestrictionsSchema
>;

export const inviteTeamMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["admin", "member"]),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
