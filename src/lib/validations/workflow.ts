import { z } from "zod";

export const workflowActionSchema = z
  .object({
    actionType: z.enum([
      "send_email_template",
      "enroll_sequence",
      "add_tag",
      "assign_round_robin",
      "change_stage",
    ]),
    subject: z.string().optional(),
    bodyTemplate: z.string().optional(),
    sequenceId: z.string().optional(),
    tagId: z.string().optional(),
    groupId: z.string().optional(),
    stageId: z.string().optional(),
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
  });

export const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  triggerType: z.enum([
    "lead_created",
    "stage_changed",
    "tag_added",
    "no_activity_days",
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
  isActive: z.boolean(),
  actions: z.array(workflowActionSchema).min(1, "Add at least one action"),
});

export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;
export type WorkflowInput = z.infer<typeof workflowSchema>;
