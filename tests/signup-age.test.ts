import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

import { signupAgeConfirmed } from "@/lib/auth/signup-age";

describe("signup age confirmation", () => {
  test("accepts only an explicit yes", () => {
    expect(signupAgeConfirmed(new FormData())).toBe(false);
    const unchecked = new FormData();
    unchecked.set("confirm_age", "on");
    expect(signupAgeConfirmed(unchecked)).toBe(false);
    const confirmed = new FormData();
    confirmed.set("confirm_age", "yes");
    expect(signupAgeConfirmed(confirmed)).toBe(true);
  });

  test("the signup action rejects a missing attestation before creating a user", () => {
    const source = readFileSync("src/lib/actions/auth.ts", "utf8");
    const gate = source.indexOf("signupAgeConfirmed");
    const createUser = source.indexOf("generateLink");
    expect(gate).toBeGreaterThan(-1);
    expect(createUser).toBeGreaterThan(gate);
    expect(source.indexOf("auth.signUp")).toBeGreaterThan(gate);
    expect(source).toContain("age_confirmed_at");
    expect(source).toContain(
      "Confirm that you are 18 or older to create a workspace.",
    );
  });

  test("the signup form requires an 18 or older confirmation", () => {
    const page = readFileSync("src/app/(auth)/signup/page.tsx", "utf8");
    expect(page).toContain('name="confirm_age"');
    expect(page).toContain('value="yes"');
    expect(page).toContain("required");
    expect(page).toContain("I am 18 or older");
  });
});
