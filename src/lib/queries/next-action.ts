import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface LeadNextAction {
  title: string;
  dueAt: string;
  source: "task" | "sequence";
}

interface TaskCandidate {
  leadId: string;
  title: string;
  dueAt: string;
}

interface EnrollmentCandidate {
  leadId: string;
  sequenceId: string;
  stepNumber: number;
  dueAt: string;
}

interface StepCandidate {
  sequenceId: string;
  stepNumber: number;
  subject: string | null;
  channel: string;
}

const PAGE_SIZE = 1000;
const LEAD_CHUNK = 100;

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export function sequenceStepActionTitle(
  step: Pick<StepCandidate, "subject" | "channel" | "stepNumber"> | null,
): string {
  const subject = step?.subject?.trim();
  if (subject) return subject;
  if (!step) return "Sequence step";

  const channel =
    step.channel === "sms"
      ? "Text"
      : step.channel === "email"
        ? "Email"
        : "Sequence";
  return `${channel} step ${step.stepNumber}`;
}

function earliestByLead<T extends { leadId: string; dueAt: string }>(
  rows: T[],
): Map<string, T> {
  const chosen = new Map<string, T>();
  for (const row of rows) {
    const current = chosen.get(row.leadId);
    if (!current || row.dueAt < current.dueAt) {
      chosen.set(row.leadId, row);
    }
  }
  return chosen;
}

export function resolveNextActions(input: {
  leadIds: string[];
  tasks: TaskCandidate[];
  enrollments: EnrollmentCandidate[];
  steps: StepCandidate[];
}): Map<string, LeadNextAction> {
  const leadIds = new Set(input.leadIds);
  const actions = new Map<string, LeadNextAction>();

  for (const [leadId, task] of earliestByLead(input.tasks)) {
    if (!leadIds.has(leadId)) continue;
    actions.set(leadId, {
      title: task.title,
      dueAt: task.dueAt,
      source: "task",
    });
  }

  const enrollments = earliestByLead(
    input.enrollments.filter(
      (enrollment) => leadIds.has(enrollment.leadId) && !actions.has(enrollment.leadId),
    ),
  );

  for (const [leadId, enrollment] of enrollments) {
    const step =
      input.steps.find(
        (candidate) =>
          candidate.sequenceId === enrollment.sequenceId &&
          candidate.stepNumber === enrollment.stepNumber,
      ) ?? null;

    actions.set(leadId, {
      title: sequenceStepActionTitle(step),
      dueAt: enrollment.dueAt,
      source: "sequence",
    });
  }

  return actions;
}

async function fetchEarliestTasks(
  supabase: SupabaseClient<Database>,
  accountId: string,
  leadIds: string[],
): Promise<TaskCandidate[]> {
  const found: TaskCandidate[] = [];

  for (const leadIdChunk of chunks(leadIds, LEAD_CHUNK)) {
    const pending = new Set(leadIdChunk);
    let offset = 0;

    while (pending.size > 0) {
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("lead_id, title, due_at")
        .eq("account_id", accountId)
        .in("lead_id", leadIdChunk)
        .is("completed_at", null)
        .order("due_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);

      const rows = data ?? [];
      for (const row of rows) {
        if (!pending.has(row.lead_id)) continue;
        pending.delete(row.lead_id);
        found.push({
          leadId: row.lead_id,
          title: row.title,
          dueAt: row.due_at,
        });
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return found;
}

async function fetchEarliestEnrollments(
  supabase: SupabaseClient<Database>,
  accountId: string,
  leadIds: string[],
): Promise<EnrollmentCandidate[]> {
  const found: EnrollmentCandidate[] = [];

  for (const leadIdChunk of chunks(leadIds, LEAD_CHUNK)) {
    const pending = new Set(leadIdChunk);
    let offset = 0;

    while (pending.size > 0) {
      const { data, error } = await supabase
        .from("lead_sequence_enrollments")
        .select("lead_id, sequence_id, current_step_number, next_step_due_at")
        .eq("account_id", accountId)
        .eq("status", "active")
        .in("lead_id", leadIdChunk)
        .not("next_step_due_at", "is", null)
        .order("next_step_due_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);

      const rows = data ?? [];
      for (const row of rows) {
        if (!row.next_step_due_at || !pending.has(row.lead_id)) continue;
        pending.delete(row.lead_id);
        found.push({
          leadId: row.lead_id,
          sequenceId: row.sequence_id,
          stepNumber: row.current_step_number,
          dueAt: row.next_step_due_at,
        });
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return found;
}

async function fetchSteps(
  supabase: SupabaseClient<Database>,
  accountId: string,
  enrollments: EnrollmentCandidate[],
): Promise<StepCandidate[]> {
  const sequenceIds = [...new Set(enrollments.map((enrollment) => enrollment.sequenceId))];
  if (sequenceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sequence_steps")
    .select("sequence_id, step_number, subject, channel")
    .eq("account_id", accountId)
    .in("sequence_id", sequenceIds);

  if (error) throw new Error(error.message);

  return (data ?? []).map((step) => ({
    sequenceId: step.sequence_id,
    stepNumber: step.step_number,
    subject: step.subject,
    channel: step.channel,
  }));
}

export async function loadNextActions(
  supabase: SupabaseClient<Database>,
  accountId: string,
  leadIds: string[],
): Promise<Map<string, LeadNextAction>> {
  if (leadIds.length === 0) return new Map();

  const tasks = await fetchEarliestTasks(supabase, accountId, leadIds);
  const covered = new Set(tasks.map((task) => task.leadId));
  const missing = leadIds.filter((leadId) => !covered.has(leadId));
  const enrollments =
    missing.length > 0
      ? await fetchEarliestEnrollments(supabase, accountId, missing)
      : [];
  const steps =
    enrollments.length > 0
      ? await fetchSteps(supabase, accountId, enrollments)
      : [];

  return resolveNextActions({ leadIds, tasks, enrollments, steps });
}
