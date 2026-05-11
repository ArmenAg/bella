import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: create a pain entry as the seeded primary, then assert it
 * appears in the Pain Book list. Requires a seeded local Supabase; auto-skips
 * otherwise so the suite still passes on machines without Docker.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Pain Book entry", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("creating a pain entry surfaces it in the list", async ({ page }) => {
    const title = `Smoke pain entry ${Date.now()}`;
    const notes = "Synthetic smoke note — no real PHI.";

    await page.goto("/pain-book/new", { waitUntil: "networkidle" });

    await page
      .getByRole("textbox", { name: /^title$/i })
      .first()
      .fill(title);

    // Notes is the second textarea on the form; fill via its accessible name.
    await page
      .getByRole("textbox", { name: /^notes$/i })
      .first()
      .fill(notes);

    await page.getByRole("button", { name: /^save$/i }).click();

    await page.waitForURL(/\/pain-book(\?.*)?$/);
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});
