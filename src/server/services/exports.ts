import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bulkExportSchema,
  bulkExportRequestSchema,
  exportPacketRequestSchema,
  exportPacketSchema,
  type BulkExport,
  type BulkExportRequest,
  type ExportFileManifestItem,
  type ExportPacket,
  type ExportPacketRequest,
  type TimelineItem,
} from "@/server/contracts";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { listDecisions } from "./decisions";
import { listDiagnoses } from "./diagnoses";
import { listMedications } from "./medications";
import { listProcedureEvents } from "./procedures";
import { listAppointments, listTasks } from "./schedule";
import { listTimelineItems } from "./timeline";
import { listVasomotorMeasurements } from "./vasomotor";

type PacketContext = {
  generatedAt: string;
  filters: ExportPacketRequest;
  timelineItems: TimelineItem[];
  diagnoses: {
    title: string;
    status: string;
    confidence: string;
    summary: string | null;
    tests_needed: string | null;
    evidence_for: string | null;
    evidence_against: string | null;
  }[];
  medications: { name: string; dose: string | null; status: string }[];
  decisions: { title: string; status: string; question: string }[];
  appointments: {
    date_time: string;
    purpose: string;
    provider: string | null;
  }[];
  tasks: { title: string; due_at: string | null; priority: string }[];
  vasomotor: {
    measured_at: string;
    site: string;
    delta_c: number | null;
    left_attachment_id: string | null;
    right_attachment_id: string | null;
  }[];
  procedures: {
    title: string;
    occurred_at: string;
    diagnostic_question: string | null;
    baseline_before: string | null;
    immediate_effect: string | null;
    effect_24h: string | null;
    effect_72h: string | null;
    effect_1w: string | null;
    effect_1m: string | null;
    answered_question: string | null;
    repeat_recommendation: string | null;
  }[];
  clinicianQuestions: string[];
};

