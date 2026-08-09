import { beforeAll, describe, expect, test, vi } from "vitest";
import { randomBytes } from "node:crypto";
import twilio from "twilio";

vi.mock("server-only", () => ({}));

const TEST_ACCOUNT_ID = "16b9c94a-11cd-4cc9-b084-b57c8bab14cf";
const OTHER_ACCOUNT_ID = "9b1f6c2a-5e3d-4b8a-8f0a-7d2c1e4a6b9c";
const UNCONFIGURED_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

const ENV = {
  DIALER_ENABLED: "true",
  DIALER_PROVIDER: "twilio",
  DIALER_PUBLIC_BASE_URL: "https://crm.example.test",
  DIALER_CREDENTIALS_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};

const TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000";
const TWILIO_AUTH_TOKEN = "test-auth-token";
const TWILIO_API_KEY_SID = "SK00000000000000000000000000000000";
const TWILIO_API_KEY_SECRET = "test-api-secret";
const TWILIO_TWIML_APP_SID = "AP00000000000000000000000000000000";
const TWILIO_VOICE_FROM_NUMBER = "+14155550100";

const OTHER_TWILIO_AUTH_TOKEN = "other-tenant-auth-token";

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => {
        const filters: Record<string, string> = {};
        const builder = {
          eq(key: string, value: string) {
            filters[key] = value;
            return builder;
          },
          async maybeSingle() {
            if (filters.account_id === TEST_ACCOUNT_ID && filters.status === "active") {
              return {
                data: {
                  account_sid: TWILIO_ACCOUNT_SID,
                  auth_token_ciphertext: encryptedAuthToken,
                  api_key_sid: TWILIO_API_KEY_SID,
                  api_key_secret_ciphertext: encryptedApiKeySecret,
                  twiml_app_sid: TWILIO_TWIML_APP_SID,
                  from_number: TWILIO_VOICE_FROM_NUMBER,
                },
                error: null,
              };
            }
            if (filters.account_id === OTHER_ACCOUNT_ID && filters.status === "active") {
              return {
                data: {
                  account_sid: TWILIO_ACCOUNT_SID,
                  auth_token_ciphertext: encryptedOtherAuthToken,
                  api_key_sid: TWILIO_API_KEY_SID,
                  api_key_secret_ciphertext: encryptedApiKeySecret,
                  twiml_app_sid: TWILIO_TWIML_APP_SID,
                  from_number: TWILIO_VOICE_FROM_NUMBER,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        };
        return builder;
      },
    }),
  }),
}));

let TwilioDialerProvider: typeof import("../src/lib/dialer/providers/twilio/server").TwilioDialerProvider;
let normalizeTwilioCallStatus: typeof import("../src/lib/dialer/providers/twilio/server").normalizeTwilioCallStatus;
let DialerProviderNotConfiguredError: typeof import("../src/lib/dialer/types").DialerProviderNotConfiguredError;
let encryptedAuthToken: string;
let encryptedApiKeySecret: string;
let encryptedOtherAuthToken: string;

beforeAll(async () => {
  Object.assign(process.env, ENV);
  const { encryptDialerSecret } = await import("../src/lib/dialer/credentials-crypto");
  encryptedAuthToken = encryptDialerSecret(TWILIO_AUTH_TOKEN);
  encryptedApiKeySecret = encryptDialerSecret(TWILIO_API_KEY_SECRET);
  encryptedOtherAuthToken = encryptDialerSecret(OTHER_TWILIO_AUTH_TOKEN);

  const providerModule = await import("../src/lib/dialer/providers/twilio/server");
  TwilioDialerProvider = providerModule.TwilioDialerProvider;
  normalizeTwilioCallStatus = providerModule.normalizeTwilioCallStatus;
  DialerProviderNotConfiguredError = (await import("../src/lib/dialer/types")).DialerProviderNotConfiguredError;
});

