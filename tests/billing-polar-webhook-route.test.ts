import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { processPolarWebhook } = vi.hoisted(() => ({
  processPolarWebhook: vi.fn(),
}));

vi.mock("@/lib/billing/polar-webhook", () => ({
  processPolarWebhook,
}));

vi.mock("@/lib/billing/config", () => ({
  getBillingConfig: () => ({
    enabled: true,
    mode: "sandbox",
    accessToken: "token",
    webhookSecret: "polar-webhook-test-secret",
    productIds: { starter: "prod_starter", team: "prod_team", scale: null },
    scaleCheckoutEnabled: false,
  }),
}));

const secret = "polar-webhook-test-secret";

function signedRequest(body: string, id = "msg_123") {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("https://www.vesperwisecrm.com/api/webhooks/polar", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
    body,
  });
}

describe("Polar webhook route", () => {
  beforeEach(() => {
    processPolarWebhook.mockReset();
    processPolarWebhook.mockResolvedValue({ duplicate: false, ignored: true });
  });

  it("returns 202 for signed events Polar's SDK does not yet parse", async () => {
    const { POST } = await import("@/app/api/webhooks/polar/route");
    const body = JSON.stringify({
      type: "subscription.cycled",
      timestamp: "2026-08-16T10:00:00.000Z",
      data: { id: "sub_123", status: "active", product_id: "prod_team" },
    });

    const response = await POST(signedRequest(body));
    expect(response.status).toBe(202);
    expect(processPolarWebhook).toHaveBeenCalledWith(
      JSON.parse(body),
      "msg_123",
    );
  });

  it("returns 401 for invalid signatures", async () => {
    const { POST } = await import("@/app/api/webhooks/polar/route");
    const body = JSON.stringify({ type: "customer.deleted" });
    const request = signedRequest(body);
    request.headers.set("webhook-signature", "v1,not-a-real-signature");

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(processPolarWebhook).not.toHaveBeenCalled();
  });
});
