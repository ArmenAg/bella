#!/usr/bin/env node
import path from "node:path";
import { appRoot, argValue, parseArgs, readJsonl } from "./lib.mjs";

const args = parseArgs();
const manifestPath = path.resolve(
  appRoot,
  String(argValue(args, "manifest", "data/bootstrap/source_manifest.jsonl")),
);
const eventsPath = path.resolve(
  appRoot,
  String(argValue(args, "events", "data/bootstrap/events.review.jsonl")),
);
const entriesPath = path.resolve(
  appRoot,
  String(argValue(args, "entries", "data/bootstrap/entries.review.jsonl")),
);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reviewStatuses = new Set(["accepted", "needs_review", "rejected"]);
const sourceTypes = new Set([
  "visit_note",
  "imaging_report",
  "lab_report",
  "generated_report",
  "literature",
  "upload",
  "other",
]);
const eventTypes = new Set([
  "procedure",
  "imaging",
  "test_lab",
  "consult",
  "procedure_test",
]);

function duplicateValues(rows, key) {
  const seen = new Set();
  const duplicates = new Set();

  for (const row of rows) {
    const value = row[key];
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function countBy(rows, key) {
  return rows.reduce((accumulator, row) => {
    const value = String(row[key] ?? "none");
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function requireCondition(errors, condition, message) {
  if (!condition) errors.push(message);
}

async function readOptional(filePath) {
  try {
    return await readJsonl(filePath);
  } catch {
    return [];
  }
}

async function main() {
  const sources = await readJsonl(manifestPath);
  const events = await readJsonl(eventsPath);
  const entries = await readOptional(entriesPath);
  const errors = [];
  const sourceIds = new Set(sources.map((row) => row.id));
  const acceptedSourceIds = new Set(
    sources
      .filter((row) => row.review_status === "accepted")
      .map((row) => row.id),
  );

  requireCondition(
    errors,
    duplicateValues(sources, "id").length === 0,
    "Source manifest contains duplicate ids.",
  );
  requireCondition(
    errors,
    duplicateValues(events, "id").length === 0,
    "Event review file contains duplicate ids.",
  );

  for (const source of sources) {
    requireCondition(
      errors,
      uuidPattern.test(source.id),
      `Invalid source id for ${source.workspace_path}`,
    );
    requireCondition(
      errors,
      reviewStatuses.has(source.review_status),
      `Invalid source review_status for ${source.workspace_path}`,
    );
    requireCondition(
      errors,
      sourceTypes.has(source.source_type),
      `Invalid source_type for ${source.workspace_path}`,
    );
  }

  for (const event of events) {
    requireCondition(
      errors,
      uuidPattern.test(event.id),
      `Invalid event id for ${event.source_path}`,
    );
    requireCondition(
      errors,
      reviewStatuses.has(event.review_status),
      `Invalid event review_status for ${event.source_path}`,
    );
    requireCondition(
      errors,
      sourceIds.has(event.source_id),
      `Event references missing source ${event.source_id}`,
    );
    requireCondition(
      errors,
      event.review_status !== "accepted" ||
        acceptedSourceIds.has(event.source_id),
      `Accepted event references a non-accepted source ${event.source_id}`,
    );
    requireCondition(
      errors,
      eventTypes.has(event.type),
      `Invalid event type ${event.type} for ${event.source_path}`,
    );
    requireCondition(
      errors,
      Number.isFinite(Date.parse(event.occurred_at)),
      `Invalid event occurred_at for ${event.source_path}`,
    );
  }

  const report = {
    sources: sources.length,
    events: events.length,
    entries: entries.length,
    accepted_sources: sources.filter((row) => row.review_status === "accepted")
      .length,
    accepted_events: events.filter((row) => row.review_status === "accepted")
      .length,
    source_types: countBy(sources, "source_type"),
    event_types: countBy(events, "type"),
    event_review_statuses: countBy(events, "review_status"),
  };

  console.log(JSON.stringify(report, null, 2));

  if (errors.length > 0) {
    console.error(
      `\nImport verification failed with ${errors.length} error(s):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nImport files passed static verification.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
