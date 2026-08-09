import { describe, expect, test } from "vitest";
import { getDashboardNavigation } from "../src/lib/product-navigation";

describe("product navigation", () => {
  test("organizes the acquisition product around customer workflows", () => {
    const groups = getDashboardNavigation({ isAdmin: false, isPlatformAdmin: false });
    expect(groups.map((group) => group.label)).toEqual([
      "Workspace",
      "Sales",
      "Capture",
      "Engage",
      "Automate",
      "Insights",
    ]);
    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/",
      "/pipeline",
      "/queue",
      "/intake",
      "/dialer",
      "/sequences",
      "/workflows",
      "/scorecard",
    ]);
  });

  test("adds only role-supported destinations", () => {
    const adminHrefs = getDashboardNavigation({ isAdmin: true, isPlatformAdmin: true })
      .flatMap((group) => group.items)
      .map((item) => item.href);

    expect(adminHrefs).toContain("/team/clients");
    expect(adminHrefs).toContain("/team/scorecard");
    expect(adminHrefs).toContain("/platform/email");
    expect(adminHrefs).not.toContain("/contacts");
    expect(adminHrefs).not.toContain("/deals");
  });
});
