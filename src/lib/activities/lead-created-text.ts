function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function leadCreatedActivityText(
  payload: Record<string, unknown>,
  fallback?: { leadName?: string | null; contactName?: string | null },
): string {
  const contactFromParts = [trimmed(payload.first_name), trimmed(payload.last_name)]
    .filter(Boolean)
    .join(" ");
  const leadName =
    trimmed(payload.title) ||
    trimmed(payload.lead_name) ||
    trimmed(fallback?.leadName);
  const contactName =
    trimmed(payload.contact_name) ||
    trimmed(payload.contactName) ||
    contactFromParts ||
    trimmed(fallback?.contactName);

  return `Lead created: ${leadName || contactName || "Untitled lead"}`;
}
