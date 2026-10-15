import { z } from "zod";

export const workflowActionSchema = z
  .object({
    actionType: z.enum([
      "send_email_template",
      "enroll_sequence",
      "add_tag",
      "assign_round_robin",
      "change_stage",
      "reassign",
      "create_task",
      "notify_user",
    ]),
    subject: z.string().optional(),
    bodyTemplate: z.string().optional(),
    sequenceId: z.string().optional(),
    tagId: z.string().optional(),
    groupId: z.string().optional(),
    stageId: z.string().optional(),
    userId: z.string().optional(),
    taskTitle: z.string().optional(),
    dueInDays: z
      .string()
      .optional()
      .refine(
        (value) => !value || (/^\d+$/.test(value) && Number(value) > 0),
        "Must be a positive whole number",
      ),
    priority: z.enum(["low", "normal", "high"]).optional(),
    reassignMode: z.enum(["manager", "member", "group"]).optional(),
    notifyMode: z.enum(["manager", "member"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actionType === "send_email_template" && !data.bodyTemplate) {
      ctx.addIssue({
        code: "custom",
        path: ["bodyTemplate"],
        message: "Message is required",
      });
    }
    if (data.actionType === "enroll_sequence" && !data.sequenceId) {
      ctx.addIssue({
        code: "custom",
        path: ["sequenceId"],
        message: "Select a sequence",
      });
    }
    if (data.actionType === "add_tag" && !data.tagId) {
      ctx.addIssue({ code: "custom", path: ["tagId"], message: "Select a tag" });
    }
    if (data.actionType === "assign_round_robin" && !data.groupId) {
      ctx.addIssue({
        code: "custom",
        path: ["groupId"],
        message: "Select a group",
      });
    }
    if (data.actionType === "change_stage" && !data.stageId) {
      ctx.addIssue({
        code: "custom",
        path: ["stageId"],
        message: "Select a stage",
      });
    }
    if (data.actionType === "reassign" && data.reassignMode === "member" && !data.userId) {
      ctx.addIssue({
        code: "custom",
        path: ["userId"],
        message: "Select a teammate",
      });
    }
    if (data.actionType === "reassign" && data.reassignMode === "group" && !data.groupId) {
      ctx.addIssue({
        code: "custom",
        path: ["groupId"],
        message: "Select a group",
      });
    }
    if (data.actionType === "notify_user" && data.notifyMode === "member" && !data.userId) {
      ctx.addIssue({
        code: "custom",
        path: ["userId"],
        message: "Select a teammate",
      });
    }
    if (data.actionType === "create_task" && !data.taskTitle?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["taskTitle"],
        message: "Task title is required",
      });
    }
  });

export const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  triggerType: z.enum([
    "lead_created",
    "stage_changed",
    "tag_added",
    "no_activity_days",
    "no_next_action",
  ]),
  triggerStageId: z.string().optional(),
  triggerTagId: z.string().optional(),
  triggerDays: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) > 0),
      "Must be a positive whole number",
    ),
  triggerHours: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) > 0),
      "Must be a positive whole number",
    ),
  cooldownHours: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) > 0),
      "Must be a positive whole number",
    ),
  isActive: z.boolean(),
  actions: z.array(workflowActionSchema).min(1, "Add at least one action"),
})
  .superRefine((data, ctx) => {
    if (data.triggerType === "no_activity_days" && !data.triggerDays) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerDays"],
        message: "Enter the number of days",
      });
    }
    if (data.triggerType === "no_next_action" && !data.triggerHours) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerHours"],
        message: "Enter the number of hours",
      });
    }
  });

export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;
export type WorkflowInput = z.infer<typeof workflowSchema>;
