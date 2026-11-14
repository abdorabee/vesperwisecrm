import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isHiddenOutreachPath } from "@/lib/features/outreach-ui-enabled";
import { isMarketingPublicPath } from "@/lib/marketing/public-paths";

const middlewareSource = readFileSync("src/lib/supabase/middleware.ts", "utf8");

describe("middleware public path contract", () => {
  test.each([
    "/api/cron",
    "/api/leads/intake",
    "/api/webhooks/polar",
    "/api/webhooks/resend-events",
    "/login",
    "/signup",
    "/auth",
    "/sw.js",
    "/manifest.webmanifest",
  ])("PUBLIC_PATHS includes %s", (path) => {
    expect(middlewareSource).toContain("PUBLIC_PATHS");
    expect(middlewareSource).toContain(`"${path}"`);
  });

  test("logged-out visitors at / redirect to /home, with /login as the deep-link fallback", () => {
    expect(middlewareSource).toContain('"/home"');
    expect(middlewareSource).toContain(
      'request.nextUrl.pathname === "/" ? "/home" : "/login"',
    );
  });
});

describe("isHiddenOutreachPath", () => {
  test.each(["/sequences", "/sequences/abc"])(
    "is true for %s",
    (pathname) => {
      expect(isHiddenOutreachPath(pathname)).toBe(true);
    },
  );

  test.each(["/pipeline", "/settings"])("is false for %s", (pathname) => {
    expect(isHiddenOutreachPath(pathname)).toBe(false);
  });
});

describe("isMarketingPublicPath", () => {
  test.each(["/home", "/pricing", "/solutions/wholesalers"])(
    "is true for %s",
    (pathname) => {
      expect(isMarketingPublicPath(pathname)).toBe(true);
    },
  );

  test.each(["/pipeline", "/leads"])("is false for %s", (pathname) => {
    expect(isMarketingPublicPath(pathname)).toBe(false);
  });
});
