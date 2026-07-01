"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import {
  completeTaskSchema,
  createTaskSchema,
  type CompleteTaskInput,
  type CreateTaskInput,
} from "@/lib/validations/task";

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalUserId(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

export async function createLeadTask(
  leadId: string,
  input: CreateTaskInput,
): Promise<{ taskId: string }> {
  const data = createTaskSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: task, error } = await supabase
    .from("lead_tasks")
    .insert({
      account_id: accountId,
      lead_id: leadId,
      title: data.title,
      description: optionalText(data.description),
      due_at: new Date(data.dueAt).toISOString(),
      priority: data.priority,
      assigned_user_id: optionalUserId(data.assignedUserId) ?? userId,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (error || !task) {
    throw new Error(error?.message ?? "Failed to create task");
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "task_created",
    actor_user_id: userId,
    payload: {
      task_id: task.id,
      title: data.title,
      due_at: new Date(data.dueAt).toISOString(),
    },
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return { taskId: task.id };
}

export async function completeLeadTask(
  taskId: string,
  input: CompleteTaskInput,
): Promise<{ nextTaskId: string }> {
  const data = completeTaskSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: task, error: taskError } = await supabase
    .from("lead_tasks")
    .select("id, lead_id, title")
    .eq("id", taskId)
    .eq("account_id", accountId)
    .is("completed_at", null)
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Open task not found");
  }

  const nextDueAt = new Date(data.nextDueAt).toISOString();
  const { data: nextTask, error: nextTaskError } = await supabase
    .from("lead_tasks")
    .insert({
      account_id: accountId,
      lead_id: task.lead_id,
      title: data.nextTitle,
      description: optionalText(data.nextDescription),
      due_at: nextDueAt,
      priority: data.nextPriority,
      assigned_user_id: optionalUserId(data.nextAssignedUserId) ?? userId,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (nextTaskError || !nextTask) {
    throw new Error(nextTaskError?.message ?? "Failed to create next task");
  }

  const completedAt = new Date().toISOString();
  const { error: completeError } = await supabase
    .from("lead_tasks")
    .update({
      completed_at: completedAt,
      completed_by_user_id: userId,
      completion_note: optionalText(data.completionNote),
      next_task_id: nextTask.id,
    })
    .eq("id", taskId)
    .eq("account_id", accountId);

  if (completeError) {
    throw new Error(completeError.message);
  }

  await supabase.from("activities").insert([
    {
      account_id: accountId,
      lead_id: task.lead_id,
      type: "task_completed",
      actor_user_id: userId,
      payload: {
        task_id: task.id,
        title: task.title,
        next_task_id: nextTask.id,
      },
    },
    {
      account_id: accountId,
      lead_id: task.lead_id,
      type: "task_created",
      actor_user_id: userId,
      payload: {
        task_id: nextTask.id,
        title: data.nextTitle,
        due_at: nextDueAt,
        source: "next_step",
      },
    },
  ]);

  revalidatePath("/");
  revalidatePath(`/leads/${task.lead_id}`);

  return { nextTaskId: nextTask.id };
}
