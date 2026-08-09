import { describe, expect, test } from "vitest";
import { normalizeDialerPhone } from "../src/lib/dialer/phone";
import {
  boundedRetryDelaySeconds,
  providerEventKey,
  shouldApplyProviderStatus,
} from "../src/lib/dialer/state-machine";

describe("dialer phone normalization", () => {
  test("preserves valid E.164 numbers", () => {
    expect(normalizeDialerPhone("+14155552671")).toBe("+14155552671");
  });

  test("normalizes national numbers using the configured country", () => {
    expect(normalizeDialerPhone("(415) 555-2671", "US")).toBe("+14155552671");
  });

  test("rejects invalid destinations", () => {
    expect(() => normalizeDialerPhone("123", "US")).toThrow("not valid");
  });
});

describe("provider-independent call state", () => {
  test("accepts only newer provider sequences", () => {
    expect(shouldApplyProviderStatus({ currentStatus: "ringing", lastSequence: 2, incomingSequence: 3 })).toBe(true);
    expect(shouldApplyProviderStatus({ currentStatus: "ringing", lastSequence: 3, incomingSequence: 3 })).toBe(false);
  });

  test("protects terminal states from delayed events", () => {
    expect(shouldApplyProviderStatus({ currentStatus: "completed", lastSequence: 5, incomingSequence: 20 })).toBe(false);
    expect(shouldApplyProviderStatus({ currentStatus: "failed", lastSequence: 1, incomingSequence: 2 })).toBe(false);
  });

  test("builds stable deduplication keys", () => {
    expect(providerEventKey("CA123", 4, "ringing")).toBe("CA123:4:ringing");
  });

  test("bounds exponential retry delays", () => {
    expect(boundedRetryDelaySeconds(30, 1)).toBe(30);
    expect(boundedRetryDelaySeconds(30, 3)).toBe(120);
    expect(boundedRetryDelaySeconds(30_000, 4)).toBe(86_400);
  });
});
