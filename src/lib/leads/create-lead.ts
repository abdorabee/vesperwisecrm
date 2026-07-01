import type { SupabaseClient } from "@supabase/supabase-js";
import { getResendClient } from "@/lib/resend/client";
import type { Database } from "@/lib/supabase/types";

type CRMClient = SupabaseClient<Database>;

export interface CreateLeadRecordInput {
  accountId: string;
  title: string;
  pipelineStageId?: string | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  value?: number | null;
  property?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    propertyType?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    squareFeet?: number | null;
    askingPrice?: number | null;
    estimatedValue?: number | null;
    contractStatus?: string | null;
    contractAmount?: number | null;
    contractCloseDate?: string | null;
    notes?: string | null;
  };
  actorUserId?: string | null;
  notifyMembers?: boolean;
}

export interface CreateLeadRecordResult {
  leadId: string;
  contactId: string;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasPropertyData(
  property: CreateLeadRecordInput["property"],
): property is NonNullable<CreateLeadRecordInput["property"]> {
  if (!property) {
    return false;
  }

  return Object.entries(property).some(([key, value]) => {
    if (key === "contractStatus") {
      return value != null && value !== "none";
    }

    return value != null && value !== "";
  });
}

async function resolvePipelineStageId(
  supabase: CRMClient,
  accountId: string,
  pipelineStageId: string | null | undefined,
): Promise<string> {
  if (pipelineStageId) {
    return pipelineStageId;
  }

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("account_id", accountId)
    .order("display_order")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No pipeline stage found for account");
  }

  return data.id;
}

async function findOrCreateContact(
  supabase: CRMClient,
  input: CreateLeadRecordInput,
): Promise<string> {
  const email = normalizeOptionalText(input.email);
  const phone = normalizeOptionalText(input.phone);
  const company = normalizeOptionalText(input.company);
  const source = normalizeOptionalText(input.source);
  const lastName = normalizeOptionalText(input.lastName);

  if (email) {
    const { data: existingContact, error: existingError } = await supabase
      .from("contacts")
      .select("id, source")
      .eq("account_id", input.accountId)
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingContact) {
      if (source && !existingContact.source) {
        const { error: sourceError } = await supabase
          .from("contacts")
          .update({ source })
          .eq("id", existingContact.id)
          .eq("account_id", input.accountId);

        if (sourceError) {
          throw new Error(sourceError.message);
        }
      }

      return existingContact.id;
    }
  }

  const { data: newContact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      account_id: input.accountId,
      first_name: input.firstName.trim(),
      last_name: lastName,
      email,
      phone,
      company,
      source,
    })
    .select("id")
    .single();

  if (contactError || !newContact) {
    throw new Error(contactError?.message ?? "Failed to create contact");
  }

  return newContact.id;
}

async function notifyAccountMembers(
  supabase: CRMClient,
  leadId: string,
  accountId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return;
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("title, contact:contact_id(first_name, last_name, email, phone, company, source)")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found for notification");
  }

  const { data: members, error: membersError } = await supabase.rpc(
    "get_account_member_profiles",
    { p_account_id: accountId },
  );

  if (membersError) {
    throw new Error(membersError.message);
  }

  const to = [...new Set((members ?? []).map((member) => member.email))].filter(
    Boolean,
  );
  if (to.length === 0) {
    return;
  }

  const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;
  const contactName = [contact?.first_name, contact?.last_name]
    .filter(Boolean)
    .join(" ");
  const detailLines = [
    `Lead: ${lead.title}`,
    contactName ? `Contact: ${contactName}` : null,
    contact?.company ? `Company: ${contact.company}` : null,
    contact?.email ? `Email: ${contact.email}` : null,
    contact?.phone ? `Phone: ${contact.phone}` : null,
    contact?.source ? `Source: ${contact.source}` : null,
  ].filter(Boolean);

  const resend = getResendClient();
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: `New lead: ${lead.title}`,
    text: [
      "A new lead was added to VesperwiseCRM.",
      "",
      ...detailLines,
      "",
      "Open the pipeline to review and respond.",
    ].join("\n"),
  });
}

export async function createLeadRecord(
  supabase: CRMClient,
  input: CreateLeadRecordInput,
): Promise<CreateLeadRecordResult> {
  const pipelineStageId = await resolvePipelineStageId(
    supabase,
    input.accountId,
    input.pipelineStageId,
  );
  const contactId = await findOrCreateContact(supabase, input);

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      account_id: input.accountId,
      contact_id: contactId,
      pipeline_stage_id: pipelineStageId,
      title: input.title.trim(),
      value: input.value ?? null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Failed to create lead");
  }

  if (hasPropertyData(input.property)) {
    const { error: propertyError } = await supabase
      .from("lead_properties")
      .insert({
        account_id: input.accountId,
        lead_id: lead.id,
        address_line1: normalizeOptionalText(input.property.addressLine1),
        address_line2: normalizeOptionalText(input.property.addressLine2),
        city: normalizeOptionalText(input.property.city),
        state: normalizeOptionalText(input.property.state),
        postal_code: normalizeOptionalText(input.property.postalCode),
        property_type: normalizeOptionalText(input.property.propertyType),
        bedrooms: input.property.bedrooms ?? null,
        bathrooms: input.property.bathrooms ?? null,
        square_feet: input.property.squareFeet ?? null,
        asking_price: input.property.askingPrice ?? null,
        estimated_value: input.property.estimatedValue ?? null,
        contract_status: input.property.contractStatus ?? "none",
        contract_amount: input.property.contractAmount ?? null,
        contract_close_date: normalizeOptionalText(
          input.property.contractCloseDate,
        ),
        notes: normalizeOptionalText(input.property.notes),
      });

    if (propertyError) {
      throw new Error(propertyError.message);
    }
  }

  await supabase.from("activities").insert({
    account_id: input.accountId,
    lead_id: lead.id,
    type: "lead_created",
    actor_user_id: input.actorUserId ?? null,
    payload: {
      title: input.title,
      source: normalizeOptionalText(input.source),
    },
  });

  if (input.notifyMembers) {
    try {
      await notifyAccountMembers(supabase, lead.id, input.accountId);
    } catch (error) {
      await supabase.from("activities").insert({
        account_id: input.accountId,
        lead_id: lead.id,
        type: "note_added",
        actor_user_id: null,
        payload: {
          note: `New-lead notification failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          system: true,
        },
      });
    }
  }

  return { leadId: lead.id, contactId };
}
