import { createClient } from "@/lib/supabase/server";
import { sendLeadEmail } from "@/lib/actions/email";
import { enrollLeadInSequence } from "@/lib/actions/enrollments";
import { assignLeadToGroup } from "@/lib/actions/groups";
import { resolveTemplate } from "@/lib/templates";
import type { Tables } from "@/lib/supabase/types";

// change_stage and add_tag write directly here instead of calling the public
// updateLeadStage/addTagToLead actions, which would import this module's
// caller (engine.ts) and create a circular import. It also means these two
// action types never cascade into another workflow run.
export async function runWorkflowAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
        .single();

      const contact = Array.isArray(lead?.contact)
        ? lead.contact[0]
        : lead?.contact;

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
      const sequenceId = String(config.sequenceId ?? "");
      if (!sequenceId) {
        throw new Error("Workflow action is missing a sequence");
      }
      await enrollLeadInSequence(leadId, sequenceId);
      break;
    }
    case "add_tag": {
      const tagId = String(config.tagId ?? "");
      if (!tagId) {
        throw new Error("Workflow action is missing a tag");
      }

      const { data: tag } = await supabase
        .from("tags")
        .select("name")
        .eq("id", tagId)
        .single();

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
      const groupId = String(config.groupId ?? "");
      if (!groupId) {
        throw new Error("Workflow action is missing a routing group");
      }
      await assignLeadToGroup(leadId, groupId);
      break;
    }
    case "change_stage": {
      const stageId = String(config.stageId ?? "");
      if (!stageId) {
        throw new Error("Workflow action is missing a stage");
      }

      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("name, is_won, is_lost")
        .eq("id", stageId)
        .single();

      if (!stage) {
        throw new Error("Target stage not found");
      }

      const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";

      const { error: updateError } = await supabase
        .from("leads")
        .update({ pipeline_stage_id: stageId, status })
        .eq("id", leadId);

      if (updateError) {
        throw new Error(updateError.message);
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
