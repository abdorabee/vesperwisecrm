import { describe, expect, test } from "vitest";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  getAppearanceToggleCopy,
  getNextAppearance,
  getRouteThemeColor,
} from "../src/lib/appearance";

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f\d]{2}/gi)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [];
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("appearance behavior", () => {
  test("toggles between the two supported appearances", () => {
    expect(getNextAppearance("light")).toBe("dark");
    expect(getNextAppearance("dark")).toBe("light");
  });

  test("describes the action instead of relying on the icon", () => {
    expect(getAppearanceToggleCopy("light")).toEqual({
      actionLabel: "Switch to dark mode",
      currentLabel: "Light",
    });
    expect(getAppearanceToggleCopy("dark")).toEqual({
      actionLabel: "Switch to light mode",
      currentLabel: "Dark",
    });
  });

  test("keeps marketing and TV browser chrome dark", () => {
    expect(getRouteThemeColor("/home", "light")).toBe(DARK_THEME_COLOR);
    expect(getRouteThemeColor("/tv/demo-token", "light")).toBe(DARK_THEME_COLOR);
    expect(getRouteThemeColor("/login", "light")).toBe(LIGHT_THEME_COLOR);
    expect(getRouteThemeColor("/pipeline", "dark")).toBe(DARK_THEME_COLOR);
  });

  test("keeps light appearance body, secondary, and accent text accessible", () => {
    expect(contrastRatio("#171914", "#f7f7f2")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#62675b", "#f7f7f2")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#62675b", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#536000", "#f7f7f2")).toBeGreaterThanOrEqual(4.5);
  });
});
