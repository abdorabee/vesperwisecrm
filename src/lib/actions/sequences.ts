"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { sequenceSchema, type SequenceInput } from "@/lib/validations/sequence";

export async function saveSequence(
  input: SequenceInput,
  sequenceId?: string,
): Promise<{ sequenceId: string }> {
  const data = sequenceSchema.parse(input);
  const accountId = await requireAccountId();
  const supabase = await createClient();

  let id = sequenceId;

  if (id) {
    const { error } = await supabase
      .from("sequences")
      .update({ name: data.name, description: data.description || null })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("sequence_steps")
      .delete()
      .eq("sequence_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const { data: sequence, error } = await supabase
      .from("sequences")
      .insert({
        account_id: accountId,
        name: data.name,
        description: data.description || null,
      })
      .select("id")
      .single();

    if (error || !sequence) {
      throw new Error(error?.message ?? "Failed to create sequence");
    }
    id = sequence.id;
  }

  const stepsToInsert = data.steps.map((step, index) => ({
    account_id: accountId,
    sequence_id: id!,
    step_number: index + 1,
    channel: step.channel,
    delay_days: step.delayDays ? Number(step.delayDays) : 0,
    subject: step.channel === "email" ? step.subject || null : null,
    body_template: step.bodyTemplate,
  }));

  const { error: insertError } = await supabase
    .from("sequence_steps")
    .insert(stepsToInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/sequences");
  revalidatePath(`/sequences/${id}`);

  return { sequenceId: id! };
}
