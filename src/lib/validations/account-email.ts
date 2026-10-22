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
