# BE-000 Tooling And CI Baseline

## Decisions

- Framework: Next.js App Router with TypeScript.
- Styling: Tailwind CSS with shadcn/ui-ready aliases, CSS variables, and
  `src/components/ui`.
- Data and migrations: raw Supabase SQL migrations.
- Data access: typed server services and server actions; frontend code does not
  import or call Supabase directly.
- Validation: Zod contracts in `src/server/contracts`.
- Tests: Vitest for unit and static SQL coverage.
- E2E: Playwright browser smoke tests are deferred until the app has a stable
  browser login/auth-state setup. The target smoke flows are documented in
  `docs/qa/RELEASE_FOLLOWUP.md`.
- Formatting and linting: Prettier and ESLint.
- CI: `.github/workflows/ci.yml` runs install, typecheck, lint, and tests from
  the `app/` working directory.
- Deploy flow: Vercel previews should run `npm run build` from `app/` with the
  Supabase environment variables from `.env.example`.

## Required Scripts

Implemented in `package.json`:

- `dev`
- `build`
- `typecheck`
- `lint`
- `format`
- `test`

## Migration Workflow

Use raw SQL migrations under `supabase/migrations/`.

Local reset:

```bash
npx supabase start
npx supabase db reset
npm run supabase:seed
npm run supabase:verify
```

Local Supabase requires Docker Desktop. Start Docker before `npx supabase
start`; the first start can pull large Supabase containers.

The `supabase:seed` and `supabase:verify` scripts run multi-statement SQL files
through `scripts/run-supabase-sql.sh`, which executes `psql` inside the running
local Supabase database container. This avoids requiring a separate host `psql`
install and keeps verification tied to the Supabase stack.

`supabase:seed` loads reference data, demo fixtures, the idempotent
diagnostic-tree import scaffold, and the historical workspace import scaffold
in order.

Production migration:

```bash
supabase db push
```

Docker-free SQL verification fallback:

```bash
npm run db:verify:local-postgres
```

This runs all migrations, all seed files twice, and the RLS verifier against a
temporary PostgreSQL 15 cluster with Supabase auth/storage stubs. It requires
PostgreSQL 15 binaries on `PATH`.

macOS example:

```bash
brew install postgresql@15
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

Generate Supabase TypeScript types after a local reset or remote link:

```bash
supabase gen types typescript --local > src/server/supabase/database.types.ts
```

The current service layer uses explicit DTO contracts instead of exposing
generated Supabase row types to the frontend.
