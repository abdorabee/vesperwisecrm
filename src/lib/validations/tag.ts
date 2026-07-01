import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
