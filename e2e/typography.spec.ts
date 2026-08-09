import { expect, test } from "@playwright/test";

test("uses the established Geist product typeface", async ({ page }) => {
  await page.goto("/login");

  const fontFamily = await page.locator("html").evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );

  expect(fontFamily).toContain("Geist");
  expect(fontFamily).not.toBe("Times");
});
