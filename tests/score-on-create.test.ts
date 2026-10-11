import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));

const scoreAndStoreLead = vi.hoisted(() => vi.fn());
const consumeRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/score-lead-record", () => ({
  scoreAndStoreLead,
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit,
}));

import {
  billingAllowsAi,
  rescoreLeadQuietly,
  scoreNewLeadIfConfigured,
} from "@/lib/ai/score-on-create";

const NOW = new Date("2026-10-11T12:00:00.000Z");

function billingClient(row: Record<string, unknown> | null) {
  const calls: string[] = [];
  const api = {
    select: () => api,
    eq: () => api,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push(table);
        return api;
      },
    } as unknown as SupabaseClient<Database>,
  };
}

const teamTrial = {
  source: "trial",
  plan_key: "team",
  provider_status: "trialing",
  cancel_at_period_end: false,
  current_period_end: null,
  past_due_since: null,
  trial_end: "2026-12-10T12:00:00.000Z",
};

describe("billing allows AI", () => {
  test("allows an active Team trial", () => {
    expect(billingAllowsAi(teamTrial, NOW)).toBe(true);
  });

  test("skips Starter and an expired trial", () => {
    expect(
      billingAllowsAi(
        { ...teamTrial, source: "grandfathered", plan_key: "starter", provider_status: "active" },
        NOW,
      ),
    ).toBe(false);
    expect(
      billingAllowsAi({ ...teamTrial, trial_end: "2026-10-01T12:00:00.000Z" }, NOW),
    ).toBe(false);
    expect(billingAllowsAi(null, NOW)).toBe(false);
  });
});

describe("score on lead create", () => {
  beforeEach(() => {
    scoreAndStoreLead.mockReset();
    consumeRateLimit.mockReset();
    consumeRateLimit.mockResolvedValue(true);
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("skips scoring when ANTHROPIC_API_KEY is missing", async () => {
    const { client, calls } = billingClient(teamTrial);

    await expect(
      scoreNewLeadIfConfigured(client, {
        accountId: "acct-1",
        leadId: "lead-1",
        actorUserId: "user-1",
      }),
    ).resolves.toBe("skipped");

    expect(calls).toEqual([]);
    expect(scoreAndStoreLead).not.toHaveBeenCalled();
  });

  test("skips scoring when the plan does not include AI", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { client } = billingClient({
      ...teamTrial,
      source: "grandfathered",
      plan_key: "starter",
      provider_status: "active",
    });

    await expect(
      scoreNewLeadIfConfigured(client, {
        accountId: "acct-1",
        leadId: "lead-1",
      }),
    ).resolves.toBe("skipped");

    expect(scoreAndStoreLead).not.toHaveBeenCalled();
  });

  test("requests a score for a Team lead when the key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    scoreAndStoreLead.mockResolvedValue({
      score: 64,
      summary: "Warm",
      positives: [],
      risks: [],
    });
    const { client } = billingClient(teamTrial);

    await expect(
      scoreNewLeadIfConfigured(client, {
        accountId: "acct-1",
        leadId: "lead-1",
        actorUserId: "user-1",
      }),
    ).resolves.toBe("scored");

    expect(scoreAndStoreLead).toHaveBeenCalledWith(
      client,
      "acct-1",
      "lead-1",
      "user-1",
    );
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "ai-score-lead",
        identifier: "user-1",
      }),
    );
  });

  test("does not throw when scoring fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    scoreAndStoreLead.mockRejectedValue(new Error("AI scoring returned an unexpected shape"));
    const { client } = billingClient(teamTrial);
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };

    try {
      await expect(
        scoreNewLeadIfConfigured(client, {
          accountId: "acct-1",
          leadId: "lead-1",
          actorUserId: "user-1",
        }),
      ).resolves.toBe("skipped");
    } finally {
      console.error = original;
    }

    expect(errors).toHaveLength(1);
  });
});

describe("rescore after a lead signal", () => {
  beforeEach(() => {
    scoreAndStoreLead.mockReset();
    consumeRateLimit.mockReset();
    consumeRateLimit.mockResolvedValue(true);
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("does not call the model or throw when ANTHROPIC_API_KEY is missing", async () => {
    const { client, calls } = billingClient(teamTrial);

    await expect(
      rescoreLeadQuietly(client, {
        accountId: "acct-1",
        leadId: "lead-1",
        actorUserId: "user-1",
        reason: "note",
      }),
    ).resolves.toBeUndefined();

    expect(calls).toEqual([]);
    expect(scoreAndStoreLead).not.toHaveBeenCalled();
  });

  test("does not throw when a note rescore fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    scoreAndStoreLead.mockRejectedValue(new Error("provider down"));
    const { client } = billingClient(teamTrial);

    await expect(
      rescoreLeadQuietly(client, {
        accountId: "acct-1",
        leadId: "lead-1",
        reason: "disposition",
      }),
    ).resolves.toBeUndefined();
  });
});
