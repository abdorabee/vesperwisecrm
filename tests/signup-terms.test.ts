import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

import { signupTermsAccepted } from "@/lib/auth/signup-terms";

describe("signup terms acceptance", () => {
  test("accepts only an explicit yes", () => {
    expect(signupTermsAccepted(new FormData())).toBe(false);
    const unchecked = new FormData();
    unchecked.set("accept_terms", "on");
    expect(signupTermsAccepted(unchecked)).toBe(false);
    const accepted = new FormData();
    accepted.set("accept_terms", "yes");
    expect(signupTermsAccepted(accepted)).toBe(true);
  });

  test("the signup action rejects missing acceptance before creating a user", () => {
    const source = readFileSync("src/lib/actions/auth.ts", "utf8");
    const gate = source.indexOf("signupTermsAccepted");
    const createUser = source.indexOf("generateLink");
    expect(gate).toBeGreaterThan(-1);
    expect(createUser).toBeGreaterThan(gate);
    expect(source.indexOf("auth.signUp")).toBeGreaterThan(gate);
    expect(source).toContain("terms_accepted_at");
  });

  test("the signup form links to the terms and privacy pages", () => {
    const page = readFileSync("src/app/(auth)/signup/page.tsx", "utf8");
    expect(page).toContain('name="accept_terms"');
    expect(page).toContain('value="yes"');
    expect(page).toContain('href="/terms"');
    expect(page).toContain('href="/privacy"');
  });
});
