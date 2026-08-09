import { expect, test } from "@playwright/test";

const STORAGE_KEY = "vesperwise-theme";

test("starts light, switches to dark, and remembers the choice", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 247, 242)");

  const darkToggle = page.getByRole("button", { name: "Switch to dark mode" });
  await expect(darkToggle).toBeVisible();
  await darkToggle.click();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(9, 10, 8)");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("light");

  await page.goto("/login?appearance-check=1");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("keeps login usable at 200 percent text scaling", async ({ page }) => {
  await page.goto("/login");
  await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });

  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("keeps the marketing experience and browser chrome dark", async ({ page }) => {
  await page.goto("/home");

  const marketingShell = page.locator("[data-theme-surface='marketing']");
  await expect(marketingShell).toHaveClass(/dark/);
  await expect(marketingShell).toHaveCSS("background-color", "rgb(9, 10, 8)");
  await expect(page.locator("meta[name='theme-color']")).toHaveAttribute("content", "#090a08");
});

test("serves the VesperWise favicon and PWA manifest", async ({ page, request }) => {
  await page.goto("/login");

  await expect(page.locator("link[rel='icon']")).toHaveAttribute("href", /favicon\.ico/);
  await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect((await request.get("/favicon.ico")).ok()).toBe(true);

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "VesperWise CRM",
    short_name: "VesperWise",
    background_color: "#f7f7f2",
  });
});
