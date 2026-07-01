import { z } from "zod";

export const sendEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message is required"),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
