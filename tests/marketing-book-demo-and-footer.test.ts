import { describe, expect, test } from "vitest";

import {
  FOOTER_COLUMNS,
  LEGAL_LINKS,
} from "../src/components/marketing/marketing-footer";
import {
  MARKETING_PAGES,
  SOLUTION_PAGES,
  SOLUTION_SLUGS,
} from "../src/components/marketing/content/pages";
import {
  MARKETING_SITEMAP_PATHS,
  isMarketingPublicPath,
} from "../src/lib/marketing/public-paths";
import {
  formatTimeLabel,
  isSelectableDemoDate,
  isValidDemoSlot,
  listDemoTimeSlots,
  parseDateKey,
  toDateKey,
} from "../src/lib/marketing/demo-slots";
import {
  parseContactInquiry,
  parseDemoBooking,
} from "../src/lib/validations/marketing-inquiry";

describe("marketing footer destinations", () => {
  test("does not leave column or legal links on #top", () => {
    const hrefs = [
      ...FOOTER_COLUMNS.flatMap((column) =>
        column.links.map((link) => link.href),
      ),
      ...LEGAL_LINKS.map((link) => link.href),
    ];

    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every((href) => href !== "#top")).toBe(true);
  });

  test("maps product topics to existing home sections", () => {
    const product = FOOTER_COLUMNS.find((column) => column.title === "PRODUCT");
    expect(product?.links).toEqual([
      { label: "Lead intake", href: "/home#ch1" },
      { label: "Skip tracing", href: "/home#ch1" },
      { label: "Dialer", href: "/home#ch3" },
      { label: "Pipeline", href: "/home#ch4" },
      { label: "Workflows", href: "/home#ch5" },
      { label: "Reporting", href: "/home#ch6" },
    ]);
  });

  test("points remaining columns at dedicated marketing routes", () => {
    const byColumn = Object.fromEntries(
      FOOTER_COLUMNS.map((column) => [
        column.title,
        column.links.map((link) => link.href),
      ]),
    );

    expect(byColumn.SOLUTIONS).toEqual(
      SOLUTION_SLUGS.map((slug) => `/solutions/${slug}`),
    );
    expect(byColumn.RESOURCES).toEqual([
      "/docs",
      "/onboarding",
      "/changelog",
      "/integrations",
      "/support",
    ]);
    expect(byColumn.COMPANY).toEqual([
      "/about",
      "/careers",
      "/security",
      "/contact",
    ]);
    expect(LEGAL_LINKS.map((link) => link.href)).toEqual([
      "/privacy",
      "/terms",
      "/status",
    ]);
  });
});

describe("marketing public paths", () => {
  test("allows book-demo, solutions, company, resources, and legal routes", () => {
    expect(isMarketingPublicPath("/book-demo")).toBe(true);
    expect(isMarketingPublicPath("/solutions/wholesalers")).toBe(true);
    expect(isMarketingPublicPath("/privacy")).toBe(true);
    expect(isMarketingPublicPath("/about")).toBe(true);
    expect(isMarketingPublicPath("/docs")).toBe(true);
    expect(isMarketingPublicPath("/contact")).toBe(true);
    expect(isMarketingPublicPath("/pipeline")).toBe(false);
    expect(isMarketingPublicPath("/login")).toBe(false);
  });

  test("lists sitemap destinations for every footer page", () => {
    expect(MARKETING_SITEMAP_PATHS).toContain("/book-demo");
    expect(MARKETING_SITEMAP_PATHS).toEqual(
      expect.arrayContaining([
        ...SOLUTION_SLUGS.map((slug) => `/solutions/${slug}`),
        ...Object.values(MARKETING_PAGES).map((page) => page.href),
      ]),
    );
    expect(Object.keys(SOLUTION_PAGES)).toEqual([...SOLUTION_SLUGS]);
  });
});

describe("demo booking slots", () => {
  const wednesdayAfternoon = new Date(2026, 7, 19, 15, 10, 0);

  test("rejects weekends and past days", () => {
    expect(isSelectableDemoDate(new Date(2026, 7, 15), wednesdayAfternoon)).toBe(
      false,
    );
    expect(isSelectableDemoDate(new Date(2026, 7, 16), wednesdayAfternoon)).toBe(
      false,
    );
    expect(isSelectableDemoDate(new Date(2026, 7, 18), wednesdayAfternoon)).toBe(
      false,
    );
    expect(isSelectableDemoDate(new Date(2026, 7, 19), wednesdayAfternoon)).toBe(
      true,
    );
    expect(isSelectableDemoDate(new Date(2026, 7, 20), wednesdayAfternoon)).toBe(
      true,
    );
  });

  test("omits past slots on the selected day", () => {
    const slots = listDemoTimeSlots(
      new Date(2026, 7, 19),
      wednesdayAfternoon,
    );
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("15:00");
    expect(slots[0]).toBe("15:30");
    expect(slots.at(-1)).toBe("16:30");
  });

  test("validates weekday future slots only", () => {
    expect(isValidDemoSlot("2026-08-20", "09:00", wednesdayAfternoon)).toBe(
      true,
    );
    expect(isValidDemoSlot("2026-08-22", "09:00", wednesdayAfternoon)).toBe(
      false,
    );
    expect(isValidDemoSlot("2026-08-19", "09:00", wednesdayAfternoon)).toBe(
      false,
    );
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(toDateKey(new Date(2026, 7, 20))).toBe("2026-08-20");
    expect(formatTimeLabel("09:30")).toBe("9:30 AM");
    expect(formatTimeLabel("16:00")).toBe("4:00 PM");
  });
});

describe("demo booking payload", () => {
  const now = new Date(2026, 7, 19, 10, 0, 0);
  const valid = {
    name: "Jordan Lee",
    email: "jordan@example.com",
    company: "Northwind Acquisitions",
    teamSize: "2-5",
    notes: "Show the dialer",
    dateKey: "2026-08-20",
    time: "09:30",
    timeZone: "America/Indiana/Indianapolis",
    website: "",
  };

  test("accepts a valid weekday slot", () => {
    expect(parseDemoBooking(valid, now)).toEqual({
      ok: true,
      honeypot: false,
      data: { ...valid, notes: "Show the dialer", website: "" },
    });
  });

  test("rejects an invalid email", () => {
    const result = parseDemoBooking({ ...valid, email: "not-an-email" }, now);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).toContain("email");
    }
  });

  test("rejects a missing or invalid slot", () => {
    expect(parseDemoBooking({ ...valid, time: "" }, now).ok).toBe(false);
    expect(
      parseDemoBooking({ ...valid, dateKey: "2026-08-22", time: "09:30" }, now),
    ).toEqual({
      ok: false,
      error: "Select a weekday time slot in the future.",
    });
  });

  test("treats filled honeypot fields as a silent success", () => {
    expect(parseDemoBooking({ ...valid, website: "https://spam.test" }, now)).toEqual({
      ok: true,
      honeypot: true,
    });
  });
});

describe("contact inquiry payload", () => {
  test("accepts a valid message and rejects a short one", () => {
    const valid = {
      name: "Jordan Lee",
      email: "jordan@example.com",
      company: "Northwind Acquisitions",
      message: "We want a walkthrough of the queue.",
      website: "",
    };

    expect(parseContactInquiry(valid)).toMatchObject({
      ok: true,
      honeypot: false,
    });
    expect(parseContactInquiry({ ...valid, message: "Hi" }).ok).toBe(false);
  });
});
