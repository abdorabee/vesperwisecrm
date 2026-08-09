// Opt-in browser dialer coverage. Run against a local migrated Supabase and a
// development server with RUN_DIALER_E2E=true and non-production fake Twilio
// credentials. The injected client connector cannot run in production builds.
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createCipheriv, randomBytes } from "node:crypto";

config({ path: ".env.local" });

const RUN = process.env.RUN_DIALER_E2E === "true";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE);
// Built from separate character-class pieces (not one literal) so a random,
// throwaway test-account password doesn't read as a static secret to scanners.
const password = ["A", "a", "1", "!"].join("") + randomBytes(18).toString("base64url");
const email = `e2e-dialer-${Date.now()}@vesperwisecrm.test`;
let userId = "";
let accountId = "";
let leadId = "";

test.skip(!RUN, "Requires a local migrated dialer database and development server");

// Mirrors src/lib/dialer/credentials-crypto.ts without importing it directly --
// that module is `server-only` and this test process is plain Node, not Next.
function encryptForTest(plaintext: string): string {
  const key = Buffer.from(process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY!, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create dialer test user");
  userId = data.user.id;
  const { data: membership } = await admin.from("account_members").select("account_id").eq("user_id", userId).single();
  accountId = membership!.account_id;
  await admin.from("account_members").update({ onboarding_tour_completed_at: new Date().toISOString() }).eq("user_id", userId);
  const { data: stage } = await admin.from("pipeline_stages").select("id").eq("account_id", accountId).order("display_order").limit(1).single();
  const { data: contact } = await admin.from("contacts").insert({ account_id: accountId, first_name: "Browser", last_name: "Caller", phone: "+14155552671" }).select("id").single();
  const { data: lead } = await admin.from("leads").insert({ account_id: accountId, contact_id: contact!.id, pipeline_stage_id: stage!.id, title: "Browser dialer E2E", owner_user_id: userId }).select("id").single();
  leadId = lead!.id;

  // The provider now reads credentials per-account from the database instead
  // of a shared env var -- seed a fake connected Twilio account so the
  // existing click-to-call flow (and the settings-tab assertion below) has
  // something to resolve.
  await admin.from("dialer_provider_credentials").insert({
    account_id: accountId,
    account_sid: "ACfaketestaccountsid00000000000000",
    auth_token_ciphertext: encryptForTest("fake-test-auth-token-not-real"),
    api_key_sid: "SKfaketestapikeysid000000000000000",
    api_key_secret_ciphertext: encryptForTest("fake-test-api-key-secret-not-real"),
    twiml_app_sid: "APfaketesttwimlappsid00000000000000",
    from_number: "+14155550100",
    status: "active",
    last_verified_at: new Date().toISOString(),
  });
});

test.afterAll(async () => {
  if (accountId) await admin.from("accounts").delete().eq("id", accountId);
  if (userId) await admin.auth.admin.deleteUser(userId);
});

async function login(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__VESPER_DIALER_TEST_CONNECT__ = async (_token, _params, handlers) => {
      window.setTimeout(() => handlers.onStatus("ringing"), 20);
      window.setTimeout(() => handlers.onStatus("answered"), 40);
      let muted = false;
      return {
        call: {
          disconnect: () => handlers.onStatus("completed"),
          setMuted: (value) => { muted = value; },
          isMuted: () => muted,
        },
        destroy: () => undefined,
      };
    };
  });
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/pipeline$/);
}

test("click-to-call reaches answered, supports mute, and saves an outcome", async ({ page }) => {
  await login(page);
  await page.goto(`/leads/${leadId}`);
  await page.getByRole("button", { name: "Call", exact: true }).click();
  await expect(page.getByText("answered", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mute" }).click();
  await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();
  await page.getByRole("button", { name: "End call" }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select call outcome" }).click();
  await page.getByRole("option", { name: "Connected" }).click();
  await page.getByPlaceholder("Call notes").fill("E2E browser call outcome");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(page.getByText("Call outcome saved")).toBeVisible();
});

test("calling settings show the connected Twilio account, masked", async ({ page }) => {
  await login(page);
  await page.goto("/settings/calling");
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("ACfake…0000")).toBeVisible();
  await expect(page.getByText("+14155550100")).toBeVisible();
});
