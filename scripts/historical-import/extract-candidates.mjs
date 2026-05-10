#!/usr/bin/env node
import path from "node:path";
import {
  appRoot,
  argValue,
  eventTitle,
  extractProcedureImpact,
  inferEventType,
  parseArgs,
  readJsonl,
  readTextForImportFile,
  stableUuid,
  truncate,
  workspaceRoot,
  writeJsonl,
} from "./lib.mjs";

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
const attachmentsPath = path.resolve(
  appRoot,
  String(
    argValue(args, "attachments", "data/bootstrap/attachments.review.jsonl"),
  ),
);

const binaryExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".heic",
  ".webp",
  ".zip",
]);

function shouldCreateEventCandidate(source) {
  if (!source.clinical_source) return false;
  if (!source.source_datetime && !source.source_date) return false;
  if (source.tags?.includes("generated_reasoning")) return false;
  if (
    /patient health summary|continuity of care document/i.test(source.title)
  ) {
    return false;
  }
  return ["visit_note", "imaging_report", "lab_report", "other"].includes(
    source.source_type,
  );
}

function eventReviewStatus(source, eventType) {
  if (source.tags?.includes("healthsummary") && source.source_datetime) {
    return "accepted";
  }

  if (eventType === "procedure_test") return "needs_review";

  return "needs_review";
}

function eventSummary(source) {
  const details = [];

  if (source.encounter_type)
    details.push(`Encounter type: ${source.encounter_type}.`);
  if (source.department) details.push(`Department: ${source.department}.`);
  if (source.reason) details.push(`Reason: ${truncate(source.reason, 500)}.`);

  details.push(`Imported from ${source.workspace_path}.`);

  return details.join(" ");
}

async function buildEventCandidate(source) {
  const absolutePath = path.join(workspaceRoot, source.workspace_path);
  const { text } = await readTextForImportFile(absolutePath);
  const eventType = inferEventType(source);
  const procedureImpact =
    eventType === "procedure_test" ? extractProcedureImpact(text) : {};

  return {
    id: stableUuid(
      `event:${source.id}:${source.source_datetime ?? source.source_date}`,
    ),
    review_status: eventReviewStatus(source, eventType),
    confidence: source.tags?.includes("healthsummary")
      ? "source_metadata"
      : "heuristic",
    source_id: source.id,
    source_path: source.workspace_path,
    type: eventType,
    occurred_at:
      source.source_datetime ?? `${source.source_date}T12:00:00.000Z`,
    date_precision: source.source_datetime ? "datetime" : "date",
    title: eventTitle(source, eventType),
    provider: source.provider,
    location: source.department,
    summary: eventSummary(source),
    diagnostic_question:
      eventType === "procedure_test"
        ? "What question was this procedure or test intended to answer, and did it change symptoms or management?"
        : null,
    baseline_before: procedureImpact.baseline_before || null,
    immediate_effect: procedureImpact.immediate_effect || null,
    effect_24h: null,
    effect_72h: null,
    effect_1w: null,
    effect_1m: null,
    new_symptoms: procedureImpact.new_symptoms || null,
    answered_question: procedureImpact.answered_question || null,
    repeat_recommendation: null,
    reviewer_note:
      eventType === "procedure_test"
        ? "Review procedure impact fields before applying."
        : "Review title and event type before applying if this came from a heuristic source.",
  };
}

function buildEntryCandidate(source) {
  const lower = `${source.title} ${source.workspace_path}`.toLowerCase();
  if (!lower.includes("pain_log") && !lower.includes("response_log"))
    return null;

  return {
    id: stableUuid(`entry:${source.id}`),
    review_status: "needs_review",
    confidence: "manual_review_required",
    source_id: source.id,
    source_path: source.workspace_path,
    type: lower.includes("pain") ? "pain" : "log",
    occurred_at: source.source_datetime ?? source.source_date ?? null,
    title: source.title,
    summary:
      "This file appears to contain patient-entered symptom or response log data. Split into structured entries manually before applying.",
    reviewer_note:
      "The importer does not auto-split narrative pain logs yet because dates, pain scores, and flare boundaries need human confirmation.",
  };
}

function buildAttachmentCandidate(source) {
  if (!binaryExtensions.has(source.extension)) return null;

  return {
    id: stableUuid(`attachment:${source.id}`),
    review_status: "needs_review",
    source_id: source.id,
    source_path: source.workspace_path,
    file_name: source.file_name,
    size_bytes: source.size_bytes,
    sha256: source.sha256,
    label: source.title,
    reviewer_note:
      "Register after the file is uploaded to Supabase Storage; local paths are not valid production storage paths.",
  };
}

async function main() {
  const sources = await readJsonl(manifestPath);
  const eventCandidates = [];
  const entryCandidates = [];
  const attachmentCandidates = [];

  for (const source of sources) {
    if (shouldCreateEventCandidate(source)) {
      eventCandidates.push(await buildEventCandidate(source));
    }

    const entryCandidate = buildEntryCandidate(source);
    if (entryCandidate) entryCandidates.push(entryCandidate);

    const attachmentCandidate = buildAttachmentCandidate(source);
    if (attachmentCandidate) attachmentCandidates.push(attachmentCandidate);
  }

  eventCandidates.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  entryCandidates.sort((a, b) =>
    String(a.occurred_at).localeCompare(String(b.occurred_at)),
  );
  attachmentCandidates.sort((a, b) =>
    a.source_path.localeCompare(b.source_path),
  );

  await writeJsonl(eventsPath, eventCandidates);
  await writeJsonl(entriesPath, entryCandidates);
  await writeJsonl(attachmentsPath, attachmentCandidates);

  const acceptedEvents = eventCandidates.filter(
    (row) => row.review_status === "accepted",
  ).length;
  const needsReviewEvents = eventCandidates.length - acceptedEvents;

  console.log(
    `Wrote ${eventCandidates.length} event candidates (${acceptedEvents} accepted, ${needsReviewEvents} needs review).`,
  );
  console.log(`Wrote ${entryCandidates.length} entry candidates.`);
  console.log(`Wrote ${attachmentCandidates.length} attachment candidates.`);
  console.log("Next: edit *.review.jsonl, then run npm run bootstrap:apply");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
