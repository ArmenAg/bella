import { defineConfig, devices } from "@playwright/test";

/**
 * Bella Care Tracker — Playwright config.
 *
 * Defaults to running against a locally-running dev server (`npm run dev`).
 * Tests opt into Supabase-backed flows by checking the `BELLA_E2E_SUPABASE`
 * env var; without it, only no-Supabase smokes run. See
 * docs/qa/TESTING_STRATEGY.md for the full setup.
 */

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BELLA_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const REUSE_SERVER = !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: REUSE_SERVER,
    timeout: 120_000,
    env: {
      // Keep dev server pointed at whatever the local env already configured.
      // Tests that need Supabase will use BELLA_E2E_SUPABASE to gate.
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-placeholder",
    },
  },
});
