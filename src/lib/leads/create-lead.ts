import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatFromAddress,
  getAccountEmailSettings,
  isAccountEmailReady,
} from "@/lib/email/account-settings";
import {
  collapseWhitespace,
  digitsOnly,
  normalizePhoneToE164,
  normalizePostal,
  normalizeStoredAddressLine,
  normalizeStoredState,
} from "@/lib/migration/normalize";
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
    condition?: string | null;
    updatesDone?: string | null;
    updatesNeeded?: string | null;
    occupancyStatus?: string | null;
    tenantDurationRent?: string | null;
    motivation?: string | null;
    timeline?: string | null;
    workNeeded?: string | null;
    roofCondition?: string | null;
    flooringCondition?: string | null;
    kitchenBathCondition?: string | null;
    mortgage?: string | null;
    frameSidingCondition?: string | null;
    windowsCondition?: string | null;
    basementType?: string | null;
    wallsCondition?: string | null;
    electricalPlumbingCondition?: string | null;
    furnaceCondition?: string | null;
    waterHeaterCondition?: string | null;
    acCondition?: string | null;
    followUpContact?: string | null;
  };
  actorUserId?: string | null;
  notifyMembers?: boolean;
  qualificationStatus?: "submitted" | "needs_info" | "qualified" | "rejected" | null;
  submittedByUserId?: string | null;
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

interface ContactMatch {
  id: string;
  source: string | null;
  phone: string | null;
  phone_e164: string | null;
}

async function findContactByPhone(
  supabase: CRMClient,
  accountId: string,
  phone: string,
  phoneE164: string | null,
): Promise<ContactMatch | null> {
  const { data: digits, error: digitError } = await supabase.rpc(
    "smart_search_digits",
    { p_value: phone },
  );
  if (digitError) {
    throw new Error(digitError.message);
  }

  const last10 = (digits ?? "").slice(-10);
  if (phoneE164) {
    const { data: exact, error: exactError } = await supabase
      .from("contacts")
      .select("id, source, phone, phone_e164")
      .eq("account_id", accountId)
      .eq("phone_e164", phoneE164)
      .is("deleted_at", null)
      .limit(1);
    if (exactError) {
      throw new Error(exactError.message);
    }
    if (exact?.[0]) {
      return exact[0];
    }
  }

  if (last10.length < 10) {
    return null;
  }

  const { data: candidates, error } = await supabase
    .from("contacts")
    .select("id, source, phone, phone_e164")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .or(`phone.ilike.%${last10}%,phone_e164.ilike.%${last10}%`)
    .limit(20);
  if (error) {
    throw new Error(error.message);
  }

  for (const candidate of candidates ?? []) {
    const stored = candidate.phone_e164 || candidate.phone || "";
    if (digitsOnly(stored).slice(-10) !== last10) {
      continue;
    }
    const { data: candidateDigits, error: candidateError } = await supabase.rpc(
      "smart_search_digits",
      { p_value: stored },
    );
    if (candidateError) {
      throw new Error(candidateError.message);
    }
    if ((candidateDigits ?? "").slice(-10) === last10) {
      return candidate;
    }
  }

  return null;
}

async function syncMatchedContact(
  supabase: CRMClient,
  accountId: string,
  contact: ContactMatch,
  source: string | null,
  phoneE164: string | null,
): Promise<void> {
  const updates: {
    source?: string;
    phone?: string;
    phone_e164?: string;
  } = {};
  if (source && !contact.source) {
    updates.source = source;
  }
  if (phoneE164 && contact.phone_e164 !== phoneE164) {
    const currentLast10 = digitsOnly(contact.phone_e164 || contact.phone || "").slice(-10);
    const nextLast10 = digitsOnly(phoneE164).slice(-10);
    const sameNumber = !currentLast10 || currentLast10 === nextLast10;
    if (sameNumber) {
      updates.phone = phoneE164;
      updates.phone_e164 = phoneE164;
    }
  }
  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", contact.id)
    .eq("account_id", accountId);
  if (error) {
    throw new Error(error.message);
  }
}

