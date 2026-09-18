import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPolarClient } from "@/lib/billing/polar";

const originalEnv = process.env;

describe("Polar API Version Header", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      POLAR_BILLING_ENABLED: "true",
      POLAR_ACCESS_TOKEN: "test_token",
      POLAR_WEBHOOK_SECRET: "test_secret",
      POLAR_STARTER_PRODUCT_ID: "starter",
      POLAR_TEAM_PRODUCT_ID: "team",
      POLAR_SCALE_PRODUCT_ID: "scale",
      POLAR_MODE: "sandbox",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  test("getPolarClient sets Polar-Version header to 2026-04", async () => {
    const client = getPolarClient();
    
    let capturedRequest: Request | null = null;
    const mockFetch = vi.fn((request: Request) => {
      capturedRequest = request;
      return Promise.resolve(
        new Response(JSON.stringify({ id: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    global.fetch = mockFetch;

    try {
      await client.products.get({ id: "test_product_id" });
    } catch {
      // Expected to fail, we're only checking the request
    }

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.headers.get("Polar-Version")).toBe("2026-04");
  });
});
