import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export interface SubmittedLead extends Tables<"leads"> {
  contact: Pick<
    Tables<"contacts">,
    "id" | "first_name" | "last_name" | "phone" | "email"
  >;
  property: Tables<"lead_properties"> | null;
}

export async function getSubmittedLeadsQueue(): Promise<SubmittedLead[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "*, contact:contact_id(id, first_name, last_name, phone, email), property:lead_properties(*)",
    )
    .eq("account_id", accountId)
    .eq("qualification_status", "submitted")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((lead) => {
    const { property, ...rest } = lead as unknown as Tables<"leads"> & {
      contact: SubmittedLead["contact"];
      property: Tables<"lead_properties">[] | Tables<"lead_properties"> | null;
    };

    return {
      ...rest,
      property: Array.isArray(property) ? (property[0] ?? null) : property,
    };
  });
}