async function findOrCreateContact(
  supabase: CRMClient,
  input: CreateLeadRecordInput,
): Promise<string> {
  const email = normalizeOptionalText(input.email);
  const phone = normalizeOptionalText(input.phone);
  const phoneE164 = phone ? normalizePhoneToE164(phone) : null;
  const company = normalizeOptionalText(input.company);
  const source = normalizeOptionalText(input.source);
  const firstName = collapseWhitespace(input.firstName);
  const lastName = collapseWhitespace(input.lastName ?? "") || null;

  let matched: ContactMatch | null = null;
  if (email) {
    const { data: existingContact, error: existingError } = await supabase
      .from("contacts")
      .select("id, source, phone, phone_e164")
      .eq("account_id", input.accountId)
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }
    matched = existingContact;
  }

  if (!matched && phone) {
    matched = await findContactByPhone(
      supabase,
      input.accountId,
      phone,
      phoneE164,
    );
  }

  if (matched) {
    await syncMatchedContact(
      supabase,
      input.accountId,
      matched,
      source,
      phoneE164,
    );
    return matched.id;
  }

  const { data: newContact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      account_id: input.accountId,
      first_name: firstName,
      last_name: lastName,
      email: email?.toLowerCase() ?? null,
      phone: phoneE164 ?? phone,
      phone_e164: phoneE164,
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
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const emailSettings = await getAccountEmailSettings(accountId);
  if (!isAccountEmailReady(emailSettings)) {
    return;
  }

  const fromAddress = formatFromAddress(emailSettings);

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
    from: fromAddress,
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
      qualification_status: input.qualificationStatus ?? null,
      submitted_by_user_id: input.submittedByUserId ?? null,
      // The creator owns the lead until routing reassigns it. Without this,
      // owner_user_id stays null and a member with assigned_only visibility
      // cannot read back the row they just created -- INSERT ... RETURNING is
      // subject to the SELECT policy -- so lead creation fails outright for
      // exactly the users the restriction applies to.
      owner_user_id: input.actorUserId ?? null,
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
        address_line1: normalizeOptionalText(
          normalizeStoredAddressLine(input.property.addressLine1 ?? ""),
        ),
        address_line2: normalizeOptionalText(
          normalizeStoredAddressLine(input.property.addressLine2 ?? ""),
        ),
        city: normalizeOptionalText(collapseWhitespace(input.property.city ?? "")),
        state: normalizeOptionalText(
          normalizeStoredState(input.property.state ?? ""),
        ),
        postal_code: normalizeOptionalText(
          normalizePostal(input.property.postalCode ?? ""),
        ),
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
        condition: normalizeOptionalText(input.property.condition),
        updates_done: normalizeOptionalText(input.property.updatesDone),
        updates_needed: normalizeOptionalText(input.property.updatesNeeded),
        occupancy_status: normalizeOptionalText(input.property.occupancyStatus),
        tenant_duration_rent: normalizeOptionalText(
          input.property.tenantDurationRent,
        ),
        motivation: normalizeOptionalText(input.property.motivation),
        timeline: normalizeOptionalText(input.property.timeline),
        work_needed: normalizeOptionalText(input.property.workNeeded),
        roof_condition: normalizeOptionalText(input.property.roofCondition),
        flooring_condition: normalizeOptionalText(
          input.property.flooringCondition,
        ),
        kitchen_bath_condition: normalizeOptionalText(
          input.property.kitchenBathCondition,
        ),
        mortgage: normalizeOptionalText(input.property.mortgage),
        frame_siding_condition: normalizeOptionalText(
          input.property.frameSidingCondition,
        ),
        windows_condition: normalizeOptionalText(
          input.property.windowsCondition,
        ),
        basement_type: normalizeOptionalText(input.property.basementType),
        walls_condition: normalizeOptionalText(input.property.wallsCondition),
        electrical_plumbing_condition: normalizeOptionalText(
          input.property.electricalPlumbingCondition,
        ),
        furnace_condition: normalizeOptionalText(
          input.property.furnaceCondition,
        ),
        water_heater_condition: normalizeOptionalText(
          input.property.waterHeaterCondition,
        ),
        ac_condition: normalizeOptionalText(input.property.acCondition),
        follow_up_contact: normalizeOptionalText(
          input.property.followUpContact,
        ),
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
      title: input.title.trim(),
      contact_name:
        [normalizeOptionalText(input.firstName), normalizeOptionalText(input.lastName)]
          .filter(Boolean)
          .join(" ") || null,
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
