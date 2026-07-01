import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createLeadRecord } from "@/lib/leads/create-lead";
import { intakeLeadSchema } from "@/lib/validations/lead";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";

function isAuthorized(request: Request): boolean {
  const secret = process.env.LEAD_INTAKE_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    source: data.source ?? "Webhook",
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
        }
      : undefined,
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
