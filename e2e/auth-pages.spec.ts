import { expect, test } from "@playwright/test";

test("presents a focused login form with status feedback and a signup path", async ({
  page,
}) => {
  await page.goto("/login?message=Check%20your%20email&error=Could%20not%20sign%20in");

  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute(
    "href",
    "/home",
  );
  await expect(page.getByLabel("Work email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.getByLabel(/What best describes/)).toHaveCount(0);
  await expect(page.locator("[data-auth-panel]").getByRole("alert")).toContainText(
    "Could not sign in",
  );
  await expect(page.getByRole("status")).toContainText("Check your email");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/signup",
  );
});

test("keeps signup public and shows only account-creation fields", async ({ page }) => {
  await page.goto("/signup?error=Could%20not%20create%20account");

  await expect(page).toHaveURL(/\/signup/);
  await expect(page).toHaveTitle(/Create account/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveAttribute("name", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("name", "password");
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  await expect(page.getByLabel(/What best describes/)).toHaveAttribute("name", "niche");
  await expect(page.locator("[data-auth-panel]").getByRole("alert")).toContainText(
    "Could not create account",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

for (const route of ["/login", "/signup"] as const) {
  test(`${route} remains usable on mobile at 200 percent text scaling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });

    await expect(page.locator("main form")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });
}

test("signup honors appearance preferences and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/signup");

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const duration = getComputedStyle(
          document.querySelector("[data-auth-panel]")!,
        ).animationDuration;
        return duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;
      }),
    )
    .toBeLessThanOrEqual(0.01);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("login exposes a disabled pending state while authentication is in flight", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("operator@example.com");
  await page.getByLabel("Password").fill("temporary-password");

  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.abort();
  });

  const submit = page.getByRole("button", { name: "Sign in" });
  await submit.click({ noWaitAfter: true });

  await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
});
