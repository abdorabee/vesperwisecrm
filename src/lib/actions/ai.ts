"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";
import { consumeRateLimit } from "@/lib/rate-limit";
import { parseCallNotes } from "@/lib/ai/parse-call-notes";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";
import { scoreAndStoreLead } from "@/lib/ai/score-lead-record";
import type { LeadScoreResult } from "@/lib/ai/score-lead";

// Each call spends Anthropic tokens, so budget per member rather than per
// account -- one member should not be able to exhaust the whole team's quota.
const AI_CALLS_PER_MINUTE = 20;

async function requireAiBudget(scope: string): Promise<string> {
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "ai");
  const userId = await requireUserId();

  const withinBudget = await consumeRateLimit({
    scope,
    identifier: userId,
    limit: AI_CALLS_PER_MINUTE,
    windowSeconds: 60,
  });
  if (!withinBudget) {
    throw new Error("Too many AI requests. Wait a moment and try again.");
  }

  return accountId;
}

export async function parseCallNotesAction(
  rawText: string,
): Promise<ExtractedCallNoteFields> {
  await requireAiBudget("ai-parse-call-notes");
  return parseCallNotes(rawText);
}

export async function scoreLeadAction(
  leadId: string,
): Promise<LeadScoreResult> {
  const accountId = await requireAiBudget("ai-score-lead");
  const userId = await requireUserId();
  const supabase = await createClient();
  const result = await scoreAndStoreLead(supabase, accountId, leadId, userId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/queue");
  return result;
}
