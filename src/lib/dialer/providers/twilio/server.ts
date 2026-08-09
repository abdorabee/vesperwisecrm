import "server-only";

import twilio from "twilio";
import { getDialerConfig } from "@/lib/dialer/config";
import { decryptDialerSecret } from "@/lib/dialer/credentials-crypto";
import type {
  DialerProvider,
  DialerWebhookRequest,
  InitiateProviderCallInput,
  NormalizedCallStatus,
  NormalizedWebhookEvent,
  OutboundInstructionsInput,
  ProviderCallStatus,
  ProviderInitiation,
} from "@/lib/dialer/types";
import { DialerProviderNotConfiguredError } from "@/lib/dialer/types";
import { providerEventKey } from "@/lib/dialer/state-machine";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  fromNumber: string;
}

async function credentialsForAccount(accountId: string): Promise<TwilioCredentials> {
  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("dialer_provider_credentials")
    .select(
      "account_sid, auth_token_ciphertext, api_key_sid, api_key_secret_ciphertext, twiml_app_sid, from_number",
    )
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !row) {
    throw new DialerProviderNotConfiguredError(accountId);
  }

  return {
    accountSid: row.account_sid,
    authToken: decryptDialerSecret(row.auth_token_ciphertext),
    apiKeySid: row.api_key_sid,
    apiKeySecret: decryptDialerSecret(row.api_key_secret_ciphertext),
    twimlAppSid: row.twiml_app_sid,
    fromNumber: row.from_number,
  };
}

export function normalizeTwilioCallStatus(status: string): NormalizedCallStatus {
  switch (status) {
    case "queued":
    case "initiated":
      return "initiating";
    case "ringing":
      return "ringing";
    case "in-progress":
      return "answered";
    case "completed":
      return "completed";
    case "busy":
      return "busy";
    case "no-answer":
      return "no_answer";
    case "canceled":
      return "cancelled";
    default:
      return "failed";
  }
}

export function twilioIdentityFor(accountId: string, userId: string): string {
  return `acct_${accountId.replaceAll("-", "")}_user_${userId.replaceAll("-", "")}`;
}

function safeSequence(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function safeOccurredAt(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export class TwilioDialerProvider implements DialerProvider {
  readonly id = "twilio";

  async initiateCall(
    input: InitiateProviderCallInput,
  ): Promise<ProviderInitiation> {
    const creds = await credentialsForAccount(input.accountId);
    const ttlSeconds = 300;
    const token = new twilio.jwt.AccessToken(
      creds.accountSid,
      creds.apiKeySid,
      creds.apiKeySecret,
      {
        identity: twilioIdentityFor(input.accountId, input.userId),
        ttl: ttlSeconds,
      },
    );
    token.addGrant(
      new twilio.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: creds.twimlAppSid,
        incomingAllow: false,
      }),
    );

    return {
      provider: this.id,
      accessToken: token.toJwt(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      connectParams: { attemptId: input.attemptId },
    };
  }

  async validateWebhook(input: DialerWebhookRequest, accountId: string): Promise<boolean> {
    const creds = await credentialsForAccount(accountId);
    return twilio.validateRequest(
      creds.authToken,
      input.signature,
      input.url,
      input.params,
    );
  }

  normalizeWebhookEvent(
    params: Record<string, string>,
  ): NormalizedWebhookEvent {
    const providerCallId = params.CallSid ?? "";
    const providerSequence = safeSequence(params.SequenceNumber);
    const rawStatus = params.CallStatus ?? "failed";
    const status = normalizeTwilioCallStatus(rawStatus);
    const failureCode = params.ErrorCode || null;

    return {
      providerCallId,
      providerEventKey: providerEventKey(providerCallId, providerSequence, rawStatus),
      providerSequence,
      eventType: `twilio.${rawStatus}`,
      status,
      occurredAt: safeOccurredAt(params.Timestamp),
      failureCode,
      failureReason: failureCode ? `Twilio error ${failureCode}` : null,
      safePayload: {
        call_sid: providerCallId,
        call_status: rawStatus,
        sequence_number: providerSequence,
        direction: params.Direction ?? null,
        call_duration: params.CallDuration ? Number(params.CallDuration) : null,
        error_code: failureCode,
      },
    };
  }

  async createOutboundInstructions(
    input: OutboundInstructionsInput & { accountId: string },
  ): Promise<string> {
    const config = getDialerConfig();
    const creds = await credentialsForAccount(input.accountId);
    const response = new twilio.twiml.VoiceResponse();
    const dial = response.dial({
      answerOnBridge: true,
      callerId: creds.fromNumber,
      timeout: 30,
    });
    dial.number(
      {
        statusCallback: `${config.publicBaseUrl}/api/webhooks/dialer/twilio/status?attemptId=${encodeURIComponent(input.attemptId)}`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      },
      input.toPhoneE164,
    );
    return response.toString();
  }

  async cancelCall(accountId: string, providerCallIds: string[]): Promise<void> {
    const creds = await credentialsForAccount(accountId);
    const client = twilio(creds.accountSid, creds.authToken);
    for (const callId of [...new Set(providerCallIds.filter(Boolean))]) {
      const call = await client.calls(callId).fetch();
      if (["completed", "busy", "failed", "no-answer", "canceled"].includes(call.status)) {
        continue;
      }
      await client.calls(callId).update({
        status: call.status === "in-progress" ? "completed" : "canceled",
      });
    }
  }

  async getCallStatus(accountId: string, providerCallId: string): Promise<ProviderCallStatus> {
    const creds = await credentialsForAccount(accountId);
    const call = await twilio(creds.accountSid, creds.authToken)
      .calls(providerCallId)
      .fetch();
    return {
      providerCallId,
      status: normalizeTwilioCallStatus(call.status),
      occurredAt: call.endTime?.toISOString() ?? call.startTime?.toISOString() ?? new Date().toISOString(),
      failureCode: null,
      failureReason: null,
    };
  }
}
