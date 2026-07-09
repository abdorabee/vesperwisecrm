import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createLeadRecord } from "@/lib/leads/create-lead";
import { intakeLeadSchema } from "@/lib/validations/lead";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";

interface AuthResult {
  authorized: boolean;
  sourceName?: string;
}

async function authorize(
  request: Request,
  supabase: ReturnType<typeof createServiceRoleClient>,
  accountId: string,
): Promise<AuthResult> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return { authorized: false };
  }

  const legacySecret = process.env.LEAD_INTAKE_SECRET;
  if (legacySecret && token === legacySecret) {
    return { authorized: true, sourceName: "legacy" };
  }

  const { data: source } = await supabase
    .from("lead_intake_sources")
    .select("name, account_id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!source || source.revoked_at || source.account_id !== accountId) {
    return { authorized: false };
  }

  return { authorized: true, sourceName: source.name };
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = intakeLeadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const supabase = createServiceRoleClient();

  const auth = await authorize(request, supabase, data.accountId);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", data.accountId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { leadId } = await createLeadRecord(supabase, {
    accountId: data.accountId,
    title: data.title,
    pipelineStageId: data.pipelineStageId ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    company: data.company,
    source: data.source ?? auth.sourceName ?? "Webhook",
    value: data.value ? Number(data.value) : null,
    property: data.property
      ? {
          addressLine1: data.property.addressLine1,
          addressLine2: data.property.addressLine2,
          city: data.property.city,
          state: data.property.state,
          postalCode: data.property.postalCode,
          propertyType: data.property.propertyType,
          bedrooms: data.property.bedrooms ? Number(data.property.bedrooms) : null,
          bathrooms: data.property.bathrooms
            ? Number(data.property.bathrooms)
            : null,
          squareFeet: data.property.squareFeet
            ? Number(data.property.squareFeet)
            : null,
          askingPrice: data.property.askingPrice
            ? Number(data.property.askingPrice)
            : null,
          estimatedValue: data.property.estimatedValue
            ? Number(data.property.estimatedValue)
            : null,
          contractStatus: data.property.contractStatus,
          contractAmount: data.property.contractAmount
            ? Number(data.property.contractAmount)
            : null,
          contractCloseDate: data.property.contractCloseDate,
          notes: data.property.notes,
          condition: data.property.condition,
          updatesDone: data.property.updatesDone,
          updatesNeeded: data.property.updatesNeeded,
          occupancyStatus: data.property.occupancyStatus,
          tenantDurationRent: data.property.tenantDurationRent,
          motivation: data.property.motivation,
          timeline: data.property.timeline,
          workNeeded: data.property.workNeeded,
          roofCondition: data.property.roofCondition,
          flooringCondition: data.property.flooringCondition,
          kitchenBathCondition: data.property.kitchenBathCondition,
          mortgage: data.property.mortgage,
          frameSidingCondition: data.property.frameSidingCondition,
          windowsCondition: data.property.windowsCondition,
          basementType: data.property.basementType,
          wallsCondition: data.property.wallsCondition,
          electricalPlumbingCondition: data.property.electricalPlumbingCondition,
          furnaceCondition: data.property.furnaceCondition,
          waterHeaterCondition: data.property.waterHeaterCondition,
          acCondition: data.property.acCondition,
          followUpContact: data.property.followUpContact,
        }
      : undefined,
    qualificationStatus: "submitted",
    notifyMembers: true,
  });

  await runTriggeredWorkflows(
    supabase as Parameters<typeof runTriggeredWorkflows>[0],
    data.accountId,
    "lead_created",
    { leadId },
  );

  return NextResponse.json({ leadId }, { status: 201 });
}
