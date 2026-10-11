import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));

const scoreLead = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/score-lead", () => ({
  scoreLead,
}));

import { scoreAndStoreLead } from "@/lib/ai/score-lead-record";

function scoringClient(lead: Record<string, unknown> = {}) {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];

  function chain(table: string) {
    let updating = false;
    const api = {
      select: () => api,
      update: (payload: unknown) => {
        updating = true;
        updates.push(payload);
        return api;
      },
      insert: (payload: unknown) => {
        inserts.push({ table, payload });
        return api;
      },
      eq: () => api,
      is: () => api,
      order: () => api,
      limit: () => api,
      single: async () => {
        if (table === "leads" && !updating) {
          return {
            data: {
              id: "lead-1",
              title: "123 Main",
              qualification_status: "qualified",
              value: "250000",
              created_at: "2026-10-01T12:00:00.000Z",
              motivation_score: null,
              ...lead,
              property: {
                id: "prop-1",
                account_id: "acct-1",
                lead_id: "lead-1",
                motivation: "Relocating",
              },
            },
            error: null,
          };
        }
        return { data: null, error: { message: "missing" } };
      },
      then: (
        onFulfilled?: (value: { data: { type: string; created_at: string }[]; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: updating
            ? []
            : [{ type: "lead_created", created_at: "2026-10-01T12:00:00.000Z" }],
          error: null,
        }).then(onFulfilled, onRejected),
    };
    return api;
  }

  return {
    updates,
    inserts,
    client: {
      from: (table: string) => chain(table),
    } as unknown as SupabaseClient<Database>,
  };
}

describe("scoreAndStoreLead", () => {
  beforeEach(() => {
    scoreLead.mockReset();
  });

  test("stores the model score on the lead", async () => {
    scoreLead.mockResolvedValue({
      score: 81,
      motivationScore: 92,
      summary: "Motivated seller",
      positives: ["Relocating"],
      risks: [],
    });
    const { client, updates, inserts } = scoringClient();

    await expect(scoreAndStoreLead(client, "acct-1", "lead-1", "user-1")).resolves.toMatchObject({
      score: 81,
      motivationScore: 92,
    });

    expect(scoreLead).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "123 Main",
        qualificationStatus: "qualified",
        value: 250000,
        property: expect.objectContaining({ motivation: "Relocating" }),
        activityCounts: { lead_created: 1 },
      }),
    );
    expect(scoreLead.mock.calls[0][0].property).not.toHaveProperty("account_id");
    expect(updates[0]).toMatchObject({
      ai_score: 81,
      motivation_score: 92,
      ai_score_factors: {
        summary: "Motivated seller",
        positives: ["Relocating"],
        risks: [],
      },
    });
    expect(inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: "acct-1",
          lead_id: "lead-1",
          type: "score_changed",
          actor_user_id: "user-1",
          payload: {
            field: "motivation_score",
            from: null,
            to: 92,
            message: "Score changed",
          },
        },
      },
    ]);
  });

  test("does not log a score change when motivation stays the same", async () => {
    scoreLead.mockResolvedValue({
      score: 40,
      motivationScore: 92,
      summary: "Same motivation",
      positives: [],
      risks: [],
    });
    const { client, inserts } = scoringClient({ motivation_score: 92 });

    await scoreAndStoreLead(client, "acct-1", "lead-1");

    expect(inserts).toEqual([]);
  });
});
