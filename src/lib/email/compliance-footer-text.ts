function presentText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

export function formatComplianceFooter(params: {
  unsubscribeUrl: string;
  companyName?: string | null;
  postalAddress?: string | null;
}): string {
  const companyName = presentText(params.companyName);
  const postalAddress = presentText(params.postalAddress);

  return [
    "",
    "---",
    ...(companyName ? [companyName] : []),
    ...(postalAddress ? [postalAddress] : []),
    "You're receiving this because you were added as a contact.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}
