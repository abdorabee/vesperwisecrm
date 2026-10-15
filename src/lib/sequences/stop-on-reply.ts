import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function stopActiveSequenceEnrollments(
  supabase: SupabaseClient<Database>,
  params: { accountId: string; leadId: string },
): Promise<void> {
  const { error } = await supabase
    .from("lead_sequence_enrollments")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      next_step_due_at: null,
    })
    .eq("account_id", params.accountId)
    .eq("lead_id", params.leadId)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }
}
