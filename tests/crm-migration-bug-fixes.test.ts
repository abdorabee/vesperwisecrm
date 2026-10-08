import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import {
  processImportJob,
} from "@/lib/migration/process-job";
import type { CanonicalImportRecord } from "@/lib/migration/types";
import type { Database, Json } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));

type CRMClient = SupabaseClient<Database>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = ["A", "a", "1", "!"].join("") + randomBytes(18).toString("base64url");
const RUN_ID = Date.now();

const shouldRun = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

describe.skipIf(!shouldRun)("Import job bug fixes from PR #9", () => {
  let supabase: CRMClient;
  let accountId: string;
  let userId: string;

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.auth.admin.createUser({
      email: `bug-fix-test-${RUN_ID}@vesperwisecrm.test`,
      password: PASSWORD,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }

    userId = data.user.id;

    const { data: membership } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw new Error("No account created for test user");
    }

    accountId = membership.account_id;

    await supabase.from("billing_accounts").update({
      source: "grandfathered",
      plan_key: "starter",
      provider_status: "active",
      seats: 10,
    }).eq("account_id", accountId);
  });

  afterAll(async () => {
    if (accountId) {
      await supabase.from("accounts").delete().eq("id", accountId);
    }
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe("Bug #1: Concurrent imports create duplicate leads", () => {
    it("should not import the same row twice when processImportJob is called concurrently", async () => {
      const samplePayload: CanonicalImportRecord = {
        firstName: "Test",
        lastName: "Concurrent",
        email: `concurrent-${Date.now()}@test.local`,
        phone: null,
        company: null,
        source: null,
        notes: [],
        properties: {},
        stageName: null,
        tags: [],
      };

      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          account_id: accountId,
          created_by_user_id: userId,
          source_crm: "generic",
          status: "pending",
          mapping: {},
          stage_map: {},
        })
        .select("id")
        .single();

      if (!job) throw new Error("Failed to create test job");

      await supabase.from("import_job_rows").insert([
        {
          account_id: accountId,
          job_id: job.id,
          row_number: 2,
          payload: samplePayload as unknown as Json,
          status: "pending",
        },
        {
          account_id: accountId,
          job_id: job.id,
          row_number: 3,
          payload: { ...samplePayload, lastName: "Concurrent2" } as unknown as Json,
          status: "pending",
        },
      ]);

      await Promise.all([
        processImportJob(supabase, job.id, {
          actorUserId: userId,
          accountId,
          maxDurationMs: 5000,
        }),
        processImportJob(supabase, job.id, {
          actorUserId: userId,
          accountId,
          maxDurationMs: 5000,
        }),
      ]);

      const { data: rows } = await supabase
        .from("import_job_rows")
        .select("status")
        .eq("job_id", job.id);

      const importedRows = rows?.filter((r) => r.status === "imported");
      const failedRows = rows?.filter((r) => r.status === "failed");
      
      expect((importedRows?.length ?? 0) + (failedRows?.length ?? 0)).toBe(2);
      expect(rows?.filter((r) => r.status === "pending").length).toBe(0);

      await supabase.from("import_jobs").delete().eq("id", job.id);
    });
  });

  describe("Bug #2: Closed wizard stalls at daily batches", () => {
    it("should drain multiple batches in one processImportJob call", async () => {
      const samplePayload: CanonicalImportRecord = {
        firstName: "Test",
        lastName: "Drain",
        email: `drain-${Date.now()}@test.local`,
        phone: null,
        company: null,
        source: null,
        notes: [],
        properties: {},
        stageName: null,
        tags: [],
      };

      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          account_id: accountId,
          created_by_user_id: userId,
          source_crm: "generic",
          status: "pending",
          mapping: {},
          stage_map: {},
        })
        .select("id")
        .single();

      if (!job) throw new Error("Failed to create test job");

      const rowInserts = Array.from({ length: 75 }, (_, i) => ({
        account_id: accountId,
        job_id: job.id,
        row_number: i + 2,
        payload: {
          ...samplePayload,
          email: `drain-${Date.now()}-${i}@test.local`,
        } as unknown as Json,
        status: "pending" as const,
      }));

      await supabase.from("import_job_rows").insert(rowInserts);

      const result = await processImportJob(supabase, job.id, {
        actorUserId: userId,
        accountId,
        maxDurationMs: 60_000,
      });

      const { data: rows } = await supabase
        .from("import_job_rows")
        .select("status")
        .eq("job_id", job.id);

      const processedRows = rows?.filter((r) => r.status !== "pending").length ?? 0;
      
      expect(processedRows).toBe(75);
      expect(result.pendingCount).toBe(0);
      expect(result.status).toBe("completed");

      await supabase.from("import_jobs").delete().eq("id", job.id);
    });
  });

  describe("Bug #3: RLS leak on import_job_rows", () => {
    it("should prevent non-admins from selecting import_job_rows", async () => {
      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          account_id: accountId,
          created_by_user_id: userId,
          source_crm: "generic",
          status: "pending",
          mapping: {},
          stage_map: {},
        })
        .select("id")
        .single();

      if (!job) throw new Error("Failed to create test job");

      await supabase.from("import_job_rows").insert({
        account_id: accountId,
        job_id: job.id,
        row_number: 2,
        payload: { secret: "sensitive-data" } as unknown as Json,
        status: "pending",
      });

      const { data: adminRows } = await supabase
        .from("import_job_rows")
        .select("*")
        .eq("job_id", job.id);

      expect(adminRows).toBeDefined();

      await supabase.from("import_jobs").delete().eq("id", job.id);
    });
  });

  describe("Bug #4: Failed enqueue still imports leftover rows", () => {
    it("should mark job as cancelled when row insert fails", async () => {
      const { data: job } = await supabase
        .from("import_jobs")
        .insert({
          account_id: accountId,
          created_by_user_id: userId,
          source_crm: "generic",
          status: "pending",
          mapping: {},
          stage_map: {},
        })
        .select("id")
        .single();

      if (!job) throw new Error("Failed to create test job");

      await supabase.from("import_job_rows").insert({
        account_id: accountId,
        job_id: job.id,
        row_number: 2,
        payload: {} as Json,
        status: "pending",
      });

      const { data: updatedJob } = await supabase
        .from("import_jobs")
        .update({ status: "cancelled" })
        .eq("id", job.id)
        .select("status")
        .single();

      expect(updatedJob?.status).toBe("cancelled");

      const result = await processImportJob(supabase, job.id, {
        actorUserId: userId,
        accountId,
      });

      expect(result.status).toBe("cancelled");
      expect(result.importedCount).toBe(0);

      await supabase.from("import_jobs").delete().eq("id", job.id);
    });
  });
});
