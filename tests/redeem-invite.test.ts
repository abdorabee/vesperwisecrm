import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

type InviteRow = {
  id: string;
  account_id: string;
  role: string;
  client_id: string | null;
  email: string;
  auth_token_hash: string | null;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
};

const rows: InviteRow[] = [];
const members: Array<Record<string, unknown>> = [];

function digest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function selectQuery(source: InviteRow[]) {
  const filters: Array<(row: InviteRow) => boolean> = [];
  let descending = false;
  let max = source.length;
  let single = false;
  const query = {
    eq(column: keyof InviteRow, value: unknown) {
      filters.push((row) => row[column] === value);
      return query;
    },
    is(column: keyof InviteRow, value: null) {
      filters.push((row) => row[column] === value);
      return query;
    },
    gt(column: keyof InviteRow, value: string) {
      filters.push((row) => String(row[column]) > value);
      return query;
    },
    ilike(column: keyof InviteRow, value: string) {
      const needle = value.replace(/\\/g, "").toLowerCase();
      filters.push((row) => String(row[column]).toLowerCase() === needle);
      return query;
    },
    order(column: keyof InviteRow, options?: { ascending?: boolean }) {
      descending = options?.ascending === false;
      filters.push(() => true);
      void column;
      return query;
    },
    limit(count: number) {
      max = count;
      return query;
    },
    maybeSingle() {
      single = true;
      return query;
    },
    then(
      onFulfilled: (value: { data: unknown; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      let matched = source.filter((row) => filters.every((keep) => keep(row)));
      if (descending) {
        matched = [...matched].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );
      }
      matched = matched.slice(0, max);
      const data = single ? (matched[0] ?? null) : matched;
      return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
    },
  };
  return query;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-1", email: "victim@example.com" } },
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      if (table === "account_members") {
        return {
          insert(row: Record<string, unknown>) {
            members.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table !== "invites") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() {
          return selectQuery(rows);
        },
        update(values: { redeemed_at: string }) {
          const filters: Array<(row: InviteRow) => boolean> = [];
          const query = {
            eq(column: keyof InviteRow, value: unknown) {
              filters.push((row) => row[column] === value);
              return query;
            },
            is(column: keyof InviteRow, value: null) {
              filters.push((row) => row[column] === value);
              return query;
            },
            then(
              onFulfilled: (value: { error: null }) => unknown,
              onRejected?: (reason: unknown) => unknown,
            ) {
              for (const row of rows) {
                if (filters.every((keep) => keep(row))) {
                  row.redeemed_at = values.redeemed_at;
                }
              }
              return Promise.resolve({ error: null }).then(onFulfilled, onRejected);
            },
          };
          return query;
        },
      };
    },
  }),
}));

import { redeemAcceptedInvite } from "@/lib/auth/redeem-invite";

const FUTURE = "2099-01-01T00:00:00.000Z";

describe("redeemAcceptedInvite", () => {
  beforeEach(() => {
    rows.splice(0, rows.length);
    members.splice(0, members.length);
    rows.push(
      {
        id: "older-invite",
        account_id: "legit-tenant",
        role: "member",
        client_id: null,
        email: "victim@example.com",
        auth_token_hash: digest("older-token"),
        redeemed_at: null,
        expires_at: FUTURE,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "newer-invite",
        account_id: "attacker-tenant",
        role: "client",
        client_id: "client-1",
        email: "victim@example.com",
        auth_token_hash: digest("newer-token"),
        redeemed_at: null,
        expires_at: FUTURE,
        created_at: "2026-10-01T00:00:00.000Z",
      },
    );
  });

  test("joins the invite that matches the verified token, not the newest row", async () => {
    await expect(redeemAcceptedInvite("older-token")).resolves.toBe(
      "legit-tenant",
    );

    expect(members).toEqual([
      {
        account_id: "legit-tenant",
        user_id: "user-1",
        role: "member",
        client_id: null,
      },
    ]);
    expect(rows.find((row) => row.id === "older-invite")?.redeemed_at).toEqual(
      expect.any(String),
    );
    expect(rows.find((row) => row.id === "newer-invite")?.redeemed_at).toBeNull();
  });

  test("does not join when the token matches no invite", async () => {
    await expect(redeemAcceptedInvite("unknown-token")).resolves.toBeNull();
    expect(members).toEqual([]);
  });
});

describe("invite issuance stores the token binding", () => {
  test("team and client invites persist the hash of the link token", () => {
    for (const path of ["src/lib/actions/team.ts", "src/lib/actions/clients.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("hashInviteAuthToken");
      expect(source).toContain("auth_token_hash");
    }
  });
});
