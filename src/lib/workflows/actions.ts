import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLeadEmail } from "@/lib/actions/email";
import {
  formatFromAddress,
  getAccountEmailSettings,
  isAccountEmailReady,
} from "@/lib/email/account-settings";
import { sanitizeEmailHeader } from "@/lib/email/escape-html";
import { getResendClient } from "@/lib/resend/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database, Tables } from "@/lib/supabase/types";
import { resolveTemplate } from "@/lib/templates";

type Db = SupabaseClient<Database>;

function configString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serviceDb(): Db {
  return createServiceRoleClient();
}

async function managerUserId(db: Db, accountId: string): Promise<string | null> {
  const { data, error } = await db
    .from("account_members")
    .select("user_id, role, job_function")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  const members = data ?? [];
  const manager =
    members.find((member) => member.job_function === "lead_manager") ??
    members.find((member) => member.job_function === "acquisitions_manager") ??
    members.find((member) => member.role === "owner") ??
    members.find((member) => member.role === "admin");

  return manager?.user_id ?? null;
}

async function memberEmail(db: Db, userId: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(error.message);
  }
  return data.user?.email ?? null;
}

async function internalFromAddress(accountId: string): Promise<string | null> {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  const settings = await getAccountEmailSettings(accountId);
  if (isAccountEmailReady(settings)) {
    return formatFromAddress(settings);
  }

  const platform = process.env.RESEND_FROM_EMAIL?.trim();
  if (!platform) {
    return null;
  }

  return platform.includes("<") ? platform : `Vesperwise <${platform}>`;
}

async function enrollLead(db: Db, accountId: string, leadId: string, sequenceId: string) {
  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  const { data: sequence, error: sequenceError } = await db
    .from("sequences")
    .select("name")
    .eq("id", sequenceId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (leadError || sequenceError || !lead || !sequence) {
    throw new Error(
      leadError?.message ??
        sequenceError?.message ??
        "Lead and sequence must belong to this workspace",
    );
  }

  const { data: activeEnrollment, error: activeError } = await db
    .from("lead_sequence_enrollments")
    .select("id")
    .eq("account_id", accountId)
    .eq("lead_id", leadId)
    .eq("sequence_id", sequenceId)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    throw new Error(activeError.message);
  }
  if (activeEnrollment) {
    return;
  }

  const { data: firstStep } = await db
    .from("sequence_steps")
    .select("delay_days")
    .eq("sequence_id", sequenceId)
    .eq("account_id", accountId)
    .eq("step_number", 1)
    .maybeSingle();

  const nextStepDueAt = firstStep
    ? new Date(Date.now() + firstStep.delay_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await db.from("lead_sequence_enrollments").insert({
    account_id: accountId,
    lead_id: leadId,
    sequence_id: sequenceId,
    status: "active",
    current_step_number: 1,
    next_step_due_at: nextStepDueAt,
  });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    throw new Error(error.message);
  }

  await db.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "sequence_enrolled",
    payload: { sequence_name: sequence.name },
  });
}

async function assignRoundRobin(db: Db, accountId: string, leadId: string, groupId: string) {
  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();
  const { data: group, error: groupError } = await db
    .from("lead_groups")
    .select("id")
    .eq("id", groupId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (leadError || groupError || !lead || !group) {
    throw new Error(leadError?.message ?? groupError?.message ?? "Lead or routing group not found");
  }

  const { data, error } = await db.rpc("assign_lead_round_robin", {
    p_lead_id: leadId,
    p_group_id: groupId,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("No eligible teammate in that routing group");
  }
}

async function reassignLead(
  db: Db,
  accountId: string,
  leadId: string,
  config: Record<string, unknown>,
) {
  const groupId = configString(config.groupId);
  if (groupId) {
    await assignRoundRobin(db, accountId, leadId, groupId);
    return;
  }

  const explicitUserId = configString(config.userId);
  const userId = explicitUserId || (await managerUserId(db, accountId));
  if (!userId) {
    throw new Error("No manager to reassign this lead to");
  }

  const { data: member, error: memberError } = await db
    .from("account_members")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !member) {
    throw new Error(memberError?.message ?? "Team member not found");
  }

  const { data: updated, error } = await db
    .from("leads")
    .update({ owner_user_id: userId })
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  if (!updated?.length) {
    throw new Error("Lead not found");
  }

  await db.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "lead_assigned",
    payload: { user_id: userId, source: "workflow" },
  });
}

async function createTask(
  db: Db,
  accountId: string,
  leadId: string,
  config: Record<string, unknown>,
) {
  const title = configString(config.title);
  if (!title) {
    throw new Error("Workflow action is missing a task title");
  }

  const dueInDays = Number(config.dueInDays ?? 1);
  const days = Number.isFinite(dueInDays) && dueInDays > 0 ? dueInDays : 1;
  const priority =
    config.priority === "low" || config.priority === "high" || config.priority === "normal"
      ? config.priority
      : "normal";

  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("id, owner_user_id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  let assignee = configString(config.userId) || lead.owner_user_id;
  if (assignee) {
    const { data: member } = await db
      .from("account_members")
      .select("user_id")
      .eq("account_id", accountId)
      .eq("user_id", assignee)
      .maybeSingle();
    if (!member) {
      assignee = lead.owner_user_id;
    }
  }

  const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { data: task, error } = await db
    .from("lead_tasks")
    .insert({
      account_id: accountId,
      lead_id: leadId,
      title,
      description: configString(config.description) || null,
      due_at: dueAt,
      priority,
      assigned_user_id: assignee,
    })
    .select("id")
    .single();

  if (error || !task) {
    throw new Error(error?.message ?? "Failed to create task");
  }

  await db.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "task_created",
    payload: { task_id: task.id, title, due_at: dueAt },
  });
}

