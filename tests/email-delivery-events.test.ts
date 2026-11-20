import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  processDeliveryEvent: vi.fn(),
  getResendClient: vi.fn(),
  logEmailEvent: vi.fn(),
  alertOnWebhookFailure: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/resend/client", () => ({
  getResendClient: mocks.getResendClient,
}));

vi.mock("@/lib/email/logger", () => ({
  logEmailEvent: mocks.logEmailEvent,
  alertOnWebhookFailure: mocks.alertOnWebhookFailure,
}));

vi.mock("@/lib/email/process-delivery", () => ({
  processDeliveryEvent: mocks.processDeliveryEvent,
}));

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "lead-1";
const EMAIL_ID = "email-1";

type QueryResult = { data: unknown; error: unknown };

function createServiceRoleMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];
  const defaults: Record<string, QueryResult> = {};

  function key(table: string, op: string) {
    return `${table}:${op}`;
  }

  function take(table: string, op: string): QueryResult {
    return defaults[key(table, op)] ?? { data: null, error: null };
  }

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "update" | "delete" = "select";

    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      update() {
        op = "update";
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      single: async () => take(table, op),
      maybeSingle: async () => take(table, op),
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    inserts,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("processDeliveryEvent", () => {
  let processDeliveryEvent: typeof import("@/lib/email/process-delivery").processDeliveryEvent;

  beforeEach(async () => {
    mocks.createServiceRoleClient.mockReset();
    mocks.logEmailEvent.mockReset();
    const actual = await vi.importActual<
      typeof import("@/lib/email/process-delivery")
    >("@/lib/email/process-delivery");
    processDeliveryEvent = actual.processDeliveryEvent;
  });

  test("skips when tags are missing and does not insert or throw", async () => {
    const supabase = createServiceRoleMock();
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(
      processDeliveryEvent({
        eventType: "bounced",
        data: { email_id: EMAIL_ID, to: ["a@example.com"] },
        rawPayload: { type: "email.bounced" },
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("skips when tags have no account_id", async () => {
    const supabase = createServiceRoleMock();
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(
      processDeliveryEvent({
        eventType: "failed",
        data: {
          email_id: EMAIL_ID,
          tags: { lead_id: LEAD_ID },
        },
        rawPayload: {},
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("inserts object tags with the first recipient and raw payload", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("email_delivery_events", "insert", {
      data: null,
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);
    const rawPayload = { type: "email.bounced", id: "evt-1" };

    await processDeliveryEvent({
      eventType: "bounced",
      data: {
        email_id: EMAIL_ID,
        to: ["first@example.com", "second@example.com"],
        tags: { account_id: ACCOUNT_ID, lead_id: LEAD_ID },
      },
      rawPayload,
    });

    expect(supabase.inserts).toEqual([
      {
        table: "email_delivery_events",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          resend_email_id: EMAIL_ID,
          event_type: "bounced",
          recipient: "first@example.com",
          payload: rawPayload,
        },
      },
    ]);
  });

  test("parses array tags the same way and uses a null recipient when to is empty", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("email_delivery_events", "insert", {
      data: null,
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);
    const rawPayload = { type: "email.complained" };

    await processDeliveryEvent({
      eventType: "complained",
      data: {
        email_id: EMAIL_ID,
        to: [],
        tags: [
          { name: "account_id", value: ACCOUNT_ID },
          { name: "lead_id", value: LEAD_ID },
        ],
      },
      rawPayload,
    });

    expect(supabase.inserts).toEqual([
      {
        table: "email_delivery_events",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          resend_email_id: EMAIL_ID,
          event_type: "complained",
          recipient: null,
          payload: rawPayload,
        },
      },
    ]);
  });

  test("throws the supabase insert error message", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("email_delivery_events", "insert", {
      data: null,
      error: { message: "insert failed" },
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(
      processDeliveryEvent({
        eventType: "failed",
        data: {
          email_id: EMAIL_ID,
          tags: { account_id: ACCOUNT_ID, lead_id: LEAD_ID },
        },
        rawPayload: {},
      }),
    ).rejects.toThrow("insert failed");
  });
});

describe("POST /api/webhooks/resend-events", () => {
  const originalSecret = process.env.RESEND_WEBHOOK_SECRET;
  const verify = vi.fn();

  beforeEach(() => {
    mocks.processDeliveryEvent.mockReset();
    mocks.getResendClient.mockReset();
    mocks.logEmailEvent.mockReset();
    mocks.alertOnWebhookFailure.mockReset();
    mocks.processDeliveryEvent.mockResolvedValue(undefined);
    mocks.alertOnWebhookFailure.mockResolvedValue(undefined);
    verify.mockReset();
    mocks.getResendClient.mockReturnValue({ webhooks: { verify } });
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.RESEND_WEBHOOK_SECRET;
    } else {
      process.env.RESEND_WEBHOOK_SECRET = originalSecret;
    }
  });

  async function post(
    body: string,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const { POST } = await import("@/app/api/webhooks/resend-events/route");
    return POST(
      new Request("http://localhost/api/webhooks/resend-events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body,
      }),
    );
  }

  test("returns 500 when the webhook secret is missing and does not verify", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const response = await post("{}");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook secret not configured",
    });
    expect(mocks.getResendClient).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(mocks.processDeliveryEvent).not.toHaveBeenCalled();
  });

  test("returns 401 when verify throws", async () => {
    verify.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const response = await post("{}", {
      "svix-id": "msg_1",
      "svix-timestamp": "1",
      "svix-signature": "v1,nope",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.processDeliveryEvent).not.toHaveBeenCalled();
  });

  test("returns 200 and skips processing for non-delivery event types", async () => {
    verify.mockReturnValue({
      type: "email.delivered",
      data: { email_id: EMAIL_ID },
    });

    const response = await post("{}");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.processDeliveryEvent).not.toHaveBeenCalled();
  });

  test("maps email.bounced to bounced and processes the event", async () => {
    const event = {
      type: "email.bounced",
      data: {
        email_id: EMAIL_ID,
        to: ["a@example.com"],
        tags: { account_id: ACCOUNT_ID, lead_id: LEAD_ID },
      },
    };
    verify.mockReturnValue(event);

    const response = await post(JSON.stringify(event));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.processDeliveryEvent).toHaveBeenCalledWith({
      eventType: "bounced",
      data: event.data,
      rawPayload: event,
    });
  });

  test("returns 500 when processDeliveryEvent throws", async () => {
    verify.mockReturnValue({
      type: "email.failed",
      data: { email_id: EMAIL_ID },
    });
    mocks.processDeliveryEvent.mockRejectedValue(new Error("db down"));

    const response = await post("{}");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Processing failed",
    });
  });
});
