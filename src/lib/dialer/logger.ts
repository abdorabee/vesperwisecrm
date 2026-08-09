interface DialerLogPayload {
  event?: string;
  account_id?: string;
  call_id?: string;
  attempt_id?: string;
  provider?: string;
  status?: string;
  error_code?: string;
  reason?: string;
  [key: string]: unknown;
}

export function logDialerEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: DialerLogPayload = {},
): void {
  console[level](
    JSON.stringify({
      scope: "dialer",
      ts: new Date().toISOString(),
      event,
      ...payload,
    }),
  );
}
