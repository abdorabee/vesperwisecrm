// End-to-end coverage for first-run onboarding: a fresh user sees the
// centered tour, can move through steps, can persist completion, and can
// replay it later from Settings without resetting the saved flag.
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const EMAIL = `e2e-onboarding-tour-${Date.now()}@vesperwisecrm.test`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let userId: string;
let accountId: string;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  userId = data.user.id;

  const { data: member } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .single();
  accountId = member!.account_id;
});

test.afterAll(async () => {
  if (accountId) {
    await admin.from("accounts").delete().eq("id", accountId);
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
});

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/pipeline$/, { timeout: 10_000 });
}

test("first-run tour persists completion and can be replayed", async ({ page }) => {
  await login(page);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Intake" })).toBeVisible();
  await expect(dialog.getByText("Step 1 of 8")).toBeVisible();

  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Pipeline & Leads" }),
  ).toBeVisible();
  await expect(dialog.getByText("Step 2 of 8")).toBeVisible();

  await dialog.getByRole("button", { name: "Back" }).click();
  await expect(dialog.getByRole("heading", { name: "Intake" })).toBeVisible();

  await dialog.getByRole("button", { name: "Skip" }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.goto("/settings/profile");
  await page.getByRole("button", { name: "Replay tour" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Intake" }),
  ).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.goto("/");
  await page.reload();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
