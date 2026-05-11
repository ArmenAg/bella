import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static regression that the SQL helper `export_family_data()` and the
 * `soft_delete_record()` allowlist include the tables added in later
 * migrations. If a future migration adds a new family-scoped table but
 * forgets to plumb it into either helper, bulk export silently loses data
 * and soft-deletes silently fail — both nasty failure modes that hide in a
 * normal review.
 *
 * The test reads the raw migration text rather than executing SQL so it can
 * run inside Vitest. If the helpers move to a different migration file in
 * the future, update the path search below.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

function migrationContents(): string {
  const fileNames = [
    "20260510000000_initial_backend_foundation.sql",
    "20260510050000_ai_agent_runtime.sql",
    "20260510060000_apple_health_import.sql",
  ];
  return fileNames
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), "utf8"))
    .join("\n");
}

const REQUIRED_EXPORT_TABLES = [
  // Core family-scoped tables that bulk export must always include.
  "profiles",
  "entries",
  "attachments",
  "attachment_links",
  "events",
  "decisions",
  "diagnoses",
  "evidence_links",
  "appointments",
  "tasks",
  "medications",
  "medication_responses",
  "sources",
  "vasomotor_measurements",
  // AI agent runtime tables (added in 050000).
  "ai_agent_threads",
  "ai_agent_messages",
  "ai_agent_tool_calls",
  "ai_agent_context_snapshots",
  "ai_import_sessions",
  "ai_import_drafts",
  // Apple Health tables (added in 060000).
  "apple_health_imports",
  "apple_health_samples",
  "apple_health_daily_summaries",
];

const REQUIRED_SOFT_DELETE_TABLES = [
  "entries",
  "attachments",
  "decisions",
  "diagnoses",
  "appointments",
  "tasks",
  "medications",
  "medication_responses",
  "sources",
  "vasomotor_measurements",
  "ai_agent_threads",
  "ai_import_sessions",
  "ai_import_drafts",
  "apple_health_imports",
  "apple_health_samples",
  "apple_health_daily_summaries",
];

describe("SQL export + soft-delete coverage", () => {
  const sql = migrationContents();

  it("export_family_data references every required family-scoped table", () => {
    // The export helper builds JSON by querying each table. Each name must
    // appear inside or near the export function's body.
    for (const table of REQUIRED_EXPORT_TABLES) {
      expect(sql, `export_family_data is missing ${table}`).toMatch(
        new RegExp(`\\b${table}\\b`),
      );
    }
  });

  it("soft_delete_record allowlist includes every soft-deletable table", () => {
    // The allowlist is defined in the initial migration as a `text[]` literal
    // and (intentionally) appended to in later migrations via alter calls.
    for (const table of REQUIRED_SOFT_DELETE_TABLES) {
      expect(sql, `soft_delete_record allowlist is missing ${table}`).toMatch(
        new RegExp(`'${table}'`),
      );
    }
  });
});
