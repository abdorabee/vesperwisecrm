import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("product foundations", () => {
  test.each([
    "src/app/(dashboard)/settings/layout.tsx",
    "src/app/(dashboard)/settings/page.tsx",
    "src/app/(dashboard)/settings/workspace/page.tsx",
    "src/app/(dashboard)/settings/members/page.tsx",
    "src/app/(dashboard)/settings/routing/page.tsx",
    "src/app/(dashboard)/settings/calling/page.tsx",
    "src/app/(dashboard)/settings/integrations/page.tsx",
    "src/app/(dashboard)/settings/data-migration/page.tsx",
  ])("provides the canonical settings route %s", (path) => {
    expect(existsSync(path)).toBe(true);
  });

  test("the dashboard shell is responsive and keyboard accessible", () => {
    const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8");
    const nav = readFileSync("src/components/dashboard-nav.tsx", "utf8");
    expect(layout).toContain('href="#main-content"');
    expect(layout).toContain('id="main-content"');
    expect(layout).toContain("min-h-dvh");
    expect(nav).toContain("MobileNavigation");
    expect(nav).toContain('aria-current={active ? "page" : undefined}');
    // Collapse state persists in a cookie the server reads while rendering, so
    // the rail arrives at its final width instead of flashing open on hydration.
    expect(nav).toContain("writeSidebarCollapsedCookie");
    expect(layout).toContain("SIDEBAR_COLLAPSED_COOKIE");
    expect(layout).toContain("defaultCollapsed={sidebarCollapsed}");
    // A collapsed item keeps its label in the DOM rather than swapping to an
    // aria-label, so its accessible name is the same in both states.
    expect(nav).toContain('collapsed ? "sr-only" : "truncate"');
  });

  test("the tour remains replayable but never forces itself open", () => {
    const tour = readFileSync(
      "src/app/(dashboard)/_components/onboarding-tour.tsx",
      "utf8",
    );
    const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8");
    expect(tour).not.toContain("shouldAutoOpen");
    expect(layout).not.toContain("shouldAutoOpenTour");
    expect(tour).toContain("useOnboardingTour");
  });

  test("legacy configuration routes redirect to settings", () => {
    const team = readFileSync("src/app/(dashboard)/team/page.tsx", "utf8");
    const groups = readFileSync("src/app/(dashboard)/team/groups/page.tsx", "utf8");
    expect(team).toContain('redirect("/settings/members")');
    expect(groups).toContain('redirect("/settings/routing")');
  });

  test("the product shell remains usable before the workspace settings migration is applied", () => {
    const query = readFileSync("src/lib/queries/workspace-settings.ts", "utf8");
    const page = readFileSync(
      "src/app/(dashboard)/settings/workspace/page.tsx",
      "utf8",
    );
    expect(query).toContain("isWorkspaceSettingsSchemaMissing");
    expect(query).toContain('.select("id, name, created_at")');
    expect(query).toContain("schemaAvailable: false");
    expect(page).toContain("getWorkspaceSettingsState");
    expect(page).toContain("schemaAvailable={schemaAvailable}");
  });

  test("both compact and desktop settings navigation preserve unsaved changes", () => {
    const navigation = readFileSync(
      "src/components/settings/settings-navigation.tsx",
      "utf8",
    );
    expect(navigation).toContain(
      "onClick={(event) => navigate(event, item.href)}",
    );
    expect(navigation).toContain("onNavigate={navigate}");
  });
});
