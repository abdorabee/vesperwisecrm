import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  driveFolderId: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientFormInput = z.input<typeof clientSchema>;

export const inviteClientUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export type InviteClientUserInput = z.infer<typeof inviteClientUserSchema>;

export const clientCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(2000),
});

export type ClientCommentInput = z.infer<typeof clientCommentSchema>;

export const clientInterestSchema = z.object({
  status: z.enum(["interested", "declined"]),
});

export type ClientInterestInput = z.infer<typeof clientInterestSchema>;
