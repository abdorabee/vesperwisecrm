import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { verifyPolarWebhookEvent } from "@/lib/billing/polar-webhook-parse";

const secret = "polar-webhook-test-secret";

function signedFixture(body: string, id = "msg_123") {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
  };
}

const customerDeleted = JSON.stringify({
  type: "customer.deleted",
  timestamp: "2026-08-16T10:00:00.000Z",
  data: {
    id: "cust_123",
    created_at: "2026-08-16T09:00:00.000Z",
    modified_at: null,
    metadata: {},
    email: "billing@example.com",
    email_verified: true,
    type: "individual",
    name: "Billing Example",
    billing_name: null,
    billing_address: null,
    tax_id: null,
    organization_id: "org_123",
    deleted_at: "2026-08-16T10:00:00.000Z",
    avatar_url: null,
  },
});

const subscriptionCycled = JSON.stringify({
  type: "subscription.cycled",
  timestamp: "2026-08-16T10:00:00.000Z",
  data: {
    id: "sub_123",
    status: "active",
    product_id: "prod_team",
    customer_id: "cust_123",
  },
});

describe("Polar webhook signature verification", () => {
  it("accepts a valid Standard Webhook signature over the raw body", () => {
    const signed = signedFixture(customerDeleted);
    const event = validateEvent(customerDeleted, signed.headers, secret);
    expect(event.type).toBe("customer.deleted");
  });

  it("rejects a body changed after signing", () => {
    const signed = signedFixture(customerDeleted);
    expect(() =>
      validateEvent(
        customerDeleted.replace("Billing Example", "Attacker"),
        signed.headers,
        secret,
      ),
    ).toThrow();
  });

  it("acks signed Polar events the SDK cannot parse instead of rejecting them", () => {
    const signed = signedFixture(subscriptionCycled);
    expect(() =>
      validateEvent(subscriptionCycled, signed.headers, secret),
    ).toThrow();

    const verified = verifyPolarWebhookEvent(
      subscriptionCycled,
      signed.headers,
      secret,
    );
    expect(verified).toEqual({
      ok: true,
      event: JSON.parse(subscriptionCycled),
    });
  });

  it("still rejects invalid signatures", () => {
    const signed = signedFixture(customerDeleted);
    expect(
      verifyPolarWebhookEvent(
        customerDeleted.replace("Billing Example", "Attacker"),
        signed.headers,
        secret,
      ),
    ).toEqual({ ok: false, reason: "invalid_signature" });
  });
});
