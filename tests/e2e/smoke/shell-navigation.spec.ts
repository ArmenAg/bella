import { expect, test } from "@playwright/test";
import {
  primaryAuthStatePath,
  stampOnboardingAck,
  supabaseE2EEnabled,
} from "../auth";

/**
 * Tier-2: requires BELLA_E2E_SUPABASE=1 and a seeded local Supabase. Skipped
 * otherwise so the suite still passes on machines without Docker. The auth
 * state is created by global-setup (signs in the seeded primary user).
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("authenticated shell navigation", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test("dashboard loads and primary nav targets are reachable", async ({
    page,
  }) => {
    await stampOnboardingAck(page);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    for (const label of [
      "Pain log",
      "Notes",
      "Flare Mode",
      "Timeline",
      "Agent Mode",
      "Import Review",
      "Apple Health",
      "Export Packet",
    ]) {
      await expect(
        page.getByRole("link", { name: new RegExp(label, "i") }),
      ).toBeVisible();
    }
  });
});
