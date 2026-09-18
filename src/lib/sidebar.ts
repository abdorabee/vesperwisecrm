/**
 * Sidebar collapse state lives in a cookie, not localStorage, so the server can
 * read it while rendering. localStorage is invisible to the server, which meant
 * the shell always rendered expanded and then snapped to collapsed on hydration.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar-collapsed";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Written from the client so a toggle is instant and costs no round trip. */
export function writeSidebarCollapsedCookie(collapsed: boolean): void {
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
