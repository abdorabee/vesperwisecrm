import "server-only";

import { requireDialerEnabled } from "@/lib/dialer/config";
import type { DialerProvider } from "@/lib/dialer/types";
import { TwilioDialerProvider } from "@/lib/dialer/providers/twilio/server";

let provider: DialerProvider | null = null;

export function getDialerProvider(): DialerProvider {
  const config = requireDialerEnabled();
  if (!provider || provider.id !== config.provider) {
    provider = new TwilioDialerProvider();
  }
  return provider;
}
