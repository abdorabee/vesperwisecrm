import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));

const scoreNewLeadIfConfigured = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/score-on-create", () => ({
  scoreNewLeadIfConfigured,
}));

import { createLeadRecord } from "@/lib/leads/create-lead";

function createSupabase() {
  function chain(table: string) {
    const api = {
      select: () => api,
      insert: () => api,
      update: () => api,
      eq: () => api,
      ilike: () => api,
      is: () => api,
      order: () => api,
      limit: () => api,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => {
        if (table === "pipeline_stages") return { data: { id: "stage-1" }, error: null };
        if (table === "contacts") return { data: { id: "contact-1" }, error: null };
        if (table === "leads") return { data: { id: "lead-1" }, error: null };
        return { data: null, error: { message: `unexpected ${table}` } };
      },
      then: (
        onFulfilled?: (value: { data: null; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected),
    };
    return api;
  }

  return {
    from: (table: string) => chain(table),
  } as unknown as SupabaseClient<Database>;
}

describe("createLeadRecord scoring", () => {
  beforeEach(() => {
    scoreNewLeadIfConfigured.mockReset();
    scoreNewLeadIfConfigured.mockResolvedValue("skipped");
  });

  test("requests an AI score after the lead exists", async () => {
    const supabase = createSupabase();

    await expect(
      createLeadRecord(supabase, {
        accountId: "acct-1",
        title: "Pine street",
        firstName: "Ada",
        actorUserId: "user-1",
      }),
    ).resolves.toEqual({ leadId: "lead-1", contactId: "contact-1" });

    expect(scoreNewLeadIfConfigured).toHaveBeenCalledWith(supabase, {
      accountId: "acct-1",
      leadId: "lead-1",
      actorUserId: "user-1",
    });
  });

  test("still creates the lead when scoring throws", async () => {
    scoreNewLeadIfConfigured.mockRejectedValue(new Error("network down"));
    const supabase = createSupabase();

    await expect(
      createLeadRecord(supabase, {
        accountId: "acct-1",
        title: "Pine street",
        firstName: "Ada",
        actorUserId: "user-1",
      }),
    ).resolves.toEqual({ leadId: "lead-1", contactId: "contact-1" });
  });
});
