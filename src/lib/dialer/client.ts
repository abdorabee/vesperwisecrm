import type { BrowserCallHandlers, BrowserVoiceSession } from "@/lib/dialer/providers/twilio/client";
import { connectTwilioBrowserCall } from "@/lib/dialer/providers/twilio/client";

declare global {
  interface Window {
    __VESPER_DIALER_TEST_CONNECT__?: (
      token: string,
      params: Record<string, string>,
      handlers: BrowserCallHandlers,
    ) => Promise<BrowserVoiceSession>;
  }
}

export async function connectBrowserCall(
  token: string,
  params: Record<string, string>,
  handlers: BrowserCallHandlers,
): Promise<BrowserVoiceSession> {
  if (
    process.env.NODE_ENV !== "production" &&
    window.__VESPER_DIALER_TEST_CONNECT__
  ) {
    return window.__VESPER_DIALER_TEST_CONNECT__(token, params, handlers);
  }
  return connectTwilioBrowserCall(token, params, handlers);
}
