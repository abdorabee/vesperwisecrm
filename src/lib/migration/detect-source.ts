import { genericAdapter } from "@/lib/migration/adapters/generic";
import { SOURCE_ADAPTERS } from "@/lib/migration/adapters/registry";
import { DETECT_SCORE_THRESHOLD } from "@/lib/migration/constants";
import type { SourceAdapter, SourceCrmId } from "@/lib/migration/types";

export function detectSourceCrm(
  headers: string[],
  preferred?: SourceCrmId | null,
): SourceAdapter {
  if (preferred) {
    const selected = SOURCE_ADAPTERS.find((adapter) => adapter.id === preferred);
    if (selected) {
      return selected;
    }
  }

  let best = genericAdapter;
  let bestScore = genericAdapter.detectScore(headers);

  for (const adapter of SOURCE_ADAPTERS) {
    if (adapter.id === "generic") {
      continue;
    }
    const score = adapter.detectScore(headers);
    if (score > bestScore && score >= DETECT_SCORE_THRESHOLD) {
      best = adapter;
      bestScore = score;
    }
  }

  if (bestScore < DETECT_SCORE_THRESHOLD) {
    return genericAdapter;
  }

  return best;
}
