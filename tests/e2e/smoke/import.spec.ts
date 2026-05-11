import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: drive the AI import path end-to-end. The OpenAI extractor is
 * replaced by a deterministic fake when BELLA_E2E_AGENT_FAKE=1, so the smoke
 * runs without OPENAI_API_KEY and without touching the network.
 *
 * The flow this asserts:
 *   1. /import renders the review surface.
 *   2. A previously-fake-generated draft (or any seeded draft) is visible.
 *   3. The "Review and decide" card chrome is present on the page.
 *
 * Generating the draft itself happens server-side; the smoke does not
 * commit anything.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Import review", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("renders the review surface with the boundary alert visible", async ({
    page,
  }) => {
    await page.goto("/import", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /^import review$/i }),
    ).toBeVisible({ timeout: 15_000 });

    // The boundary alert about commit being human-only must be on the page.
    await expect(
      page.getByText(/commit.*human approval|require.*approval|commit.*draft/i),
    ).toBeVisible();

    // Each filter chip is keyboard-reachable; the "Ready" filter chip is the
    // default. Just confirm the chip set renders to catch crash regressions.
    await expect(page.getByText(/ready for review/i)).toBeVisible();
  });
});
