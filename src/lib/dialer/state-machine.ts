import { TERMINAL_CALL_STATUSES, type NormalizedCallStatus } from "@/lib/dialer/types";

export function shouldApplyProviderStatus(input: {
  currentStatus: NormalizedCallStatus;
  lastSequence: number;
  incomingSequence: number;
}): boolean {
  return !TERMINAL_CALL_STATUSES.has(input.currentStatus) &&
    input.incomingSequence > input.lastSequence;
}

export function providerEventKey(
  providerCallId: string,
  sequence: number,
  rawStatus: string,
): string {
  return `${providerCallId}:${sequence}:${rawStatus}`;
}

export function boundedRetryDelaySeconds(
  baseDelaySeconds: number,
  attemptNumber: number,
  maximumSeconds = 86_400,
): number {
  if (baseDelaySeconds < 1 || attemptNumber < 1 || maximumSeconds < 1) {
    throw new Error("Retry inputs must be positive");
  }
  return Math.min(maximumSeconds, baseDelaySeconds * 2 ** (attemptNumber - 1));
}
