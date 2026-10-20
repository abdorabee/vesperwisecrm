import { redirect } from "next/navigation";

/** Outreach UI (sequences, dialer, SMS). Off unless explicitly enabled. */
export function isOutreachUiEnabled(): boolean {
  return (
    process.env.OUTREACH_UI_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_OUTREACH_UI_ENABLED === "true"
  );
}

export function redirectIfOutreachUiDisabled(): void {
  if (!isOutreachUiEnabled()) {
    redirect("/");
  }
}
