import type { AccountEmailSettings } from "@/lib/email/account-settings";

export function formatFromAddress(settings: AccountEmailSettings): string {
  const accountEmail = settings.from_email?.trim();
  const accountName = settings.from_name?.trim();

  if (!accountEmail) {
    throw new Error("From email is required");
  }

  if (accountName) {
    return `${accountName} <${accountEmail}>`;
  }

  return accountEmail;
}
