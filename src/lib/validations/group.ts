import { z } from "zod";

export const groupMemberSchema = z.object({
  userId: z.string().uuid(),
  weight: z
    .string()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 10,
      "Must be 0-10",
    ),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  members: z.array(groupMemberSchema),
});

export type GroupMemberInput = z.infer<typeof groupMemberSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
