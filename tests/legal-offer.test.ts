import { describe, expect, test } from "vitest";

import { MARKETING_PAGES, SOLUTION_PAGES } from "@/components/marketing/content/pages";
import {
  LEGAL_LAST_UPDATED,
  PUBLIC_BILLING_CADENCE,
  PUBLIC_SEAT_OFFER,
} from "@/lib/billing/public-offer";

describe("legal pages and the live offer", () => {
  test("terms and privacy state the same offer and stay not counsel-reviewed", () => {
    for (const page of [MARKETING_PAGES.terms, MARKETING_PAGES.privacy]) {
      const text = [page.description, ...page.sections.map((section) => section.body)].join(
        "\n",
      );
      expect(text).toContain(PUBLIC_SEAT_OFFER);
      expect(text).toContain(PUBLIC_BILLING_CADENCE);
      expect(page.updated).toBe(LEGAL_LAST_UPDATED);
    }

    expect(MARKETING_PAGES.terms.description).toContain(
      "not a substitute for a signed order form or counsel review",
    );
    expect(MARKETING_PAGES.privacy.description).toContain(
      "not counsel-reviewed legal advice",
    );
  });

  test("terms cover cancellation, renewal, and calling without invented contract clauses", () => {
    const headings = MARKETING_PAGES.terms.sections.map((section) => section.heading);
    expect(headings).toEqual(
      expect.arrayContaining([
        "Cancellation and refunds",
        "Auto-renewal",
        "Calling and texting",
      ]),
    );
    const text = MARKETING_PAGES.terms.sections.map((section) => section.body).join("\n");
    expect(text).toContain("cancel a Polar subscription at period end");
    expect(text).not.toMatch(/governing law|limitation of liability|damages cap/i);
    expect(text).not.toContain("placeholder");
  });

  test("privacy covers subprocessors and retention", () => {
    const headings = MARKETING_PAGES.privacy.sections.map((section) => section.heading);
    expect(headings).toEqual(
      expect.arrayContaining(["Subprocessors", "Retention and deletion"]),
    );
  });

  test("security, dispositions, and onboarding do not claim unshipped Scale features", () => {
    expect(MARKETING_PAGES.security.description).not.toMatch(/SSO|audit log/i);
    const dispositionText = SOLUTION_PAGES.dispositions.sections
      .map((section) => `${section.heading} ${section.body}`)
      .join("\n");
    expect(dispositionText).not.toMatch(/Scale plans cover|multi-market reporting/i);
    expect(MARKETING_PAGES.onboarding.description).not.toContain("Dedicated onboarding");
  });
});
