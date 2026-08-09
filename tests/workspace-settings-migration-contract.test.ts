import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migrationName = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_workspace_settings.sql"),
);

describe("workspace settings migration", () => {
  test("exists as a generated Supabase migration", () => {
    expect(migrationName).toBeTruthy();
    expect(existsSync(`supabase/migrations/${migrationName}`)).toBe(true);
  });

  test("adds constrained, backwards-compatible settings columns", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("currency_code text not null default 'USD'");
    expect(sql).toContain("timezone text null");
    expect(sql).toContain("date_format text not null default 'system'");
    expect(sql).toContain("time_format text not null default 'system'");
    expect(sql).toContain("updated_at timestamptz not null default now()");
    expect(sql).toContain("currency_code ~ '^[A-Z]{3}$'");
    expect(sql).toContain("date_format in ('system', 'month_day_year', 'day_month_year', 'iso')");
    expect(sql).toContain("time_format in ('system', '12h', '24h')");
  });

  test("restricts updates to account admins and approved columns", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("for update to authenticated");
    expect(sql).toContain("using (public.is_account_admin(id))");
    expect(sql).toContain("with check (public.is_account_admin(id))");
    expect(sql).toContain("revoke update on table public.accounts from authenticated");
    expect(sql).toContain("grant update (name, timezone, currency_code, date_format, time_format)");
  });
});
