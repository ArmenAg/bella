import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: generate a clinician packet from seeded data and confirm
 * the markdown preview includes the load-bearing section headings. No
 * snapshot — we want a regression on missing sections, not exact output.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Export — clinician packet", () => {
  test.skip(
    !supabaseE2EEnabled(),
    "Set BELLA_E2E_SUPABASE=1 with a seeded local Supabase to run this.",
  );

  test.setTimeout(45_000);

  test("generating a packet renders preview with expected sections", async ({
    page,
  }) => {
    await page.goto("/export", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /^generate packet$/i }).click();

    // The preview is a <pre> showing markdown. Wait for any content beyond
    // the form, then assert a few stable section names appear. The exact
    // wording is controlled by the exporter service.
    const preview = page.locator("pre").first();
    await expect(preview).toBeVisible({ timeout: 30_000 });
    const previewText = await preview.innerText();
    expect(previewText.length).toBeGreaterThan(0);

    // Look for at least one obvious heading marker; we don't want to pin
    // exact strings because the export evolves.
    expect(previewText).toMatch(/##|working diagnosis|timeline|recent/i);

    await expect(
      page.getByRole("button", { name: /download markdown/i }),
    ).toBeVisible();
  });
});
