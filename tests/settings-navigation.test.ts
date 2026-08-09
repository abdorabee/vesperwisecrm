import { describe, expect, test } from "vitest";
import {
  getCurrentSettingsLocation,
  getSettingsNavigationGroups,
} from "../src/components/settings/settings-navigation-model";

describe("settings navigation", () => {
  test("ordinary members only receive supported personal and workspace destinations", () => {
    const groups = getSettingsNavigationGroups(false);
    expect(groups.map((group) => group.label)).toEqual(["Personal", "Workspace"]);
    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/settings/profile",
      "/settings/workspace",
    ]);
  });

  test("describes the active page with its settings group", () => {
    const location = getCurrentSettingsLocation(
      "/settings/calling",
      getSettingsNavigationGroups(true),
    );
    expect(location).toMatchObject({ groupLabel: "Communication", label: "Calling" });
  });

  test("falls back to Profile for an unmatched settings route", () => {
    const location = getCurrentSettingsLocation(
      "/settings/unknown",
      getSettingsNavigationGroups(true),
    );
    expect(location.href).toBe("/settings/profile");
  });
});
