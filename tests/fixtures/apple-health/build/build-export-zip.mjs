#!/usr/bin/env node
/**
 * Rebuild tests/fixtures/apple-health/export.zip from export.xml.
 *
 * Deterministic: writes a fixed mtime so the zip bytes don't churn between
 * commits. Run after editing export.xml:
 *
 *   node tests/fixtures/apple-health/build/build-export-zip.mjs
 *
 * Uses Node + system `zip` because we don't want a runtime zip dep just for
 * fixture generation.
 */
import { execFileSync } from "node:child_process";
import {
  utimesSync,
  existsSync,
  unlinkSync,
  mkdirSync,
  cpSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, "..");
const xmlPath = join(fixtureDir, "export.xml");
const zipPath = join(fixtureDir, "export.zip");

if (!existsSync(xmlPath)) {
  console.error(`Missing fixture XML: ${xmlPath}`);
  process.exit(1);
}

// Apple Health structures the archive as `apple_health_export/export.xml`.
const stagingRoot = join(fixtureDir, "build", ".staging");
const stagedDir = join(stagingRoot, "apple_health_export");
rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagedDir, { recursive: true });
cpSync(xmlPath, join(stagedDir, "export.xml"));

// Pin mtime so the zip output is byte-stable across machines.
const fixedTime = new Date("2026-05-09T16:00:00Z");
utimesSync(join(stagedDir, "export.xml"), fixedTime, fixedTime);
utimesSync(stagedDir, fixedTime, fixedTime);

if (existsSync(zipPath)) {
  unlinkSync(zipPath);
}

execFileSync("zip", ["-X", "-r", zipPath, "apple_health_export"], {
  cwd: stagingRoot,
  stdio: "inherit",
});

rmSync(stagingRoot, { recursive: true, force: true });

console.log(`Wrote ${zipPath}`);
