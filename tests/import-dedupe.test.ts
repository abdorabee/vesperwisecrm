import { describe, expect, test } from "vitest";
import {
  buildRecordsFromCsv,
  previewMigrationCsv,
} from "../src/lib/migration/orchestrator";
import {
  countDuplicateActions,
  formatDuplicatesSkippedMerged,
  identitiesMatch,
  identityFromCanonical,
  incomingNotes,
  incomingTags,
  normalizeNoteKey,
  normalizeTagKey,
  planImportBatch,
  type ImportDedupeSession,
} from "../src/lib/migration/dedupe";
import { resolveImportDecision } from "../src/lib/migration/match-existing";
import {
  normalizeAddressKey,
  normalizeOwnerName,
  normalizePhoneToE164,
  normalizePostal,
  normalizeStoredAddressLine,
  normalizeStoredState,
} from "../src/lib/migration/normalize";
import type { CanonicalImportRecord } from "../src/lib/migration/types";
import type { Database } from "../src/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const REIMPORT_CSV = `name,phone,property_address,city,state,zip,notes,tags
Jane Doe,(415) 555-2671,123 Main Street,Chicago,Illinois,60601,Called once,hot
Jane Doe,415-555-2671,123 Main St,Chicago,IL,60601-1234,Left voicemail,cash`;

describe("import normalization", () => {
  test("normalizes phones to E.164", () => {
    expect(normalizePhoneToE164("(415) 555-2671")).toBe("+14155552671");
    expect(normalizePhoneToE164("415.555.2671")).toBe("+14155552671");
    expect(normalizePhoneToE164("+1 415-555-2671")).toBe("+14155552671");
    expect(normalizePhoneToE164("not a phone")).toBeNull();
  });

  test("normalizes owner names and property addresses", () => {
    expect(normalizeOwnerName("  Jane  ", " Doe")).toBe("Jane Doe");
    expect(normalizeStoredAddressLine("123 Main Street")).toBe("123 Main St");
    expect(normalizeStoredAddressLine("123 Main St.")).toBe("123 Main St");
    expect(normalizeStoredState("Illinois")).toBe("IL");
    expect(normalizePostal("60601-1234")).toBe("60601");
    expect(
      normalizeAddressKey({
        addressLine1: "123 Main Street",
        city: "Chicago",
        state: "Illinois",
        postalCode: "60601-1234",
      }),
    ).toBe(
      normalizeAddressKey({
        addressLine1: "123 Main St",
        city: "chicago",
        state: "IL",
        postalCode: "60601",
      }),
    );
  });
});

describe("import dedupe", () => {
  test("re-importing the same CSV creates 0 new leads and reports the duplicate count", () => {
    const preview = previewMigrationCsv(REIMPORT_CSV, "generic");
    const records = buildRecordsFromCsv(
      REIMPORT_CSV,
      preview.suggestedMapping,
      preview.sourceCrm,
    );
    expect(records).toHaveLength(2);
    expect(formatDuplicatesSkippedMerged(preview.duplicateCount)).toBe(
      "1 duplicates skipped/merged",
    );

    const first = planImportBatch(records, []);
    expect(first.actions.map((action) => action.action)).toEqual([
      "create",
      "merge",
    ]);
    expect(identitiesMatch(
      identityFromCanonical(records[0]),
      identityFromCanonical(records[1]),
    )).toBe(true);

    const second = planImportBatch(records, first.leads);
    expect(second.actions.filter((action) => action.action === "create")).toHaveLength(0);
    expect(countDuplicateActions(second.actions)).toBe(records.length);
    expect(formatDuplicatesSkippedMerged(countDuplicateActions(second.actions))).toBe(
      "2 duplicates skipped/merged",
    );
  });

  test("same phone with a different address is not a duplicate", () => {
    const preview = previewMigrationCsv(REIMPORT_CSV, "generic");
    const [first] = buildRecordsFromCsv(
      REIMPORT_CSV,
      preview.suggestedMapping,
      preview.sourceCrm,
    );
    const other = identityFromCanonical({
      ...first,
      property: {
        ...first.property,
        addressLine1: "500 Market Street",
      },
    });
    expect(identitiesMatch(identityFromCanonical(first), other)).toBe(false);
  });

  test("database rematch uses smart_search_digits and get_related_leads", async () => {
    const record: CanonicalImportRecord = {
      contact: {
        firstName: "Jane",
        lastName: "Doe",
        email: "",
        phone: "(415) 555-2671",
        company: "",
        source: "CSV import",
      },
      lead: {
        title: "",
        value: "",
        pipelineStageName: "",
        tags: ["hot"],
        notes: "Called once",
      },
      property: {
        addressLine1: "123 Main Street",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
      },
    };
    const calls: string[] = [];
    const session: ImportDedupeSession = {
      seen: [
        {
          leadId: "11111111-1111-4111-8111-111111111111",
          contactId: "22222222-2222-4222-8222-222222222222",
          fromDatabase: true,
          identity: identityFromCanonical(record),
          tags: new Set(incomingTags(record).map(normalizeTagKey)),
          notes: new Set(incomingNotes(record).map(normalizeNoteKey)),
        },
      ],
      primed: true,
      digitCache: new Map(),
      expandedLeadIds: new Set(),
    };
    const supabase = {
      rpc: async (fn: string, args?: { p_value?: string }) => {
        calls.push(fn);
        if (fn === "smart_search_digits") {
          return {
            data: (args?.p_value ?? "").replace(/\D/g, ""),
            error: null,
          };
        }
        return { data: [], error: null };
      },
      from() {
        throw new Error("unexpected table query");
      },
    } as unknown as SupabaseClient<Database>;

    const decision = await resolveImportDecision(
      supabase,
      "33333333-3333-4333-8333-333333333333",
      record,
      session,
    );

    expect(decision.action).toBe("skip");
    expect(calls).toEqual(["smart_search_digits", "get_related_leads"]);
  });
});
