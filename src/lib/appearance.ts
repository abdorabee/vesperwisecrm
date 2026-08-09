export type Appearance = "light" | "dark";

export const LIGHT_THEME_COLOR = "#f7f7f2";
export const DARK_THEME_COLOR = "#090a08";
export const APPEARANCE_STORAGE_KEY = "vesperwise-theme";

export function getNextAppearance(appearance: Appearance): Appearance {
  return appearance === "dark" ? "light" : "dark";
}

export function getAppearanceToggleCopy(appearance: Appearance): {
  actionLabel: string;
  currentLabel: string;
} {
  return appearance === "dark"
    ? { actionLabel: "Switch to light mode", currentLabel: "Dark" }
    : { actionLabel: "Switch to dark mode", currentLabel: "Light" };
}

export function isForcedDarkRoute(pathname: string): boolean {
  return pathname === "/home" || pathname === "/tv" || pathname.startsWith("/tv/");
}

export function getRouteThemeColor(pathname: string, appearance: Appearance): string {
  return isForcedDarkRoute(pathname) || appearance === "dark"
    ? DARK_THEME_COLOR
    : LIGHT_THEME_COLOR;
}
