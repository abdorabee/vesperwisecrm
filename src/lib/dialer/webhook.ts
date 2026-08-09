import "server-only";

import { getDialerConfig } from "@/lib/dialer/config";

export async function readFormParams(request: Request): Promise<Record<string, string>> {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  return params;
}

export function canonicalDialerWebhookUrl(request: Request): string {
  const incoming = new URL(request.url);
  return `${getDialerConfig().publicBaseUrl}${incoming.pathname}${incoming.search}`;
}
