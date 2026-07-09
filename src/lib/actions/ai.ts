"use server";

import { requireAccountId } from "@/lib/supabase/account";
import { parseCallNotes } from "@/lib/ai/parse-call-notes";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";

export async function parseCallNotesAction(
  rawText: string,
): Promise<ExtractedCallNoteFields> {
  await requireAccountId();
  return parseCallNotes(rawText);
}
