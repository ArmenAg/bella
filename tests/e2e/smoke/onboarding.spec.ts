import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: onboarding lives behind the authenticated app shell, so it
 * needs the seeded Supabase user. Keep this skipped unless Tier-2 is enabled.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("onboarding disclosure", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("renders disclosure bullets and acknowledge action", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("bella:onboarding-ack-v1");
    });
    await page.goto("/onboarding", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /privacy and what this is/i }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/family-controlled personal health record/i),
    ).toBeVisible();
    await expect(
      page.getByText(/private to invited family users/i),
    ).toBeVisible();
    await expect(page.getByText(/soft-deleted by default/i)).toBeVisible();
    await expect(
      page.getByText(/export every record at any time/i),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /i understand and want to continue/i }),
    ).toBeVisible();
  });
});
