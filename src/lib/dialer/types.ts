export const NORMALIZED_CALL_STATUSES = [
  "queued",
  "initiating",
  "ringing",
  "answered",
  "completed",
  "busy",
  "no_answer",
  "cancelled",
  "failed",
] as const;

export type NormalizedCallStatus = (typeof NORMALIZED_CALL_STATUSES)[number];

export const TERMINAL_CALL_STATUSES = new Set<NormalizedCallStatus>([
  "completed",
  "busy",
  "no_answer",
  "cancelled",
  "failed",
]);

export interface ProviderInitiation {
  provider: string;
  accessToken: string;
  expiresAt: string;
  connectParams: Record<string, string>;
}

export interface DialerWebhookRequest {
  url: string;
  signature: string;
  params: Record<string, string>;
}

export interface NormalizedWebhookEvent {
  providerCallId: string;
  providerEventKey: string;
  providerSequence: number;
  eventType: string;
  status: NormalizedCallStatus;
  occurredAt: string;
  failureCode: string | null;
  failureReason: string | null;
  safePayload: Record<string, string | number | null>;
}

export interface ProviderCallStatus {
  providerCallId: string;
  status: NormalizedCallStatus;
  occurredAt: string;
  failureCode: string | null;
  failureReason: string | null;
}

export interface InitiateProviderCallInput {
  accountId: string;
  userId: string;
  attemptId: string;
}

export interface OutboundInstructionsInput {
  attemptId: string;
  toPhoneE164: string;
}

export interface DialerProvider {
  readonly id: string;
  initiateCall(input: InitiateProviderCallInput): Promise<ProviderInitiation>;
  cancelCall(accountId: string, providerCallIds: string[]): Promise<void>;
  getCallStatus(accountId: string, providerCallId: string): Promise<ProviderCallStatus>;
  validateWebhook(input: DialerWebhookRequest, accountId: string): Promise<boolean>;
  normalizeWebhookEvent(params: Record<string, string>): NormalizedWebhookEvent;
  createOutboundInstructions(
    input: OutboundInstructionsInput & { accountId: string },
  ): Promise<string>;
}

export class DialerProviderNotConfiguredError extends Error {
  constructor(accountId: string) {
    super(`Twilio credentials are not configured for account ${accountId}`);
    this.name = "DialerProviderNotConfiguredError";
  }
}

export interface PreparedDialerCall {
  callId: string;
  attemptId: string;
  status: NormalizedCallStatus;
  initiation: ProviderInitiation;
  contact: {
    id: string;
    name: string;
  };
  leadId: string | null;
}
