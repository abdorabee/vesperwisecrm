import { beforeEach, describe, expect, test, vi } from "vitest";

import { mintIntakeToken } from "@/lib/leads/intake-token";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  clientAddress: vi.fn(() => "203.0.113.9"),
  createServiceRoleClient: vi.fn(),
  createLeadRecord: vi.fn(),
  runTriggeredWorkflows: vi.fn(),
  isAiConfigured: vi.fn(() => false),
  parseCallNotes: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  clientAddress: mocks.clientAddress,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/leads/create-lead", () => ({
  createLeadRecord: mocks.createLeadRecord,
}));

vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));

vi.mock("@/lib/ai/client", () => ({
  isAiConfigured: mocks.isAiConfigured,
}));

vi.mock("@/lib/ai/parse-call-notes", () => ({
  parseCallNotes: mocks.parseCallNotes,
}));

const { POST } = await import("@/app/api/leads/intake/route");

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const VALID_BODY = {
  title: "123 Main St",
  firstName: "Jane",
  accountId: ACCOUNT_ID,
};
const CALL_SUMMARY = "Seller wants to close in 30 days.";
const CALL_SUMMARY_BODY = {
  ...VALID_BODY,
  callSummary: CALL_SUMMARY,
};

let ipAllowed = true;
let tokenAllowed = true;
let intakeSource: {
  name: string;
  account_id: string;
  revoked_at: string | null;
} | null;
let accountRow: { id: string } | null;
let existingProperty: Record<string, unknown> | null;
let serviceInserts: Array<{ table: string; payload: unknown }>;
let serviceUpdates: Array<{
  table: string;
  payload: unknown;
  eqs: Array<[string, unknown]>;
}>;

type QueryResult = { data: unknown; error: unknown };

function createServiceRoleMock() {
  serviceInserts = [];
  serviceUpdates = [];

  return {
    from(table: string) {
      const eqs: Array<[string, unknown]> = [];
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          eqs.push([column, value]);
          return builder;
        },
        insert(payload: unknown) {
          serviceInserts.push({ table, payload });
          return builder;
        },
        update(payload: unknown) {
          serviceUpdates.push({ table, payload, eqs });
          return builder;
        },
        maybeSingle: async (): Promise<QueryResult> => {
          if (table === "lead_intake_sources") {
            return { data: intakeSource, error: null };
          }
          if (table === "accounts") {
            return { data: accountRow, error: null };
          }
          if (table === "lead_properties") {
            return { data: existingProperty, error: null };
          }
          return { data: null, error: null };
        },
        then(
          onFulfilled: (value: QueryResult) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve({ data: null, error: null }).then(
            onFulfilled,
            onRejected,
          );
        },
      };
      return builder;
    },
  };
}

function intakeRequest(options?: {
  authorization?: string | null;
  body?: unknown;
  rawBody?: string;
}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (options?.authorization) {
    headers.set("authorization", options.authorization);
  }

  let body: string;
  if (options?.rawBody !== undefined) {
    body = options.rawBody;
  } else if (options?.body !== undefined) {
    body = JSON.stringify(options.body);
  } else {
    body = JSON.stringify(VALID_BODY);
  }

  return new Request("http://127.0.0.1/api/leads/intake", {
    method: "POST",
    headers,
    body,
  });
}

function authorizedRequest(body?: unknown): Request {
  return intakeRequest({
    authorization: `Bearer ${mintIntakeToken()}`,
    body: body ?? VALID_BODY,
  });
}

