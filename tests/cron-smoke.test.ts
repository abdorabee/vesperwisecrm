// Live smoke test for both cron endpoints: confirms they're reachable,
// enforce auth, and return the expected response shape. Requires the dev
// server running at SMOKE_TEST_BASE_URL (defaults to localhost:3000).
import { describe, expect, test } from "vitest";

const APP_BASE_URL = process.env.SMOKE_TEST_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

describe.skipIf(!CRON_SECRET)("cron endpoints", () => {
  test("process-automation rejects requests without a valid secret", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/cron/process-automation`, {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
  });

  test("process-automation runs cleanly with the real secret", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/cron/process-automation`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("sequenceSteps");
    expect(body).toHaveProperty("noActivityWorkflows");
    expect(body).toHaveProperty("noNextActionWorkflows");
  });

  test("client-digest rejects requests without a valid secret", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/cron/client-digest`, {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
  });

  test("client-digest runs cleanly with the real secret", async () => {
    const res = await fetch(`${APP_BASE_URL}/api/cron/client-digest`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("sent");
    expect(body).toHaveProperty("skipped");
    expect(body).toHaveProperty("failed");
  });
});
