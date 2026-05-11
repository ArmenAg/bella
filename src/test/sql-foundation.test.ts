import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readdirSync(join(root, "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(root, "supabase/migrations", file), "utf8"))
  .join("\n");
const referenceSeed = readFileSync(
  join(root, "supabase/seed/001_reference.sql"),
  "utf8",
);
const demoSeed = readFileSync(join(root, "supabase/seed/002_demo.sql"), "utf8");
const diagnosticTreeSeed = readFileSync(
  join(root, "supabase/seed/003_diagnostic_tree.sql"),
  "utf8",
);
const historicalImportSeed = readFileSync(
  join(root, "supabase/seed/004_historical_import.sql"),
  "utf8",
);
const rlsVerification = readFileSync(
  join(root, "supabase/tests/rls_verification.sql"),
  "utf8",
);

const requiredTables = [
  "roles",
  "profiles",
  "body_regions",
  "symptoms",
  "triggers",
  "entries",
  "entry_regions",
  "entry_symptoms",
  "entry_triggers",
  "flare_checkpoints",
  "vasomotor_measurements",
  "events",
  "attachments",
  "attachment_links",
  "diagnoses",
  "evidence_links",
  "decisions",
  "decision_evidence_links",
  "appointments",
  "medications",
  "medication_responses",
  "sources",
  "tasks",
  "ai_import_sessions",
  "ai_import_drafts",
  "ai_agent_threads",
  "ai_agent_messages",
  "ai_agent_tool_calls",
  "ai_agent_context_snapshots",
  "apple_health_imports",
  "apple_health_samples",
  "apple_health_daily_summaries",
  "audit_log",
];

const diagnosticBranches = [
  "Mixed-mechanism post-traumatic left lateral-thigh pain",
  "Focal scar / terminal branch / vastus-lateralis generator",
  "CRPS / chronic cold-phase phenotype",
  "CRPS Type I vs Type II subtype question",
  "Branch-to-vastus-lateralis motor injury",
  "L5 / peroneal / plexus localization for foot and big toe symptoms",
  "Central sensitization / nociplastic pain",
  "Functional movement disorder or CRPS motor overlay",
  "Autoimmune small-fiber neuropathy",
  "Sjogren-related SFN / ganglionitis",
  "MCAS",
  "Sodium channelopathy",
  "Autoimmune autonomic ganglionopathy",
  "Occult vascular / lymphatic scar lesion",
  "Post-TBI cognitive / visual / gait track",
];

describe("Supabase foundation SQL", () => {
  it("creates every required backend table", () => {
    for (const table of requiredTables) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
  });

  it("enables RLS for every required table", () => {
    for (const table of requiredTables) {
      if (table === "profiles" || table === "audit_log") {
        expect(migration).toContain(
          `alter table public.${table} enable row level security`,
        );
      } else {
        expect(migration).toContain(`'${table}'`);
      }
    }
  });

  it("keeps the storage bucket private with a 500 MB upload limit", () => {
    expect(migration).toContain("'bella-private-uploads'");
    expect(migration).toContain("false");
    expect(migration).toContain("524288000");
    expect(migration).toContain("storage.objects");
  });

  it("includes role-aware RLS helpers and audit triggers", () => {
    expect(migration).toContain("public.can_write_family");
    expect(migration).toContain("primary', 'caregiver");
    expect(migration).toContain("public.audit_row_change");
    expect(migration).toContain("soft_delete");
    expect(migration).toContain("metadata jsonb");
    expect(migration).toContain("public.record_soft_delete_reason");
    expect(migration).toContain("'soft_delete_reason'");
  });

  it("makes authenticated grants explicit while revoking anon table access", () => {
    expect(migration).toContain(
      "revoke all on all tables in schema public from anon",
    );
    expect(migration).toContain(
      "grant usage on schema public to authenticated",
    );
    expect(migration).toContain("grant select, insert, update on table");
    expect(migration).toContain(
      "grant execute on function public.soft_delete_record",
    );
  });
});

describe("Supabase seed SQL", () => {
  it("keeps reference and demo seeds idempotent", () => {
    expect(referenceSeed).toContain("on conflict");
    expect(demoSeed).toContain("on conflict");
    expect(demoSeed).toContain("uuid_generate_v5");
  });

  it("seeds the expected reference data and Bella-specific triggers", () => {
    for (const role of [
      "primary",
      "caregiver",
      "viewer",
      "clinician_readonly",
    ]) {
      expect(referenceSeed).toContain(`'${role}'`);
    }

    for (const trigger of [
      "bp_cuff",
      "iv_placement",
      "wrist_hairband",
      "scar_touch_probe_pressure",
    ]) {
      expect(referenceSeed).toContain(`'${trigger}'`);
    }
  });

  it("seeds fake fixtures for frontend high-density states", () => {
    for (const branch of diagnosticBranches) {
      expect(
        `${demoSeed}\n${diagnosticTreeSeed}\n${historicalImportSeed}`,
      ).toContain(branch);
    }

    for (const fixtureNeedle of [
      "Demo active pressure-triggered flare",
      "vasomotor_id",
      "Demo procedure impact event",
      "Demo open diagnostic decision",
      "Upload fake comparison photos",
      "planning-level branch names",
      "reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md",
      "records_md/generated/",
      "Imported scar injection record scaffold",
    ]) {
      expect(
        `${demoSeed}\n${diagnosticTreeSeed}\n${historicalImportSeed}`,
      ).toContain(fixtureNeedle);
    }
  });
});

describe("Supabase RLS verifier SQL", () => {
  it("covers the required privacy and role boundaries", () => {
    for (const expectedNeedle of [
      "every foundation table must have RLS enabled",
      "public tables must not grant anon policies",
      "anon role must not have table privileges",
      "private upload bucket must be private with 500 MB size limit",
      "primary must not read another family entries",
      "soft-deleted rows must be hidden by normal RLS reads",
      "viewer role must be read-only",
      "clinician_readonly role must be read-only",
      "primary must not read another family agent threads",
      "primary must not read another family Apple Health imports",
      "viewer role must not create agent threads",
      "viewer role must not create Apple Health imports",
      "clinician_readonly role must not update agent threads",
      "clinician_readonly role must not update Apple Health imports",
      "set local role authenticated",
      "request.jwt.claim.sub",
    ]) {
      expect(rlsVerification).toContain(expectedNeedle);
    }
  });
});
