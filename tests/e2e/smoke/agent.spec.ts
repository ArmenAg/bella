import { expect, test } from "@playwright/test";
import { primaryAuthStatePath, supabaseE2EEnabled } from "../auth";

/**
 * Tier-2 smoke: create an agent thread, send a message, confirm the assistant
 * turn renders. The OpenAI client is replaced by a deterministic fake when
 * BELLA_E2E_AGENT_FAKE=1 is set, so this never reaches the network and never
 * requires OPENAI_API_KEY.
 */
test.use({ storageState: primaryAuthStatePath() });

test.describe("Agent thread", () => {
  test.skip(
    !supabaseE2EEnabled() || process.env.BELLA_E2E_AGENT_FAKE !== "1",
    "Set BELLA_E2E_SUPABASE=1 and BELLA_E2E_AGENT_FAKE=1 to run this.",
  );

  test.setTimeout(45_000);

  test("creating a thread and sending a message renders the assistant turn", async ({
    page,
  }) => {
    await page.goto("/agent", { waitUntil: "networkidle" });

    // Start a new thread via the header CTA.
    await page
      .getByRole("button", { name: /^new thread$/i })
      .click()
      .catch(() => {
        // The button text may collapse to "New" on narrow viewports.
        return page.getByRole("button", { name: /^new$/i }).first().click();
      });

    await page
      .getByRole("textbox", { name: /^title$/i })
      .first()
      .fill(`Smoke thread ${Date.now()}`);
    await page.getByRole("button", { name: /^start thread$/i }).click();

    // Send a synthetic prompt; the fake returns a static assistant turn.
    await page
      .getByPlaceholder(/ask the agent/i)
      .fill("Synthetic e2e prompt — please respond.");
    await page.getByRole("button", { name: /^send$/i }).click();

    await expect(page.getByText(/\[fake agent response\]/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
