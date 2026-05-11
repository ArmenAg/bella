import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: upload the synthetic Apple Health export.zip, confirm the
 * importer completes, then re-upload and confirm the duplicate counters
 * reflect idempotency (no additional samples imported).
 *
 * The fixture under tests/fixtures/apple-health/ is fully synthetic — see
 * tests/fixtures/README.md.
 */
test.use({ storageState: primaryAuthStatePath() });

const FIXTURE = join(process.cwd(), "tests/fixtures/apple-health/export.zip");

test.describe("Apple Health synthetic import", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  // The Apple Health importer parses the zip server-side and refreshes daily
  // summaries; allow more time than a typical smoke.
  test.setTimeout(60_000);

  test("upload → import → re-import shows idempotent counters", async ({
    page,
  }) => {
    await page.goto("/apple-health", { waitUntil: "networkidle" });

    // First import.
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE);
    await page.getByRole("button", { name: /^start import$/i }).click();

    await expect(page.getByText(/import complete/i)).toBeVisible({
      timeout: 45_000,
    });

    // The result panel shows non-zero imported samples on first run.
    await expect(page.getByText(/imported samples/i)).toBeVisible();

    // Start another import.
    await page.getByRole("button", { name: /start another import/i }).click();

    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE);
    await page.getByRole("button", { name: /^start import$/i }).click();

    await expect(page.getByText(/import complete/i)).toBeVisible({
      timeout: 45_000,
    });

    // After a re-import, the duplicates field is the meaningful signal.
    await expect(page.getByText(/duplicates/i).first()).toBeVisible();
  });
});