function dateFromToDateTime(date: string | undefined, end = false) {
  if (!date) return undefined;
  return end ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`;
}

function bulletList(items: string[]) {
  if (items.length === 0) return "- None recorded.";
  return items.map((item) => `- ${item}`).join("\n");
}

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(".000Z", "Z");
}

export function buildClinicianPacketMarkdown(context: PacketContext): string {
  const activeDiagnoses = context.diagnoses.filter((diagnosis) =>
    ["supported", "confirmed", "monitoring", "suspected"].includes(
      diagnosis.status,
    ),
  );
  const flares = context.timelineItems.filter(
    (item) => item.item_type === "flare",
  );
  const endedFlares = context.timelineItems.filter(
    (item) =>
      item.item_type === "flare" &&
      typeof item.metadata.recovery_minutes === "number",
  );
  const recoveryValues = endedFlares.map((item) =>
    Number(item.metadata.recovery_minutes),
  );
  const averageRecovery =
    recoveryValues.length > 0
      ? Math.round(
          recoveryValues.reduce((sum, value) => sum + value, 0) /
            recoveryValues.length,
        )
      : null;

  return [
    "# Bella Care Tracker Clinician Packet",
    "",
    `Generated: ${context.generatedAt}`,
    "",
    "## Scope",
    bulletList(
      [
        context.filters.date_from ? `From: ${context.filters.date_from}` : "",
        context.filters.date_to ? `To: ${context.filters.date_to}` : "",
        context.filters.flares_only
          ? "Flares only"
          : "All selected timeline items",
        context.filters.diagnostic_branch_id
          ? `Diagnostic branch: ${context.filters.diagnostic_branch_id}`
          : "",
        context.filters.body_region_id
          ? `Body region: ${context.filters.body_region_id}`
          : "",
      ].filter(Boolean),
    ),
    "",
    "## Working Diagnosis",
    activeDiagnoses.length === 0
      ? "No active diagnostic branch is selected or supported in the current data."
      : activeDiagnoses
          .slice(0, 4)
          .map(
            (diagnosis) =>
              `- ${diagnosis.title} (${diagnosis.status}, ${diagnosis.confidence} confidence): ${
                diagnosis.summary ?? "No summary recorded."
              }`,
          )
          .join("\n"),
    "",
    "## Confirmed-By / What Would Change This",
    bulletList(
      activeDiagnoses.slice(0, 4).map((diagnosis) => {
        const criteria = diagnosis.tests_needed ?? diagnosis.evidence_for;
        return `${diagnosis.title}: ${criteria ?? "Criteria not recorded yet."}`;
      }),
    ),
    "",
    "## Current Medications",
    bulletList(
      context.medications.map((medication) =>
        [
          medication.name,
          medication.dose ? `(${medication.dose})` : "",
          `status: ${medication.status}`,
        ]
          .filter(Boolean)
          .join(" "),
      ),
    ),
    "",
    "## Active Decisions",
    bulletList(
      context.decisions.map(
        (decision) =>
          `${decision.title} (${decision.status}): ${decision.question}`,
      ),
    ),
    "",
    "## Upcoming Appointments And Open Tasks",
    bulletList([
      ...context.appointments.map(
        (appointment) =>
          `${formatDateTime(appointment.date_time)} - ${appointment.purpose}${
            appointment.provider ? ` (${appointment.provider})` : ""
          }`,
      ),
      ...context.tasks.map(
        (task) =>
          `${task.due_at ? formatDateTime(task.due_at) : "No due date"} - ${
            task.title
          } (${task.priority})`,
      ),
    ]),
    "",
    "## Flare Frequency And Recovery",
    bulletList([
      `${flares.length} flare timeline item(s) in scope.`,
      averageRecovery === null
        ? "Average recovery time not available."
        : `Average recovery time: ${averageRecovery} minutes.`,
    ]),
    "",
    "## Photo Comparisons And Temperature Deltas",
    bulletList(
      context.vasomotor.map((measurement) => {
        const attachments = [
          measurement.left_attachment_id,
          measurement.right_attachment_id,
        ].filter(Boolean);
        return `${formatDateTime(measurement.measured_at)} ${measurement.site}: delta ${measurement.delta_c ?? "n/a"} C, attachments ${attachments.join(", ") || "none"}`;
      }),
    ),
    "",
    "## Procedure Impact Summaries",
    bulletList(
      context.procedures.map(
        (procedure) =>
          `${formatDateTime(procedure.occurred_at)} - ${procedure.title}: ${
            procedure.diagnostic_question ?? "No diagnostic question recorded."
          } Immediate: ${procedure.immediate_effect ?? "n/a"}; 24h: ${
            procedure.effect_24h ?? "n/a"
          }; 72h: ${procedure.effect_72h ?? "n/a"}; 1w: ${
            procedure.effect_1w ?? "n/a"
          }; 1m: ${procedure.effect_1m ?? "n/a"}; answered: ${
            procedure.answered_question ?? "unclear"
          }. Repeat: ${procedure.repeat_recommendation ?? "not recorded"}.`,
      ),
    ),
    "",
    "## Key Timeline Items",
    bulletList(
      context.timelineItems
        .slice(0, 20)
        .map(
          (item) =>
            `${formatDateTime(item.occurred_at)} - ${item.title} [${item.item_type}]${
              item.summary ? `: ${item.summary}` : ""
            }`,
        ),
    ),
    "",
    "## Clinician Questions",
    bulletList(context.clinicianQuestions),
    "",
  ].join("\n");
}

export async function generateClinicianExportPacket(
  input: ExportPacketRequest,
  supabase: SupabaseClient,
): Promise<ExportPacket> {
  const parsed = exportPacketRequestSchema.parse(input);
  await requireCurrentProfile(supabase);
  const dateFrom = dateFromToDateTime(parsed.date_from);
  const dateTo = dateFromToDateTime(parsed.date_to, true);

  const [
    timeline,
    diagnoses,
    medications,
    decisions,
    appointments,
    tasks,
    vasomotor,
    procedures,
  ] = await Promise.all([
    listTimelineItems(
      {
        date_from: dateFrom,
        date_to: dateTo,
        diagnostic_branch_id: parsed.diagnostic_branch_id,
        body_region_id: parsed.body_region_id,
        flare_only: parsed.flares_only,
        media_only: parsed.include_photos ? undefined : false,
        page_size: 50,
      },
      supabase,
    ),
    listDiagnoses(
      {
        page_size: 50,
      },
      supabase,
    ),
    listMedications({ status: "active", page_size: 50 }, supabase),
    listDecisions({ open_only: true, page_size: 50 }, supabase),
    listAppointments({ upcoming: true, page_size: 20 }, supabase),
    listTasks({ open_only: true, page_size: 20 }, supabase),
    listVasomotorMeasurements(
      { date_from: dateFrom, date_to: dateTo, page_size: 20 },
      supabase,
    ),
    parsed.include_procedure_summaries
      ? listProcedureEvents(
          { date_from: dateFrom, date_to: dateTo, page_size: 20 },
          supabase,
        )
      : Promise.resolve({ items: [], next_cursor: null, page_size: 20 }),
  ]);

  const markdown = buildClinicianPacketMarkdown({
    generatedAt: new Date().toISOString(),
    filters: parsed,
    timelineItems: timeline.items,
    diagnoses: diagnoses.items,
    medications: medications.items,
    decisions: decisions.items,
    appointments: appointments.items,
    tasks: tasks.items,
    vasomotor: vasomotor.items,
    procedures: procedures.items,
    clinicianQuestions: parsed.clinician_questions,
  });
  const includedAttachmentIds = parsed.include_photos
    ? [
        ...new Set([
          ...timeline.items.flatMap((item) => item.attachment_ids),
          ...vasomotor.items.flatMap((item) =>
            [item.left_attachment_id, item.right_attachment_id].filter(
              (id): id is string => Boolean(id),
            ),
          ),
        ]),
      ]
    : [];

  return exportPacketSchema.parse({
    id: randomUUID(),
    generated_at: new Date().toISOString(),
    markdown,
    included_attachment_ids: includedAttachmentIds,
    filters: parsed,
  });
}

function buildUploadedFileManifest(
  rows: Record<string, unknown>[],
): ExportFileManifestItem[] {
  return rows.map((row) => ({
    attachment_id: String(row.id),
    bucket_id: String(row.bucket_id),
    file_path: String(row.file_path),
    file_name: String(row.file_name),
    mime_type: String(row.mime_type),
    size_bytes: Number(row.size_bytes),
    captured_at: row.captured_at ? String(row.captured_at) : null,
    description: row.description ? String(row.description) : null,
  }));
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsvTables(
  tables: Record<string, Record<string, unknown>[]>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tables).map(([tableName, rows]) => {
      const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((header) => escapeCsvCell(row[header])).join(","),
        ),
      ].join("\n");

      return [tableName, csv];
    }),
  );
}

export async function createBulkDataExport(
  input: BulkExportRequest,
  supabase: SupabaseClient,
): Promise<BulkExport> {
  const parsed = bulkExportRequestSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  if (parsed.include_soft_deleted) {
    assertCanWrite(profile);
  }

  const { data, error } = await supabase.rpc("export_family_data", {
    include_soft_deleted: parsed.include_soft_deleted,
  });

  if (error) throw error;

  const tables = (data ?? {}) as Record<string, Record<string, unknown>[]>;
  const generatedPackets = parsed.include_generated_export_packets
    ? [await generateClinicianExportPacket({}, supabase)]
    : [];

  return bulkExportSchema.parse({
    id: randomUUID(),
    generated_at: parsed.requested_at ?? new Date().toISOString(),
    request: parsed,
    format: parsed.format,
    manifest_version: 1,
    tables,
    csv_tables: parsed.format === "csv" ? buildCsvTables(tables) : {},
    uploaded_file_manifest: parsed.include_uploaded_files
      ? buildUploadedFileManifest(tables.attachments ?? [])
      : [],
    generated_packets: generatedPackets,
    restore_notes: [
      "Reference tables should be restored before family-scoped tables.",
      "Uploaded file manifest entries identify Supabase bucket paths; file bytes are not embedded in the manifest-first export.",
      "Use generated export packets as human-readable visit summaries, not as the canonical restore source.",
    ],
    limitations: [
      "Phase 3 implements manifest-first structured export; zip archive assembly is deferred.",
    ],
  });
}
