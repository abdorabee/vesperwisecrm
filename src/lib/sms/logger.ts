export type SmsLogEvent = "inbound" | "webhook_error";

export interface SmsLogPayload {
  event: SmsLogEvent;
  account_id?: string;
  lead_id?: string | null;
  twilio_message_sid?: string | null;
  from?: string | null;
  reason?: string;
  status?: string;
  [key: string]: unknown;
}

export function logSmsEvent(payload: SmsLogPayload): void {
  console.log(
    JSON.stringify({
      scope: "sms",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}
