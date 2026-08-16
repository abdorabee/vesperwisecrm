import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260816163347_polar_billing.sql",
  "utf8",
);

describe("Polar billing migration contract", () => {
  it("creates account billing, webhook event, and usage tables", () => {
    expect(migration).toContain("create table public.billing_accounts");
    expect(migration).toContain("create table public.billing_webhook_events");
    expect(migration).toContain("create table public.billing_usage_periods");
    expect(migration).toContain("unique (polar_subscription_id)");
    expect(migration).toContain("primary key (account_id, period_start)");
  });

  it("protects billing data with tenant RLS and service-only webhook writes", () => {
    expect(migration).toContain("alter table public.billing_accounts enable row level security");
    expect(migration).toContain("alter table public.billing_webhook_events enable row level security");
    expect(migration).toContain("using (public.is_account_member(account_id))");
    expect(migration).toContain("revoke all on public.billing_webhook_events from anon, authenticated");
  });

  it("backfills existing accounts as grandfathered Starter workspaces", () => {
    expect(migration).toContain("'grandfathered', 'starter', 'active'");
    expect(migration).toContain("on conflict (account_id) do nothing");
    expect(migration).toContain("create trigger create_billing_account");
  });

  it("adds a database-side atomic lead quota guard", () => {
    expect(migration).toContain("create or replace function billing_private.enforce_lead_quota");
    expect(migration).toContain("leads_created = leads_created + 1");
    expect(migration).toContain("raise exception 'Starter lead quota exceeded'");
    expect(migration).toContain("create trigger enforce_billing_lead_quota");
    expect(migration).toContain("Billing is read-only until the subscription is restored");
    expect(migration).toContain("past_due_since + interval '7 days'");
    expect(migration).toContain("billing_private.is_writable_account");
    expect(migration).toContain("as restrictive for insert to authenticated");
    expect(migration).toContain("as restrictive for update to authenticated");
    expect(migration).toContain("create trigger enforce_billing_invite_capacity");
    expect(migration).toContain("Workspace seat capacity exceeded");
  });
});