describe("Twilio dialer adapter", () => {
  test("maps provider statuses to the normalized domain", () => {
    expect(normalizeTwilioCallStatus("in-progress")).toBe("answered");
    expect(normalizeTwilioCallStatus("no-answer")).toBe("no_answer");
    expect(normalizeTwilioCallStatus("canceled")).toBe("cancelled");
    expect(normalizeTwilioCallStatus("provider-new-error")).toBe("failed");
  });

  test("mints a short-lived outgoing-only browser token using the account's own credentials", async () => {
    const initiation = await new TwilioDialerProvider().initiateCall({
      accountId: TEST_ACCOUNT_ID,
      userId: "2c724e40-fd6f-4f14-86bb-ecf948fd37ee",
      attemptId: "ccdc0cc5-96fe-4448-837c-0d7213aa620b",
    });
    const payload = JSON.parse(Buffer.from(initiation.accessToken.split(".")[1], "base64url").toString("utf8"));
    expect(initiation.provider).toBe("twilio");
    expect(payload.grants.voice.outgoing.application_sid).toBe(TWILIO_TWIML_APP_SID);
    expect(payload.grants.voice.incoming).toBeUndefined();
    expect(payload.exp - payload.iat).toBe(300);
    expect(initiation.connectParams).toEqual({ attemptId: "ccdc0cc5-96fe-4448-837c-0d7213aa620b" });
  });

  test("throws DialerProviderNotConfiguredError when the account has no connected Twilio credentials", async () => {
    await expect(
      new TwilioDialerProvider().initiateCall({
        accountId: UNCONFIGURED_ACCOUNT_ID,
        userId: "2c724e40-fd6f-4f14-86bb-ecf948fd37ee",
        attemptId: "ccdc0cc5-96fe-4448-837c-0d7213aa620b",
      }),
    ).rejects.toBeInstanceOf(DialerProviderNotConfiguredError);
  });

  test("validates official Twilio request signatures against the account's own auth token", async () => {
    const url = "https://crm.example.test/api/webhooks/dialer/twilio/status?attemptId=abc";
    const params = { CallSid: "CA123", CallStatus: "ringing", SequenceNumber: "2" };
    const signature = twilio.getExpectedTwilioSignature(TWILIO_AUTH_TOKEN, url, params);
    const provider = new TwilioDialerProvider();
    expect(await provider.validateWebhook({ url, params, signature }, TEST_ACCOUNT_ID)).toBe(true);
    expect(await provider.validateWebhook({ url, params: { ...params, CallStatus: "completed" }, signature }, TEST_ACCOUNT_ID)).toBe(false);
  });

  test("does not accept a signature valid for one tenant when validating against a different tenant's attempt", async () => {
    const url = "https://crm.example.test/api/webhooks/dialer/twilio/status?attemptId=abc";
    const params = { CallSid: "CA999", CallStatus: "ringing", SequenceNumber: "1" };
    const signatureForOtherTenant = twilio.getExpectedTwilioSignature(OTHER_TWILIO_AUTH_TOKEN, url, params);
    const provider = new TwilioDialerProvider();
    // Signed with account B's auth token, validated against account A -- must fail, proving
    // per-tenant signature validation actually binds to the right tenant's secret.
    expect(await provider.validateWebhook({ url, params, signature: signatureForOtherTenant }, TEST_ACCOUNT_ID)).toBe(false);
    expect(await provider.validateWebhook({ url, params, signature: signatureForOtherTenant }, OTHER_ACCOUNT_ID)).toBe(true);
  });

  test("normalizes callbacks without retaining sensitive fields", () => {
    const event = new TwilioDialerProvider().normalizeWebhookEvent({
      CallSid: "CA123",
      CallStatus: "busy",
      SequenceNumber: "7",
      From: "+14155550100",
      To: "+14155550199",
      ErrorCode: "31480",
    });
    expect(event).toMatchObject({
      providerCallId: "CA123",
      providerEventKey: "CA123:7:busy",
      providerSequence: 7,
      status: "busy",
      failureCode: "31480",
    });
    expect(event.safePayload).not.toHaveProperty("From");
    expect(event.safePayload).not.toHaveProperty("To");
  });

  test("builds TwiML with a server-resolved destination and signed callback target", async () => {
    const xml = await new TwilioDialerProvider().createOutboundInstructions({
      attemptId: "ccdc0cc5-96fe-4448-837c-0d7213aa620b",
      toPhoneE164: "+14155550199",
      accountId: TEST_ACCOUNT_ID,
    });
    expect(xml).toContain("+14155550199");
    expect(xml).toContain("/api/webhooks/dialer/twilio/status?attemptId=ccdc0cc5-96fe-4448-837c-0d7213aa620b");
    expect(xml).toContain("statusCallbackEvent=\"initiated ringing answered completed\"");
  });
});
