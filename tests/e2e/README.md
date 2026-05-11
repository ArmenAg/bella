# Playwright smoke tests

These tests verify high-value workflows end-to-end. They live in two tiers:

## Tier 1 — no Supabase needed (always-on)

Smokes that exercise the rendering layer with no live backend. Public fallback
pages, public redirects, and static unauthenticated surfaces are safe to run in
any environment.

Run:

```sh
npm run test:e2e
```

These run on every developer machine and in CI (once the Supabase-free dev
server is reachable).

## Tier 2 — Supabase-backed (`BELLA_E2E_SUPABASE=1`)

Smokes that exercise real authenticated workflows: dashboard, Pain Book,
Flare, Vasomotor, Agent, Import, Apple Health, Export. They require a local
Supabase instance with the demo seed loaded.

Prereqs:

1. `docker info` succeeds (Supabase containers need Docker).
2. From `app/`:
   ```sh
   npx supabase start
   npx supabase db reset
   npm run supabase:seed
   ```
3. Export Supabase env values into the test session (URL + anon key from
   `npx supabase status`).
4. Run with the flag:
   ```sh
   BELLA_E2E_SUPABASE=1 npm run test:e2e
   ```

## Auth state

Supabase-backed tests sign in by calling `signInWithPassword` against the
demo `primary@example.com` account from the seed and snapshotting cookies to
`tests/e2e/.auth/primary.json`. The helper lives in `tests/e2e/auth.ts`.
Production auth is unchanged — the helper uses the public Supabase JS
client, the same way a real user does, with seeded credentials.

The onboarding gate writes to `localStorage` (`bella:onboarding-ack-v1`).
The auth setup pre-stamps it so the gate doesn't bounce tests to the
disclosure screen.

## Layout

```
tests/e2e/
  README.md                        # this file
  auth.ts                          # signs in seeded primary, returns storageState path
  global-setup.ts                  # writes storageState used by Supabase-backed tests
  smoke/
    offline.spec.ts                # tier 1
    onboarding.spec.ts             # tier 2 (requires BELLA_E2E_SUPABASE)
    shell-navigation.spec.ts       # tier 2 (requires BELLA_E2E_SUPABASE)
    ...
```

## Rules

- No real PHI in tests. Use synthetic strings only. See
  `tests/fixtures/README.md`.
- Tests must be resilient: select on role/label/visible text, not CSS or
  layout positions.
- Tier-2 tests must early-return (skip) when `BELLA_E2E_SUPABASE` is not
  set, so the suite passes on machines without Docker.
