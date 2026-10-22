/** Sequence UI. Off unless explicitly enabled. */
export function isOutreachUiEnabled(): boolean {
  return (
    process.env.OUTREACH_UI_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_OUTREACH_UI_ENABLED === "true"
  );
}

export function isHiddenOutreachPath(pathname: string): boolean {
  return pathname === "/sequences" || pathname.startsWith("/sequences/");
}
