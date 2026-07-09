"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/account";
import {
  clientCommentSchema,
  clientInterestSchema,
  type ClientCommentInput,
  type ClientInterestInput,
} from "@/lib/validations/client";

// Shared by both the internal lead-detail page and the client portal --
// RLS decides which side is allowed to write, this just does the insert.
export async function addLeadClientComment(
  leadId: string,
  input: ClientCommentInput,
): Promise<void> {
  const data = clientCommentSchema.parse(input);
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("account_id, client_id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead || !lead.client_id) {
    throw new Error(leadError?.message ?? "Lead is not assigned to a client");
  }

  const { error } = await supabase.from("lead_client_comments").insert({
    account_id: lead.account_id,
    lead_id: leadId,
    client_id: lead.client_id,
    author_user_id: userId,
    body: data.body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/portal/leads/${leadId}`);
}

export async function setClientInterest(
  leadId: string,
  input: ClientInterestInput,
): Promise<void> {
  const data = clientInterestSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_client_lead_interest", {
    p_lead_id: leadId,
    p_status: data.status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/portal/leads/${leadId}`);
  revalidatePath("/portal");
}
