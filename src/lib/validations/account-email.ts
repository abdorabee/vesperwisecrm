import { z } from "zod";

const domainPattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export const registerSendingDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required")
    .transform((value) => value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .refine((value) => domainPattern.test(value), {
      message: "Enter a valid domain (e.g. example.com)",
    }),
});

export const updateEmailIdentitySchema = z.object({
  fromName: z.string().trim().min(1, "From name is required"),
  fromEmail: z.string().trim().email("Enter a valid email address"),
});

export type RegisterSendingDomainInput = z.infer<
  typeof registerSendingDomainSchema
>;
export type UpdateEmailIdentityInput = z.infer<typeof updateEmailIdentitySchema>;

const emailLocalPartPattern = /^[a-z0-9._-]+$/;

export const memberSenderIdentitySchema = z.object({
  fromDisplayName: z
    .string()
    .trim()
    .max(80, "Display name must be 80 characters or fewer")
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

export const updateReplyRoutingSchema = z.object({
  replyRoutingMode: z.enum(["shared_inbox", "agent_direct"]),
  defaultReplyToEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type MemberSenderIdentityInput = z.infer<typeof memberSenderIdentitySchema>;
export type UpdateReplyRoutingInput = z.infer<typeof updateReplyRoutingSchema>;
