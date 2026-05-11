import { expect, test } from "@playwright/test";

/**
 * Tier-1 smoke: no Supabase required. The offline fallback is public and must
 * stay generic, mobile-friendly, and free of private record content.
 */
test.describe("offline fallback", () => {
  test("renders generic offline copy and dashboard return link", async ({
    page,
  }) => {
    await page.goto("/offline");

    await expect(page.getByRole("heading", { name: "Offline" })).toBeVisible();
    await expect(
      page.getByText("Open the app again when the connection is back."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
