import { describe, expect, test } from "vitest";
import { formatRelativeDue } from "@/lib/dates/relative-due";
import {
  resolveNextActions,
  sequenceStepActionTitle,
} from "@/lib/queries/next-action";

const NOW = Date.parse("2026-10-11T12:00:00.000Z");

describe("pipeline next action", () => {
  test("uses the earliest open task", () => {
    const actions = resolveNextActions({
      leadIds: ["lead-1"],
      tasks: [
        { leadId: "lead-1", title: "Later call", dueAt: "2026-10-20T12:00:00.000Z" },
        { leadId: "lead-1", title: "Call the seller", dueAt: "2026-10-12T12:00:00.000Z" },
      ],
      enrollments: [
        {
          leadId: "lead-1",
          sequenceId: "seq-1",
          stepNumber: 1,
          dueAt: "2026-10-11T13:00:00.000Z",
        },
      ],
      steps: [
        {
          sequenceId: "seq-1",
          stepNumber: 1,
          subject: "Intro email",
          channel: "email",
        },
      ],
    });

    expect(actions.get("lead-1")).toEqual({
      title: "Call the seller",
      dueAt: "2026-10-12T12:00:00.000Z",
      source: "task",
    });
  });

  test("falls back to the next due sequence step", () => {
    const actions = resolveNextActions({
      leadIds: ["lead-2", "lead-3"],
      tasks: [],
      enrollments: [
        {
          leadId: "lead-2",
          sequenceId: "seq-1",
          stepNumber: 2,
          dueAt: "2026-10-15T12:00:00.000Z",
        },
        {
          leadId: "lead-2",
          sequenceId: "seq-2",
          stepNumber: 1,
          dueAt: "2026-10-13T12:00:00.000Z",
        },
        {
          leadId: "lead-3",
          sequenceId: "seq-1",
          stepNumber: 4,
          dueAt: "2026-10-18T12:00:00.000Z",
        },
      ],
      steps: [
        {
          sequenceId: "seq-2",
          stepNumber: 1,
          subject: "Intro email",
          channel: "email",
        },
        {
          sequenceId: "seq-1",
          stepNumber: 4,
          subject: null,
          channel: "sms",
        },
      ],
    });

    expect(actions.get("lead-2")).toEqual({
      title: "Intro email",
      dueAt: "2026-10-13T12:00:00.000Z",
      source: "sequence",
    });
    expect(actions.get("lead-3")).toEqual({
      title: "Text step 4",
      dueAt: "2026-10-18T12:00:00.000Z",
      source: "sequence",
    });
  });

  test("leaves a lead without a task or sequence empty", () => {
    const actions = resolveNextActions({
      leadIds: ["lead-4"],
      tasks: [],
      enrollments: [],
      steps: [],
    });

    expect(actions.has("lead-4")).toBe(false);
  });

  test("names a sequence step from its subject or channel", () => {
    expect(
      sequenceStepActionTitle({
        subject: "  Check in  ",
        channel: "email",
        stepNumber: 3,
      }),
    ).toBe("Check in");
    expect(
      sequenceStepActionTitle({
        subject: null,
        channel: "email",
        stepNumber: 2,
      }),
    ).toBe("Email step 2");
    expect(sequenceStepActionTitle(null)).toBe("Sequence step");
  });
});

describe("relative due dates", () => {
  test("labels a future due date", () => {
    expect(formatRelativeDue("2026-10-13T12:00:00.000Z", NOW)).toEqual({
      label: "Due in 2 days",
      overdue: false,
    });
  });

  test("marks a past due date overdue", () => {
    expect(formatRelativeDue("2026-10-08T12:00:00.000Z", NOW)).toEqual({
      label: "3 days ago",
      overdue: true,
    });
  });

  test("uses hours inside a day", () => {
    expect(formatRelativeDue("2026-10-11T09:00:00.000Z", NOW)).toEqual({
      label: "3 hours ago",
      overdue: true,
    });
  });
});
