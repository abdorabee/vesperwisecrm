// Contract tests for the 2026-07-25 security migrations. These assert the SQL
// text, not a live database -- the migrations are reviewed and applied by hand.
// They exist so a later edit cannot quietly drop a policy or widen a grant.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const assignedOnly = readFileSync(
  "supabase/migrations/20260725120000_extend_assigned_only_to_writes.sql",
  "utf8",
);
const phoneNumbers = readFileSync(
  "supabase/migrations/20260725120100_account_phone_numbers.sql",
  "utf8",
);
const rateLimits = readFileSync(
  "supabase/migrations/20260725120200_rate_limits.sql",
  "utf8",
);
const policyHardening = readFileSync(
  "supabase/migrations/20260725120300_policy_role_and_account_name_hardening.sql",
  "utf8",
);

describe("H-1: assigned_only extended to writes and sibling tables", () => {
  // Policies OR together, so replacing one means dropping the permissive
  // original by its exact name. A typo here silently restores the bypass.
  test.each([
    ["update own account leads", "leads"],
    ["delete own account leads", "leads"],
    ["select own account activities", "activities"],
    ["select own account contacts", "contacts"],
    ["update own account contacts", "contacts"],
    ["delete own account contacts", "contacts"],
    ["select own account lead_tags", "lead_tags"],
    ["select own account lead_properties", "lead_properties"],
  ])("replaces the permissive %s policy", (policy, table) => {
    expect(assignedOnly).toContain(
      `drop policy if exists "${policy}" on public.${table};`,
    );
    expect(assignedOnly).toContain(`create policy "${policy}" on public.${table}`);
  });

  test("every replacement policy is scoped to authenticated", () => {
    const created = assignedOnly.match(/create policy "[^"]+" on public\.\w+[^\n]*/g) ?? [];
    expect(created.length).toBeGreaterThan(0);
    for (const statement of created) {
      expect(statement).toContain("to authenticated");
    }
  });

  test("the access predicate honors owner, admin, and unrestricted members", () => {
    expect(assignedOnly).toContain("l.owner_user_id = (select auth.uid())");
    expect(assignedOnly).toContain("public.is_account_admin(l.account_id)");
    expect(assignedOnly).toContain("am.lead_visibility = 'assigned_only'");
  });

  test("helper functions are security definer with a pinned search_path", () => {
    for (const fn of ["can_access_lead", "has_assigned_only_visibility"]) {
      expect(assignedOnly).toContain(`create or replace function public.${fn}`);
      expect(assignedOnly).toContain(`revoke execute on function public.${fn}`);
    }
    const definerCount = (assignedOnly.match(/security definer/g) ?? []).length;
    const searchPathCount = (assignedOnly.match(/set search_path = public/g) ?? []).length;
    expect(searchPathCount).toBeGreaterThanOrEqual(definerCount);
  });

  test("orphan contacts stay readable so INSERT ... RETURNING still works", () => {
    // INSERT ... RETURNING is subject to the SELECT policy; excluding
    // lead-less contacts would break contact creation for restricted members.
    expect(assignedOnly).toContain("or not exists (");
    expect(assignedOnly).toContain("where l.contact_id = contacts.id");
  });
});

describe("H-2: account phone number mapping", () => {
  test("one live tenant per number", () => {
    expect(phoneNumbers).toContain("create unique index account_phone_numbers_live_unique");
    expect(phoneNumbers).toContain("where released_at is null");
  });

  test("stores normalized 10-digit values only", () => {
    expect(phoneNumbers).toContain("phone_digits ~ '^[0-9]{10}$'");
  });

  test("is RLS-protected, member-readable, and not client-writable", () => {
    // Nothing today verifies an account claiming phone_digits actually
    // controls that number in the shared Twilio account, so self-service
    // admin INSERT/UPDATE would let one tenant hijack or squat another
    // tenant's number. Provisioning must stay service-role-only until a real
    // ownership-verification flow exists.
    expect(phoneNumbers).toContain(
      "alter table public.account_phone_numbers enable row level security",
    );
    expect(phoneNumbers).toContain("members select own account phone numbers");
    expect(phoneNumbers).toContain("public.is_account_member(account_id)");
    expect(phoneNumbers).toContain("grant select on public.account_phone_numbers to authenticated");
    for (const verb of ["insert", "update", "delete"]) {
      expect(phoneNumbers).not.toContain(`admins ${verb} own account phone numbers`);
    }
  });
});

describe("H-4: rate limiting", () => {
  test("the counter table is not reachable by clients", () => {
    expect(rateLimits).toContain("alter table public.rate_limits enable row level security");
    expect(rateLimits).toContain("revoke all on public.rate_limits from public, anon, authenticated");
  });

  test("only the service role may consume budget", () => {
    expect(rateLimits).toContain(
      "revoke execute on function public.consume_rate_limit(text, integer, integer)\n  from public, anon, authenticated",
    );
    expect(rateLimits).toContain("to service_role");
  });

  test("increments atomically so concurrent callers cannot both pass", () => {
    expect(rateLimits).toContain("on conflict (bucket_key, window_started_at)");
    expect(rateLimits).toContain("request_count = public.rate_limits.request_count + 1");
    expect(rateLimits).toContain("return v_count <= p_limit");
  });

  test("rejects nonsensical configuration", () => {
    expect(rateLimits).toContain("if p_limit < 1 or p_window_seconds < 1 then");
  });
});

describe("L-3 / H-3: policy roles and account name", () => {
  test("moves the two missed account_members policies off PUBLIC", () => {
    for (const policy of [
      "select own membership row",
      "update own onboarding tour flag",
    ]) {
      expect(policyHardening).toContain(
        `alter policy "${policy}" on public.account_members to authenticated;`,
      );
    }
  });

  test("strips markup characters from account names on every write path", () => {
    expect(policyHardening).toContain("regexp_replace(coalesce(p_name, ''), '[<>{}\\r\\n]', '', 'g')");
    expect(policyHardening).toContain("before insert or update of name on public.accounts");
  });

  test("bounds account name length", () => {
    expect(policyHardening).toContain("char_length(name) between 1 and 120");
  });
});
