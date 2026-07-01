import { z } from "zod";

const prioritySchema = z.enum(["low", "normal", "high"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().min(1, "Due date is required"),
  priority: prioritySchema,
  assignedUserId: z.string().uuid().optional().or(z.literal("")),
});

export const completeTaskSchema = z.object({
  completionNote: z.string().trim().max(2000).optional(),
  nextTitle: z.string().trim().min(1, "Next step is required").max(160),
  nextDescription: z.string().trim().max(2000).optional(),
  nextDueAt: z.string().min(1, "Next due date is required"),
  nextPriority: prioritySchema,
  nextAssignedUserId: z.string().uuid().optional().or(z.literal("")),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
