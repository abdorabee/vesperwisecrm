import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const removedOutboundFiles = [
  "src/lib/email/send-lead-email.ts",
  "src/lib/email/reply-tokens.ts",
  "src/lib/sequences/send-step.ts",
  "src/lib/sms/twilio.ts",
  "src/lib/sms/process-inbound.ts",
  "src/app/api/cron/process-automation/route.ts",
  "src/app/api/cron/reconcile-dialer/route.ts",
  "src/app/api/dialer/providers/twilio/voice/route.ts",
  "src/lib/actions/dialer.ts",
  "e2e/dialer.spec.ts",
] as const;

describe("outbound disabled file contract", () => {
  test.each(removedOutboundFiles)("%s must not exist", (path) => {
    expect(existsSync(path)).toBe(false);
  });
});

describe("sequence steps are tasks", () => {
  test("saveSequence inserts channel task and does not send email or sms", () => {
    const source = readFileSync("src/lib/actions/sequences.ts", "utf8");
    expect(source).toContain('channel: "task"');
    expect(source).not.toMatch(/\b(email|sms)\b/i);
    expect(source).not.toMatch(/send-lead-email|send-step|twilio/i);
  });
});

describe("enrollments create follow-up tasks", () => {
  test("createFollowUpForCurrentStep inserts lead_tasks and does not import senders", () => {
    const source = readFileSync("src/lib/actions/enrollments.ts", "utf8");
    expect(source).toContain("createFollowUpForCurrentStep");
    expect(source).toContain('.from("lead_tasks")');
    expect(source).not.toContain("send-lead-email");
    expect(source).not.toContain("resend");
    expect(source).not.toContain("twilio");
  });
});

describe("workflow send_email_template is a task", () => {
  test("inserts into lead_tasks instead of sending email", () => {
    const source = readFileSync("src/lib/workflows/actions.ts", "utf8");
    const sendEmailCase = source.slice(
      source.indexOf('case "send_email_template"'),
      source.indexOf('case "enroll_sequence"'),
    );

    expect(sendEmailCase).toContain('.from("lead_tasks")');
    expect(sendEmailCase).not.toMatch(/resend|twilio|send-lead-email|emails\.send/i);
  });
});

describe("vercel crons", () => {
  test("schedules only digest and import-job crons", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: { path: string }[];
    };
    const paths = vercel.crons.map((cron) => cron.path);

    expect(paths).toEqual([
      "/api/cron/client-digest",
      "/api/cron/process-import-jobs",
    ]);
    expect(paths.some((path) => path.includes("process-automation"))).toBe(
      false,
    );
    expect(paths.some((path) => path.includes("reconcile-dialer"))).toBe(false);
    expect(paths.some((path) => path.includes("dialer"))).toBe(false);
  });
});

describe("sequence step channel migration", () => {
  test("allows channel task in sequence_steps_channel_check", () => {
    const sql = readFileSync(
      "supabase/migrations/20261022150000_sequence_task_steps.sql",
      "utf8",
    );
    expect(sql).toContain("sequence_steps_channel_check");
    expect(sql).toContain("check (channel in ('email', 'sms', 'task'))");
  });
});
