import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: start a flare, add a checkpoint, end it. Asserts the active
 * banner appears + the end-summary renders. Requires seeded local Supabase.
 *
 * Demo data may have an active flare seeded already; this test handles both
 * starting state. If a flare is already active it skips the start step.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Flare lifecycle", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("start → checkpoint → end shows the summary", async ({ page }) => {
    await page.goto("/flare", { waitUntil: "networkidle" });

    const activeSummary = page.getByText(/active flare/i).first();
    const startButton = page.getByRole("button", { name: /^start flare$/i });

    // If the seed doesn't already have an active flare, start one.
    if (!(await activeSummary.isVisible().catch(() => false))) {
      const title = `Smoke flare ${Date.now()}`;
      await page
        .getByRole("textbox", { name: /^title$/i })
        .first()
        .fill(title);
      await startButton.click();
      await expect(activeSummary).toBeVisible({ timeout: 15_000 });
    }

    // Add a checkpoint. The composer is inline in the active-flare view; the
    // chip group lets the user pick a checkpoint type. We pick whatever is
    // selected by default and submit.
    const addCheckpointButton = page.getByRole("button", {
      name: /^add checkpoint$/i,
    });
    await addCheckpointButton.click();

    // End the flare via the destructive button and confirm modal.
    await page.getByRole("button", { name: /^end flare$/i }).click();
    await page
      .getByRole("button", { name: /end flare/i })
      .last()
      .click();

    await expect(
      page.getByRole("heading", { name: /flare summary/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
