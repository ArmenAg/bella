import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { primaryAuthStatePath, supabaseE2EEnabled } from "./auth";

/**
 * Sign in to the seeded local Supabase as the demo primary user and snapshot
 * cookies/localStorage into the storageState file. Used by Tier-2 smokes.
 *
 * Tier-1 smokes do not require this; we still skip the heavy lifting when
 * BELLA_E2E_SUPABASE is unset so the suite passes without Docker.
 *
 * Credentials default to the demo seed (see supabase/seed/002_demo.sql):
 *   email     bella.demo@example.test
 *   password  local-demo-password
 *
 * Override either with BELLA_E2E_PRIMARY_EMAIL / BELLA_E2E_PRIMARY_PASSWORD.
 */
export default async function globalSetup() {
  if (!supabaseE2EEnabled()) {
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email =
    process.env.BELLA_E2E_PRIMARY_EMAIL ?? "bella.demo@example.test";
  const password =
    process.env.BELLA_E2E_PRIMARY_PASSWORD ?? "local-demo-password";

  if (!url || !anon) {
    throw new Error(
      "BELLA_E2E_SUPABASE=1 requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  if (!password) {
    throw new Error(
      "BELLA_E2E_SUPABASE=1 needs a seeded primary password. The demo seed " +
        "uses `local-demo-password`; override with BELLA_E2E_PRIMARY_PASSWORD.",
    );
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(
      `Could not sign in seeded user (${email}): ${error?.message ?? "no session"}`,
    );
  }

  const statePath = primaryAuthStatePath();
  await mkdir(dirname(statePath), { recursive: true });

  // Build a minimal Playwright storageState: cookies + localStorage. We
  // place the Supabase session in the storage bucket the SSR client reads,
  // so server components see the authenticated user. The exact cookie name
  // depends on the Supabase URL host; we set both `sb-access-token` and
  // `sb-refresh-token` formats that @supabase/ssr expects.
  const host = new URL(url).host;
  const cookies = [
    {
      name: `sb-${host.replace(/\./g, "-")}-auth-token`,
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      }),
      domain: "127.0.0.1",
      path: "/",
      expires: data.session.expires_at ?? -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    },
  ];

  const localStorageEntries = [
    {
      name: "bella:onboarding-ack-v1",
      value: "true",
    },
  ];

  await writeFile(
    statePath,
    JSON.stringify(
      {
        cookies,
        origins: [
          {
            origin: "http://127.0.0.1:3000",
            localStorage: localStorageEntries,
          },
        ],
      },
      null,
      2,
    ),
  );
}
