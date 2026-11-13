import { describe, expect, test } from "vitest";
import {
  sequenceSchema,
  sequenceStepSchema,
} from "@/lib/validations/sequence";
import {
  workflowActionSchema,
  workflowSchema,
} from "@/lib/validations/workflow";

function issueMessages(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message);
}

const validTaskStep = {
  delayDays: "1",
  bodyTemplate: "Call the lead about next steps",
};

describe("sequenceSchema", () => {
  test("rejects an empty name", () => {
    const result = sequenceSchema.safeParse({
      name: "",
      steps: [validTaskStep],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Name is required");
    }
  });

  test("rejects empty steps", () => {
    const result = sequenceSchema.safeParse({
      name: "Follow up",
      steps: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Add at least one step");
    }
  });

  test("accepts a valid task step", () => {
    const result = sequenceSchema.safeParse({
      name: "Follow up",
      steps: [validTaskStep],
    });

    expect(result.success).toBe(true);
  });
});

describe("sequenceStepSchema", () => {
  test("requires bodyTemplate", () => {
    const result = sequenceStepSchema.safeParse({
      delayDays: "0",
      bodyTemplate: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Task note is required");
    }
  });

  test("rejects a non-whole delayDays value", () => {
    const result = sequenceStepSchema.safeParse({
      delayDays: "1.5",
      bodyTemplate: "Call the lead",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Must be a whole number");
    }
  });

  test("rejects a negative delayDays value", () => {
    const result = sequenceStepSchema.safeParse({
      delayDays: "-1",
      bodyTemplate: "Call the lead",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Must be a whole number");
    }
  });

  test("accepts delayDays of 0", () => {
    const result = sequenceStepSchema.safeParse({
      delayDays: "0",
      bodyTemplate: "Call the lead",
    });

    expect(result.success).toBe(true);
  });

  test("accepts an empty delayDays", () => {
    const result = sequenceStepSchema.safeParse({
      delayDays: "",
      bodyTemplate: "Call the lead",
    });

    expect(result.success).toBe(true);
  });
});

describe("workflowActionSchema", () => {
  test("send_email_template fails without subject or bodyTemplate", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "send_email_template",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Task note is required");
    }
  });

  test("send_email_template succeeds with a bodyTemplate", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "send_email_template",
      bodyTemplate: "Follow up with the lead",
    });

    expect(result.success).toBe(true);
  });

  test("enroll_sequence fails without sequenceId", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "enroll_sequence",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Select a sequence");
    }
  });

  test("change_stage fails without stageId", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "change_stage",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Select a stage");
    }
  });

  test("add_tag fails without tagId", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "add_tag",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Select a tag");
    }
  });

  test("assign_round_robin fails without groupId", () => {
    const result = workflowActionSchema.safeParse({
      actionType: "assign_round_robin",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Select a group");
    }
  });
});

describe("workflowSchema", () => {
  const validAction = {
    actionType: "send_email_template" as const,
    bodyTemplate: "Follow up with the lead",
  };

  test("requires a name", () => {
    const result = workflowSchema.safeParse({
      name: "",
      triggerType: "lead_created",
      isActive: true,
      actions: [validAction],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Name is required");
    }
  });

  test("requires at least one action", () => {
    const result = workflowSchema.safeParse({
      name: "New lead follow-up",
      triggerType: "lead_created",
      isActive: true,
      actions: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Add at least one action");
    }
  });

  test("accepts a named workflow with one action", () => {
    const result = workflowSchema.safeParse({
      name: "New lead follow-up",
      triggerType: "lead_created",
      isActive: true,
      actions: [validAction],
    });

    expect(result.success).toBe(true);
  });

  test.each(["0", "-1", "1.5", "two"])(
    "rejects triggerDays %s",
    (triggerDays) => {
      const result = workflowSchema.safeParse({
        name: "Stale lead",
        triggerType: "no_activity_days",
        triggerDays,
        isActive: true,
        actions: [validAction],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(issueMessages(result.error)).toContain(
          "Must be a positive whole number",
        );
      }
    },
  );

  test.each(["0", "-1", "1.5", "two"])(
    "rejects triggerHours %s",
    (triggerHours) => {
      const result = workflowSchema.safeParse({
        name: "Stale lead",
        triggerType: "no_next_action",
        triggerHours,
        isActive: true,
        actions: [validAction],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(issueMessages(result.error)).toContain(
          "Must be a positive whole number",
        );
      }
    },
  );

  test("accepts positive whole triggerDays and triggerHours", () => {
    const result = workflowSchema.safeParse({
      name: "Stale lead",
      triggerType: "no_activity_days",
      triggerDays: "3",
      triggerHours: "2",
      isActive: true,
      actions: [validAction],
    });

    expect(result.success).toBe(true);
  });
});
