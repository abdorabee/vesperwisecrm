import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import {
  isHiddenOutreachPath,
  isOutreachUiEnabled,
} from "@/lib/features/outreach-ui-enabled";

const originalOutreach = process.env.OUTREACH_UI_ENABLED;
const originalPublicOutreach = process.env.NEXT_PUBLIC_OUTREACH_UI_ENABLED;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restoreEnv("OUTREACH_UI_ENABLED", originalOutreach);
  restoreEnv("NEXT_PUBLIC_OUTREACH_UI_ENABLED", originalPublicOutreach);
});

function setOutreachEnv(
  outreach: string | undefined,
  publicOutreach: string | undefined,
) {
  restoreEnv("OUTREACH_UI_ENABLED", outreach);
  restoreEnv("NEXT_PUBLIC_OUTREACH_UI_ENABLED", publicOutreach);
}

describe("isOutreachUiEnabled", () => {
  test.each([
    ["unset", undefined],
    ["empty", ""],
    ["false", "false"],
    ["TRUE", "TRUE"],
    ["1", "1"],
    ["yes", "yes"],
  ] as const)("is false when both env vars are %s", (_label, value) => {
    setOutreachEnv(value, value);
    expect(isOutreachUiEnabled()).toBe(false);
  });

  test("is true when only OUTREACH_UI_ENABLED is exactly true", () => {
    setOutreachEnv("true", undefined);
    expect(isOutreachUiEnabled()).toBe(true);
  });

  test("is true when only NEXT_PUBLIC_OUTREACH_UI_ENABLED is exactly true", () => {
    setOutreachEnv(undefined, "true");
    expect(isOutreachUiEnabled()).toBe(true);
  });

  test("is true when both env vars are exactly true", () => {
    setOutreachEnv("true", "true");
    expect(isOutreachUiEnabled()).toBe(true);
  });
});

describe("isHiddenOutreachPath", () => {
  test.each(["/sequences", "/sequences/abc"])(
    "is true for %s",
    (pathname) => {
      expect(isHiddenOutreachPath(pathname)).toBe(true);
    },
  );

  test.each([
    "/",
    "/pipeline",
    "/sequence",
    "/settings",
    "/settings/email",
    "/dialer",
  ])("is false for %s", (pathname) => {
    expect(isHiddenOutreachPath(pathname)).toBe(false);
  });
});

describe("middleware outreach redirect contract", () => {
  test("redirects hidden outreach paths only when OUTREACH_UI_ENABLED !== true", () => {
    expect(existsSync("src/lib/supabase/middleware.ts")).toBe(true);
    const source = readFileSync("src/lib/supabase/middleware.ts", "utf8");

    expect(source).toContain(
      'process.env.OUTREACH_UI_ENABLED !== "true" && isHiddenOutreachPath(pathname)',
    );
    expect(source).not.toContain("NEXT_PUBLIC_OUTREACH_UI_ENABLED");
  });
});
