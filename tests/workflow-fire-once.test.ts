import { describe, expect, test } from "vitest";
import { workflowSchema } from "../src/lib/validations/workflow";
import {
  cooldownBlocksRefire,
  cooldownHoursFromConfig,
  stageIdFromConfig,
} from "../src/lib/workflows/fire-once";

describe("workflow fire-once cooldown", () => {
  test("blocks another run after a successful fire when cooldown is blank", () => {
    expect(
      cooldownBlocksRefire(
        "2026-01-01T00:00:00.000Z",
        null,
        Date.parse("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  test("allows a run after the cooldown elapses and blocks one that is still inside it", () => {
    const firedAt = "2026-01-01T00:00:00.000Z";
    const now = Date.parse("2026-01-01T05:00:00.000Z");
    expect(cooldownBlocksRefire(firedAt, 4, now)).toBe(false);
    expect(cooldownBlocksRefire(firedAt, 6, now)).toBe(true);
  });

  test("does not block a lead the workflow has never run for", () => {
    expect(cooldownBlocksRefire(null, null)).toBe(false);
    expect(cooldownBlocksRefire(undefined, 12)).toBe(false);
  });

  test("reads cooldown hours and the optional stage filter from trigger config", () => {
    expect(cooldownHoursFromConfig({ cooldownHours: 24 })).toBe(24);
    expect(cooldownHoursFromConfig({})).toBeNull();
    expect(cooldownHoursFromConfig({ cooldownHours: 0 })).toBeNull();
    expect(stageIdFromConfig({ stageId: "stage-1" })).toBe("stage-1");
    expect(stageIdFromConfig({})).toBeNull();
  });
});

describe("workflow schema for scheduled actions", () => {
  const untouched = {
    name: "Untouched 4 days in Negotiation, then notify the manager and reassign",
    triggerType: "no_activity_days" as const,
    triggerDays: "4",
    triggerStageId: "stage-negotiating",
    isActive: true,
    actions: [
      { actionType: "notify_user" as const, notifyMode: "manager" as const },
      { actionType: "reassign" as const, reassignMode: "manager" as const },
    ],
  };

  test("accepts the negotiation preset shape and the nurture actions", () => {
    expect(workflowSchema.parse(untouched).triggerStageId).toBe("stage-negotiating");
    expect(
      workflowSchema.parse({
        name: "Nurture for 90 days, then move back and re-enroll",
        triggerType: "no_activity_days",
        triggerDays: "90",
        isActive: true,
        actions: [
          { actionType: "change_stage", stageId: "stage-new" },
          { actionType: "enroll_sequence", sequenceId: "sequence-cold" },
        ],
      }).actions,
    ).toHaveLength(2);
  });

  test("requires a task title and a positive day count", () => {
    expect(
      workflowSchema.safeParse({
        ...untouched,
        actions: [{ actionType: "create_task", taskTitle: "   " }],
      }).success,
    ).toBe(false);
    expect(
      workflowSchema.safeParse({
        ...untouched,
        triggerDays: "",
      }).success,
    ).toBe(false);
  });
});
