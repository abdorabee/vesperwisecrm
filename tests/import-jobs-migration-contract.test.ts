import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migrationName = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_import_jobs.sql"),
);

describe("import jobs migration", () => {
  test("exists as a generated Supabase migration", () => {
    expect(migrationName).toBeTruthy();
    expect(existsSync(`supabase/migrations/${migrationName}`)).toBe(true);
  });

  test("creates tenant-scoped job and row tables with status checks", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("create table public.import_jobs");
    expect(sql).toContain("create table public.import_job_rows");
    expect(sql).toContain("check (status in ('pending', 'processing', 'completed', 'failed'))");
    expect(sql).toContain("check (status in ('pending', 'imported', 'failed'))");
    expect(sql).toContain("'follow_up_boss'");
    expect(sql).toContain("references public.accounts(id) on delete cascade");
  });

  test("restricts writes to account admins and scoped to authenticated", () => {
    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8");
    expect(sql).toContain("alter table public.import_jobs enable row level security");
    expect(sql).toContain("alter table public.import_job_rows enable row level security");
    expect(sql).toContain("using (public.is_account_member(account_id))");
    expect(sql).toContain("with check (public.is_account_admin(account_id))");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("revoke all on public.import_jobs from anon, authenticated");
    expect(sql).toContain("grant select, insert, update on public.import_jobs to authenticated");
  });
});
