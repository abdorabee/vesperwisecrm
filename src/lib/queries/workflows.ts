import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export async function getWorkflows(): Promise<Tables<"workflows">[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export interface WorkflowDetail {
  workflow: Tables<"workflows">;
  actions: Tables<"workflow_actions">[];
}

export async function getWorkflowDetail(
  workflowId: string,
): Promise<WorkflowDetail> {
  await requireAccountId();
  const supabase = await createClient();

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .maybeSingle();

  if (workflowError) {
    throw new Error(workflowError.message);
  }
  if (!workflow) {
    notFound();
  }

  const { data: actions, error: actionsError } = await supabase
    .from("workflow_actions")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("step_number");

  if (actionsError) {
    throw new Error(actionsError.message);
  }

  return { workflow, actions: actions ?? [] };
}
