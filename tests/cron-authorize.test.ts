import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAuthorizedCronRequest } from "@/lib/cron/authorize";

const originalCronSecret = process.env.CRON_SECRET;

function restoreCronSecret() {
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
}

afterEach(() => {
  restoreCronSecret();
});

function requestWithAuthorization(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }
  return new Request("http://127.0.0.1/api/cron/client-digest", { headers });
}

describe("isAuthorizedCronRequest", () => {
  test("returns false when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    const request = requestWithAuthorization("Bearer local-dev-cron-secret");
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  test("returns false when Authorization header is missing", () => {
    process.env.CRON_SECRET = "local-dev-cron-secret";
    expect(isAuthorizedCronRequest(requestWithAuthorization())).toBe(false);
  });

  test("returns false for the wrong secret", () => {
    process.env.CRON_SECRET = "local-dev-cron-secret";
    expect(
      isAuthorizedCronRequest(requestWithAuthorization("Bearer other-secret")),
    ).toBe(false);
  });

  test("returns false when the bearer token is shorter and does not throw", () => {
    process.env.CRON_SECRET = "local-dev-cron-secret";
    expect(() =>
      isAuthorizedCronRequest(requestWithAuthorization("Bearer short")),
    ).not.toThrow();
    expect(
      isAuthorizedCronRequest(requestWithAuthorization("Bearer short")),
    ).toBe(false);
  });

  test("returns false when the bearer token is longer and does not throw", () => {
    process.env.CRON_SECRET = "local-dev-cron-secret";
    const longer = `Bearer ${"local-dev-cron-secret"}-extra`;
    expect(() =>
      isAuthorizedCronRequest(requestWithAuthorization(longer)),
    ).not.toThrow();
    expect(isAuthorizedCronRequest(requestWithAuthorization(longer))).toBe(
      false,
    );
  });

  test("returns true for the exact Bearer secret", () => {
    process.env.CRON_SECRET = "local-dev-cron-secret";
    expect(
      isAuthorizedCronRequest(
        requestWithAuthorization("Bearer local-dev-cron-secret"),
      ),
    ).toBe(true);
  });
});
