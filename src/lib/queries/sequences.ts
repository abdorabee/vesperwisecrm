import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export async function getSequences(): Promise<Tables<"sequences">[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sequences")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export interface SequenceDetail {
  sequence: Tables<"sequences">;
  steps: Tables<"sequence_steps">[];
}

export async function getSequenceDetail(
  sequenceId: string,
): Promise<SequenceDetail> {
  await requireAccountId();
  const supabase = await createClient();

  const { data: sequence, error: sequenceError } = await supabase
    .from("sequences")
    .select("*")
    .eq("id", sequenceId)
    .maybeSingle();

  if (sequenceError) {
    throw new Error(sequenceError.message);
  }
  if (!sequence) {
    notFound();
  }

  const { data: steps, error: stepsError } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_number");

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  return { sequence, steps: steps ?? [] };
}

export interface LeadEnrollment extends Tables<"lead_sequence_enrollments"> {
  sequence: Pick<Tables<"sequences">, "id" | "name">;
  currentStep: Tables<"sequence_steps"> | null;
  totalSteps: number;
}

export async function getLeadEnrollments(
  leadId: string,
): Promise<LeadEnrollment[]> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("lead_sequence_enrollments")
    .select("*, sequence:sequence_id(id, name)")
    .eq("lead_id", leadId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  const sequenceIds = [...new Set(enrollments.map((e) => e.sequence_id))];

  const { data: allSteps, error: stepsError } = await supabase
    .from("sequence_steps")
    .select("*")
    .in("sequence_id", sequenceIds)
    .order("step_number");

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  return enrollments.map((enrollment) => {
    const stepsForSequence = (allSteps ?? []).filter(
      (s) => s.sequence_id === enrollment.sequence_id,
    );
    const currentStep =
      stepsForSequence.find(
        (s) => s.step_number === enrollment.current_step_number,
      ) ?? null;

    const { sequence, ...rest } = enrollment as unknown as Tables<"lead_sequence_enrollments"> & {
      sequence: Pick<Tables<"sequences">, "id" | "name">;
    };

    return {
      ...rest,
      sequence,
      currentStep,
      totalSteps: stepsForSequence.length,
    };
  });
}
