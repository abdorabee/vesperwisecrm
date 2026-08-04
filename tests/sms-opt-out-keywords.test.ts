// Pure keyword-matching logic for inbound SMS opt-out detection
// (src/lib/sms/process-inbound.ts). No DB/network involved, unlike the
// rest of the SMS suppression feature, whose integration coverage is
// blocked on the sms_opted_out_at migration being applied to the hosted
// project (see docs/progress/quick-wins.md).
import { describe, expect, test } from "vitest";
import { isSmsOptOutKeyword } from "../src/lib/sms/process-inbound";

describe("isSmsOptOutKeyword", () => {
  test.each(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"])(
    "recognizes the carrier-standard keyword %j",
    (keyword) => {
      expect(isSmsOptOutKeyword(keyword)).toBe(true);
    },
  );

  test("matches case-insensitively", () => {
    expect(isSmsOptOutKeyword("STOP")).toBe(true);
    expect(isSmsOptOutKeyword("Unsubscribe")).toBe(true);
  });

  test("ignores surrounding whitespace", () => {
    expect(isSmsOptOutKeyword("  stop  ")).toBe(true);
  });

  test("does not match a keyword embedded in a longer message", () => {
    // Carrier convention (and Twilio's own behavior) only treats the
    // *entire* message as an opt-out command -- a sentence that merely
    // contains the word must not silently suppress the contact.
    expect(isSmsOptOutKeyword("please stop calling me")).toBe(false);
    expect(isSmsOptOutKeyword("cancel my appointment please")).toBe(false);
  });

  test("does not match unrelated or empty messages", () => {
    expect(isSmsOptOutKeyword("")).toBe(false);
    expect(isSmsOptOutKeyword("yes, that works for me")).toBe(false);
  });
});
