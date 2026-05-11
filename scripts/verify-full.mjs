#!/usr/bin/env node
/**
 * `npm run verify:full` orchestrator.
 *
 * The fast gates (`npm run verify`) always run. The slow gates only run when
 * the required prereqs are present, and we print a clear notice when they
 * skip so the gap is obvious instead of silent.
 *
 * Skippable gates:
 *   - `db:verify:local-postgres` — needs `initdb`/`pg_ctl`/`psql` from
 *     PostgreSQL 15. Set `PG_BIN=/path/to/pg15/bin` or have them on PATH.
 *   - `test:e2e` Tier-2 — needs `BELLA_E2E_SUPABASE=1` and a seeded local
 *     Supabase. Tier-1 smokes still run.
 */
import { execSync, spawnSync } from "node:child_process";

const ANSI = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function section(label) {
  console.log("");
  console.log(ANSI.cyan(`▸ ${label}`));
}

function run(command, options = {}) {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    console.error(ANSI.red(`✗ ${command} failed (exit ${result.status})`));
    process.exit(result.status ?? 1);
  }
}

function commandExists(bin) {
  const result = spawnSync("command", ["-v", bin], {
    shell: true,
    stdio: "ignore",
  });
  return result.status === 0;
}

function pg15Available() {
  if (process.env.PG_BIN) {
    try {
      execSync(`${process.env.PG_BIN}/postgres --version`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  if (commandExists("postgres") && commandExists("psql")) return true;
  // Common Homebrew paths.
  try {
    execSync("/opt/homebrew/opt/postgresql@15/bin/postgres --version", {
      stdio: "ignore",
    });
    return true;
  } catch {
    /* ignored */
  }
  try {
    execSync("/usr/local/opt/postgresql@15/bin/postgres --version", {
      stdio: "ignore",
    });
    return true;
  } catch {
    /* ignored */
  }
  return false;
}

// Fast gates first.
section("Fast gates (typecheck / lint / format / test / build)");
run("npm run verify");

// DB verifier.
section("SQL + RLS verifier (Postgres 15)");
if (!pg15Available()) {
  console.log(
    ANSI.yellow(
      "skipped — PostgreSQL 15 not found. Install with `brew install postgresql@15` " +
        "(macOS) or set PG_BIN to its bin directory.",
    ),
  );
} else {
  run("npm run db:verify:local-postgres");
}

// Playwright Tier-1 always; Tier-2 only when env says so.
section("Playwright smokes");
if (process.env.BELLA_E2E_SUPABASE === "1") {
  console.log(
    ANSI.dim(
      "Tier-2 enabled (BELLA_E2E_SUPABASE=1). " +
        "Make sure `npx supabase start && npx supabase db reset && npm run supabase:seed` " +
        "has run.",
    ),
  );
} else {
  console.log(
    ANSI.dim(
      "Tier-1 only. Set BELLA_E2E_SUPABASE=1 (with a seeded local Supabase) " +
        "to also run Tier-2 smokes.",
    ),
  );
}
run("npm run test:e2e");

console.log("");
console.log(ANSI.green("✓ verify:full passed"));
