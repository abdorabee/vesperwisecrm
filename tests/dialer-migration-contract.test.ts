import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260722022022_production_dialer.sql",
  "utf8",
);

describe("dialer migration security and reliability contract", () => {
  test("creates the required lifecycle tables", () => {
    for (const table of ["dialer_settings", "call_dispositions", "dialer_queues", "dialer_queue_items", "calls", "call_attempts", "call_events"]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  test("deduplicates provider events and protects terminal state", () => {
    expect(migration).toContain("call_events_provider_key_unique");
    expect(migration).toContain("if not found then\n    return 'duplicate'");
    expect(migration).toContain("if v_was_terminal or p_provider_sequence <= v_attempt.last_provider_sequence");
  });

  test("excludes portal clients and limits privileged RPC execution", () => {
    expect(migration).toContain("am.role <> 'client'");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke execute on function public.process_dialer_provider_event");
  });

  test("enforces one active call per user and publishes only live dialer tables", () => {
    expect(migration).toContain("call_attempts_one_active_per_user");
    expect(migration).toContain("alter publication supabase_realtime add table public.calls");
    expect(migration).toContain("alter publication supabase_realtime add table public.call_attempts");
    expect(migration).toContain("alter publication supabase_realtime add table public.dialer_queue_items");
  });
});
