import { describe, expect, test } from "vitest";
import {
  DEMO_WRITE_REJECTED_MESSAGE,
  isDemoAccountEmail,
} from "../src/lib/demo/account";

describe("demo account", () => {
  test("recognizes only the seeded sample address", () => {
    expect(isDemoAccountEmail("sample@demo.vesperwisecrm.invalid")).toBe(true);
    expect(isDemoAccountEmail(" Sample@demo.vesperwisecrm.invalid ")).toBe(true);
    expect(isDemoAccountEmail("owner@example.com")).toBe(false);
    expect(isDemoAccountEmail(null)).toBe(false);
  });

  test("tells the visitor to create a workspace", () => {
    expect(DEMO_WRITE_REJECTED_MESSAGE).toMatch(/create your own workspace/i);
  });
});
