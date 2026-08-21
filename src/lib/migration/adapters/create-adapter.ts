import {
  detectScoreFromAliases,
  guessMappingFromAliases,
  mapRowToCanonical,
} from "@/lib/migration/mapping";
import type { SourceAdapter, SourceCrmId } from "@/lib/migration/types";

export function createSourceAdapter(config: {
  id: SourceCrmId;
  label: string;
  headerAliases: Record<string, string[]>;
}): SourceAdapter {
  return {
    id: config.id,
    label: config.label,
    headerAliases: config.headerAliases,
    detectScore(headers) {
      return detectScoreFromAliases(headers, config.headerAliases);
    },
    mapRow(row, mapping) {
      return mapRowToCanonical(row, mapping, config.label);
    },
  };
}

export function suggestMapping(
  adapter: SourceAdapter,
  headers: string[],
): Record<string, string> {
  return guessMappingFromAliases(headers, adapter.headerAliases);
}