describe("POST /api/leads/intake", () => {
  beforeEach(() => {
    ipAllowed = true;
    tokenAllowed = true;
    intakeSource = {
      name: "Dialer Partner",
      account_id: ACCOUNT_ID,
      revoked_at: null,
    };
    accountRow = { id: ACCOUNT_ID };
    existingProperty = null;

    mocks.consumeRateLimit.mockReset();
    mocks.clientAddress.mockReset();
    mocks.clientAddress.mockReturnValue("203.0.113.9");
    mocks.createServiceRoleClient.mockReset();
    mocks.createLeadRecord.mockReset();
    mocks.runTriggeredWorkflows.mockReset();
    mocks.isAiConfigured.mockReset();
    mocks.isAiConfigured.mockReturnValue(false);
    mocks.parseCallNotes.mockReset();

    mocks.consumeRateLimit.mockImplementation(
      async ({ scope }: { scope: string }) => {
        if (scope === "leads-intake") return ipAllowed;
        if (scope === "leads-intake-token") return tokenAllowed;
        return true;
      },
    );

    mocks.createLeadRecord.mockResolvedValue({
      leadId: "lead-1",
      contactId: "contact-1",
    });
    mocks.runTriggeredWorkflows.mockResolvedValue(undefined);

    mocks.createServiceRoleClient.mockReturnValue(createServiceRoleMock());
  });

  test("returns 429 when the IP limiter is exhausted", async () => {
    ipAllowed = false;

    const response = await POST(intakeRequest());
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json).toEqual({ error: "Too many requests" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  test("returns 401 without Authorization even for a schema-invalid body", async () => {
    const response = await POST(
      intakeRequest({ body: { accountId: "not-a-uuid" } }),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(json).not.toHaveProperty("issues");
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 401 for a short token and does not run the token limiter", async () => {
    const response = await POST(
      intakeRequest({ authorization: "Bearer short" }),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(json).not.toHaveProperty("issues");
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "leads-intake" }),
    );
  });

  test("returns 401 when the intake source is missing", async () => {
    intakeSource = null;

    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 401 when the intake source is revoked", async () => {
    intakeSource = {
      name: "Dialer Partner",
      account_id: ACCOUNT_ID,
      revoked_at: "2026-01-01T00:00:00.000Z",
    };

    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 401 when the token belongs to another workspace", async () => {
    intakeSource = {
      name: "Dialer Partner",
      account_id: OTHER_ACCOUNT_ID,
      revoked_at: null,
    };

    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 429 when the token-scope limiter is exhausted", async () => {
    tokenAllowed = false;

    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json).toEqual({ error: "Too many requests" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 400 for invalid JSON", async () => {
    const response = await POST(intakeRequest({ rawBody: "not-json" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "Invalid JSON body" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 400 with issues when authorized but the payload is invalid", async () => {
    const response = await POST(
      authorizedRequest({ title: "123 Main St", accountId: ACCOUNT_ID }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid lead payload");
    expect(json.issues).toEqual(expect.any(Array));
    expect(json.issues.length).toBeGreaterThan(0);
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("returns 404 when the account does not exist", async () => {
    accountRow = null;

    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ error: "Account not found" });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
  });

  test("creates the lead and runs lead_created workflows on the happy path", async () => {
    const response = await POST(authorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ leadId: "lead-1" });
    expect(mocks.createLeadRecord).toHaveBeenCalledTimes(1);
    expect(mocks.createLeadRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accountId: ACCOUNT_ID,
        title: "123 Main St",
        firstName: "Jane",
        qualificationStatus: "submitted",
        notifyMembers: true,
        source: "Dialer Partner",
      }),
    );
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      expect.anything(),
      ACCOUNT_ID,
      "lead_created",
      { leadId: "lead-1" },
    );
  });

  test("records a call summary note when AI is off and does not parse or write properties", async () => {
    const response = await POST(authorizedRequest(CALL_SUMMARY_BODY));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ leadId: "lead-1" });
    expect(serviceInserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: "lead-1",
          type: "note_added",
          actor_user_id: null,
          payload: {
            note: `Call summary from Dialer Partner:\n\n${CALL_SUMMARY}`,
            system: true,
          },
        },
      },
    ]);
    expect(mocks.parseCallNotes).not.toHaveBeenCalled();
    expect(
      serviceInserts.filter((row) => row.table === "lead_properties"),
    ).toEqual([]);
    expect(serviceUpdates).toEqual([]);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      expect.anything(),
      ACCOUNT_ID,
      "lead_created",
      { leadId: "lead-1" },
    );
  });

  test("inserts lead_properties from parsed call notes when none exist", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.parseCallNotes.mockResolvedValue({
      condition: "Fair",
      occupancyStatus: "Vacant",
      askingPrice: "$195,000",
    });

    const response = await POST(authorizedRequest(CALL_SUMMARY_BODY));

    expect(response.status).toBe(201);
    expect(mocks.parseCallNotes).toHaveBeenCalledWith(CALL_SUMMARY);
    expect(
      serviceInserts.find((row) => row.table === "lead_properties")?.payload,
    ).toEqual({
      account_id: ACCOUNT_ID,
      lead_id: "lead-1",
      condition: "Fair",
      occupancy_status: "Vacant",
      asking_price: 195000,
    });
    expect(serviceUpdates).toEqual([]);
  });

  test("gap-fills only null lead_properties columns and keeps webhook values", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    existingProperty = {
      id: "prop-1",
      condition: "Good",
      occupancy_status: null,
      asking_price: null,
    };
    mocks.parseCallNotes.mockResolvedValue({
      condition: "Fair",
      occupancyStatus: "Vacant",
    });

    const response = await POST(authorizedRequest(CALL_SUMMARY_BODY));

    expect(response.status).toBe(201);
    expect(
      serviceInserts.filter((row) => row.table === "lead_properties"),
    ).toEqual([]);
    expect(serviceUpdates).toEqual([
      {
        table: "lead_properties",
        payload: { occupancy_status: "Vacant" },
        eqs: [["id", "prop-1"]],
      },
    ]);
  });

  test("still succeeds when parseCallNotes rejects", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.parseCallNotes.mockRejectedValue(new Error("AI down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST(authorizedRequest(CALL_SUMMARY_BODY));
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json).toEqual({ leadId: "lead-1" });
      expect(serviceInserts).toEqual([
        {
          table: "activities",
          payload: expect.objectContaining({
            type: "note_added",
            actor_user_id: null,
            payload: expect.objectContaining({
              note: `Call summary from Dialer Partner:\n\n${CALL_SUMMARY}`,
              system: true,
            }),
          }),
        },
      ]);
      expect(
        serviceInserts.filter((row) => row.table === "lead_properties"),
      ).toEqual([]);
      expect(serviceUpdates).toEqual([]);
      expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
        expect.anything(),
        ACCOUNT_ID,
        "lead_created",
        { leadId: "lead-1" },
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  test("does not write lead_properties when extraction maps to an empty update", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.parseCallNotes.mockResolvedValue({
      condition: "",
      occupancyStatus: "   ",
      askingPrice: null,
    });

    const response = await POST(authorizedRequest(CALL_SUMMARY_BODY));

    expect(response.status).toBe(201);
    expect(mocks.parseCallNotes).toHaveBeenCalledWith(CALL_SUMMARY);
    expect(
      serviceInserts.filter((row) => row.table === "lead_properties"),
    ).toEqual([]);
    expect(serviceUpdates).toEqual([]);
  });

  test("does not ingest a call summary when the body omits callSummary", async () => {
    mocks.isAiConfigured.mockReturnValue(true);

    const response = await POST(authorizedRequest());

    expect(response.status).toBe(201);
    expect(
      serviceInserts.filter(
        (row) =>
          row.table === "activities" &&
          (row.payload as { type?: string }).type === "note_added",
      ),
    ).toEqual([]);
    expect(mocks.parseCallNotes).not.toHaveBeenCalled();
  });
});