async function notifyUser(
  db: Db,
  accountId: string,
  leadId: string,
  config: Record<string, unknown>,
) {
  const explicitUserId = configString(config.userId);
  const userId = explicitUserId || (await managerUserId(db, accountId));
  if (!userId) {
    throw new Error("No manager to notify");
  }

  const { data: member, error: memberError } = await db
    .from("account_members")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !member) {
    throw new Error(memberError?.message ?? "Team member not found");
  }

  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("title, pipeline_stage_id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: stage } = await db
    .from("pipeline_stages")
    .select("name")
    .eq("id", lead.pipeline_stage_id)
    .eq("account_id", accountId)
    .maybeSingle();

  const email = await memberEmail(db, userId);
  const from = await internalFromAddress(accountId);
  const subject = sanitizeEmailHeader(
    configString(config.subject) || `Lead needs attention: ${lead.title}`,
  );
  const customBody = configString(config.bodyTemplate) || configString(config.body);
  const text = customBody
    ? customBody
    : [
        "A workflow asked us to notify you about this lead.",
        "",
        `Lead: ${lead.title}`,
        stage?.name ? `Stage: ${stage.name}` : null,
        "",
        "Open the lead in Vesperwise to follow up.",
      ]
        .filter(Boolean)
        .join("\n");

  let status: "sent" | "skipped" = "skipped";
  let reason: string | null = null;

  if (!email) {
    reason = "manager_has_no_email";
  } else if (!from) {
    reason = "email_not_configured";
  } else {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject,
      text,
    });
    if (error) {
      throw new Error(error.message);
    }
    status = "sent";
  }

  await db.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "user_notified",
    payload: {
      status,
      to: email,
      user_id: userId,
      reason,
    },
  });
}

// change_stage and add_tag write directly here instead of calling the public
// updateLeadStage/addTagToLead actions, which would import this module's
// caller (engine.ts) and create a circular import. It also means these two
// action types never cascade into another workflow run.
export async function runWorkflowAction(
  supabase: Db,
  accountId: string,
  leadId: string,
  action: Tables<"workflow_actions">,
): Promise<void> {
  const config = (action.action_config ?? {}) as Record<string, unknown>;

  switch (action.action_type) {
    case "send_email_template": {
      const { data: lead } = await supabase
        .from("leads")
        .select("contact:contact_id(first_name, last_name)")
        .eq("id", leadId)
        .eq("account_id", accountId)
        .maybeSingle();

      const contact = Array.isArray(lead?.contact) ? lead.contact[0] : lead?.contact;

      if (!contact) {
        throw new Error("Lead has no contact on file");
      }

      await sendLeadEmail(leadId, {
        subject: resolveTemplate(String(config.subject ?? ""), contact),
        body: resolveTemplate(String(config.bodyTemplate ?? ""), contact),
      });
      break;
    }
    case "enroll_sequence": {
      const sequenceId = configString(config.sequenceId);
      if (!sequenceId) {
        throw new Error("Workflow action is missing a sequence");
      }
      await enrollLead(serviceDb(), accountId, leadId, sequenceId);
      break;
    }
    case "add_tag": {
      const tagId = configString(config.tagId);
      if (!tagId) {
        throw new Error("Workflow action is missing a tag");
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("id", leadId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!lead) {
        throw new Error("Lead not found");
      }

      const { data: tag } = await supabase
        .from("tags")
        .select("name")
        .eq("id", tagId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!tag) {
        throw new Error("Tag not found");
      }

      const { error: insertError } = await supabase
        .from("lead_tags")
        .insert({ account_id: accountId, lead_id: leadId, tag_id: tagId });

      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message);
      }

      await supabase.from("activities").insert({
        account_id: accountId,
        lead_id: leadId,
        type: "tag_added",
        payload: { tag_name: tag?.name ?? "tag" },
      });
      break;
    }
    case "assign_round_robin": {
      const groupId = configString(config.groupId);
      if (!groupId) {
        throw new Error("Workflow action is missing a routing group");
      }
      await assignRoundRobin(serviceDb(), accountId, leadId, groupId);
      break;
    }
    case "reassign": {
      await reassignLead(serviceDb(), accountId, leadId, config);
      break;
    }
    case "create_task": {
      await createTask(serviceDb(), accountId, leadId, config);
      break;
    }
    case "notify_user": {
      await notifyUser(serviceDb(), accountId, leadId, config);
      break;
    }
    case "change_stage": {
      const stageId = configString(config.stageId);
      if (!stageId) {
        throw new Error("Workflow action is missing a stage");
      }

      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("name, is_won, is_lost")
        .eq("id", stageId)
        .eq("account_id", accountId)
        .maybeSingle();

      if (!stage) {
        throw new Error("Target stage not found");
      }

      const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";

      const { data: updated, error: updateError } = await supabase
        .from("leads")
        .update({ pipeline_stage_id: stageId, status })
        .eq("id", leadId)
        .eq("account_id", accountId)
        .select("id");

      if (updateError) {
        throw new Error(updateError.message);
      }
      if (!updated?.length) {
        throw new Error("Lead not found");
      }

      await supabase.from("activities").insert({
        account_id: accountId,
        lead_id: leadId,
        type: "stage_changed",
        payload: { to_stage: stage.name },
      });
      break;
    }
    default:
      throw new Error(`Unknown workflow action type: ${action.action_type}`);
  }
}
