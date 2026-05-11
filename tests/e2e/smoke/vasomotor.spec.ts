import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: create a vasomotor measurement with left/right temperatures
 * and confirm the computed delta surfaces. No photo upload is exercised in
 * smoke; that path needs a real file fixture and a longer wait.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Vasomotor measurement", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("entering both temps shows a computed delta", async ({ page }) => {
    await page.goto("/vasomotor/new", { waitUntil: "networkidle" });

    await page
      .getByRole("textbox", { name: /^site$/i })
      .first()
      .fill("knees");

    await page
      .getByRole("spinbutton", { name: /left temperature/i })
      .fill("30.4");
    await page
      .getByRole("spinbutton", { name: /right temperature/i })
      .fill("33.1");

    // The delta is rendered live as text on the form.
    await expect(page.getByText(/2\.70|2\.7\s*°c/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Save the row and confirm we land back on the list with a row visible.
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.waitForURL(/\/vasomotor(\?.*)?$/);
    await expect(page.getByText(/knees/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
