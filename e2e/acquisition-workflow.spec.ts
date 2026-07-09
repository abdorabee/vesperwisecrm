// End-to-end coverage of the core acquisition workflow: a cold caller
// submits a lead, a lead manager qualifies it, and it shows up correctly
// on the pipeline/queue with a follow-up task attached. Creates and tears
// down its own throwaway account via the Supabase service role.
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Generated per run, not hardcoded: this is a throwaway test account
// deleted in afterAll, but a fixed literal is still a bad habit to commit.
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const EMAIL = `e2e-acquisition-${Date.now()}@vesperwisecrm.test`;

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
    await admin.from("leads").delete().eq("account_id", accountId);
    await admin.from("contacts").delete().eq("account_id", accountId);
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
  await page.waitForURL(/\/(pipeline)?$/, { timeout: 10_000 });
}

test("cold caller submission is qualified and gets a follow-up task", async ({ page }) => {
  await login(page);

  // Caller submits a lead through the quick-intake form, using the exact
  // sample seller notes from the product brief.
  await page.goto("/intake");
  await page.fill("#intake-firstName", "Jane Seller");
  await page.fill("#intake-addressLine1", "412 Maple Street");
  await page.fill("#intake-phone", "555-201-8899");
  await page.click('button:has-text("Good")');
  await page.click('button:has-text("Owner occupied")');
  await page.fill("#intake-updatesDone", "New roof, new AC, new bathrooms");
  await page.fill("#intake-updatesNeeded", "Cosmetics and wall paint");
  await page.fill("#intake-askingPrice", "195000");
  await page.fill("#intake-motivation", "She is moving");
  await page.fill("#intake-timeline", "ASAP");
  await page.fill("#intake-followUpContact", "Call Jerry for future follow-ups");
  await page.getByRole("button", { name: "Submit lead" }).click();
  await expect(page.getByText("Lead submitted for review")).toBeVisible();

  // It lands in the lead manager queue with the intake data intact.
  await page.goto("/queue");
  await expect(page.getByText("412 Maple Street")).toBeVisible();
  await expect(page.getByText(/Condition: Good/)).toBeVisible();
  await expect(page.getByText(/\$195,000/)).toBeVisible();

  // Confirming routes it out of the queue.
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Lead qualified and routed to acquisitions")).toBeVisible();
  await expect(page.getByText("No submitted leads waiting on review.")).toBeVisible();

  // It now shows up on the pipeline as a real lead.
  await page.goto("/pipeline");
  await expect(page.getByText(/Jane Seller.*412 Maple Street/)).toBeVisible();
  await page.getByText(/Jane Seller.*412 Maple Street/).click();

  // Add a follow-up task so it never shows up on the "at risk" panel.
  await page.fill('input[placeholder="Next action"]', "Call to schedule inspection");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Task created")).toBeVisible();
  await expect(
    page.getByText("Call to schedule inspection", { exact: true }),
  ).toBeVisible();

  // The dashboard's no-lead-left-behind panel should not flag this lead
  // now that it has an open task (this is the only lead in the fresh test
  // account, so the whole "At risk" section should be gone).
  await page.goto("/");
  await expect(page.getByText("At risk — no next action")).not.toBeVisible();
});
