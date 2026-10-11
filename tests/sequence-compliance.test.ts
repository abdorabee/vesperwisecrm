import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildComplianceFooter } from "../src/lib/email/compliance-footer";
import { formatComplianceFooter } from "../src/lib/email/compliance-footer-text";
import { stopActiveSequenceEnrollments } from "../src/lib/sequences/stop-on-reply";
import type { Database } from "../src/lib/supabase/types";

vi.mock("server-only", () => ({}));

const unsubscribeUrl = "https://example.com/api/unsubscribe?token=abc";

describe("sequence compliance footer", () => {
  test("includes the company name, postal address, and unsubscribe link", () => {
    expect(
      formatComplianceFooter({
        unsubscribeUrl,
        companyName: "Northwind Holdings",
        postalAddress: "1 Harbor Lane\nPortland, OR 97201",
      }),
    ).toBe(
      [
        "",
        "---",
        "Northwind Holdings",
        "1 Harbor Lane\nPortland, OR 97201",
        "You're receiving this because you were added as a contact.",
        `Unsubscribe: ${unsubscribeUrl}`,
      ].join("\n"),
    );
  });

  test("keeps the unsubscribe link and omits a street when the workspace address is empty", () => {
    const footer = formatComplianceFooter({
      unsubscribeUrl,
      companyName: "   ",
      postalAddress: null,
    });

    expect(footer).toContain(`Unsubscribe: ${unsubscribeUrl}`);
    expect(footer).not.toContain("Northwind");
    expect(footer).not.toMatch(/\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/i);
  });

  test("builds a signed unsubscribe link around the workspace address", () => {
    process.env.UNSUBSCRIBE_SECRET = "test-unsubscribe-secret";
    const footer = buildComplianceFooter({
      contactId: "contact-1",
      accountId: "account-1",
      companyName: "Northwind Holdings",
      postalAddress: "1 Harbor Lane",
    });

    expect(footer).toContain("Northwind Holdings");
    expect(footer).toContain("1 Harbor Lane");
    expect(footer).toContain("/api/unsubscribe?token=");
  });
});

describe("stop sequence on reply", () => {
  test("cancels the lead's active enrollments", async () => {
    const filters: Array<[string, string]> = [];
    let payload: Record<string, unknown> | null = null;
    const query = {
      update(values: Record<string, unknown>) {
        payload = values;
        return query;
      },
      eq(column: string, value: string) {
        filters.push([column, value]);
        return query;
      },
      then(
        resolve: (value: { error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    const supabase = {
      from(table: string) {
        expect(table).toBe("lead_sequence_enrollments");
        return query;
      },
    } as unknown as SupabaseClient<Database>;

    await stopActiveSequenceEnrollments(supabase, {
      accountId: "account-1",
      leadId: "lead-1",
    });

    expect(payload).toMatchObject({
      status: "cancelled",
      next_step_due_at: null,
    });
    expect(String((payload as { completed_at?: string } | null)?.completed_at)).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    expect(filters).toEqual([
      ["account_id", "account-1"],
      ["lead_id", "lead-1"],
      ["status", "active"],
    ]);
  });
});

describe("sequence compliance wiring", () => {
  test("seller sequences always attach the footer and replies stop enrollments", () => {
    const sendStep = readFileSync("src/lib/sequences/send-step.ts", "utf8");
    const inbound = readFileSync("src/lib/email/process-inbound.ts", "utf8");
    const sequencesPage = readFileSync("src/app/(dashboard)/sequences/page.tsx", "utf8");
    const sequenceForm = readFileSync(
      "src/app/(dashboard)/sequences/_components/sequence-form.tsx",
      "utf8",
    );

    expect(sendStep).toContain("includeComplianceFooter: true");
    expect(inbound).toContain("stopActiveSequenceEnrollments");
    expect(sequencesPage).toContain("Sequences are for opted-in and inbound sellers.");
    expect(sequenceForm).toContain("Sequences are for opted-in and inbound sellers.");
  });
});
