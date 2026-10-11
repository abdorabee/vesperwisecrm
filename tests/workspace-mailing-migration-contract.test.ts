import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migrationName = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_workspace_mailing_address.sql"),
);

describe("workspace mailing address migration", () => {
  test("exists as a generated Supabase migration", () => {
    expect(migrationName).toBeTruthy();
    expect(existsSync(`supabase/migrations/${migrationName}`)).toBe(true);
  });

  test("adds nullable company name and postal address columns", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("add column if not exists company_name text");
    expect(sql).toContain("add column if not exists postal_address text");
    expect(sql).not.toMatch(/company_name text not null default/i);
    expect(sql).not.toMatch(/postal_address text not null default/i);
    expect(sql).toContain("accounts_company_name_length");
    expect(sql).toContain("accounts_postal_address_length");
  });

  test("lets admins update the new columns and refreshes updated_at", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("grant update (company_name, postal_address)");
    expect(sql).toContain("on table public.accounts to authenticated");
    expect(sql).toContain(
      "before update of name, timezone, currency_code, date_format, time_format, company_name, postal_address",
    );
  });
});
