import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bulkExportSchema,
  bulkExportRequestSchema,
  avoidContraindicationSchema,
  careTeamMemberSchema,
  caseSummaryVersionSchema,
  emergencyPacketRequestSchema,
  emergencyPacketSchema,
  exportPacketRequestSchema,
  exportPacketSchema,
  type AvoidContraindication,
  type BulkExport,
  type BulkExportRequest,
  type CareTeamMember,
  type CaseSummaryVersion,
  type EmergencyPacket,
  type EmergencyPacketRequest,
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
  caseSummary: CaseSummaryVersion | null;
};

type EmergencyPacketMedication = {
  id: string;
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  prescriber: string | null;
  status: string;
  reason: string | null;
};

type EmergencyPacketContext = {
  generatedAt: string;
  subjectUserId: string;
  lastReviewedAt: string | null;
  caseSummary: CaseSummaryVersion | null;
  medications: EmergencyPacketMedication[];
  allergiesIntolerances: AvoidContraindication[];
  avoidContraindications: AvoidContraindication[];
  careTeam: CareTeamMember[];
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

function latestTimestamp(values: (string | null | undefined)[]) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function normalizeCaseSummaryRow(row: Record<string, unknown>) {
  return caseSummaryVersionSchema.parse({
    ...row,
    calibration_note: row.calibration_note ?? null,
    authored_by_text: row.authored_by_text ?? null,
    reviewed_by_text: row.reviewed_by_text ?? null,
    reviewed_at: row.reviewed_at ?? null,
    source_note: row.source_note ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function normalizeAvoidContraindicationRow(row: Record<string, unknown>) {
  return avoidContraindicationSchema.parse({
    ...row,
    reaction_description: row.reaction_description ?? null,
    evidence_source: row.evidence_source ?? null,
    source_id: row.source_id ?? null,
    last_reviewed_at: row.last_reviewed_at ?? null,
    notes: row.notes ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function normalizeCareTeamMemberRow(row: Record<string, unknown>) {
  return careTeamMemberSchema.parse({
    ...row,
    organization: row.organization ?? null,
    specialty: row.specialty ?? null,
    role: row.role ?? null,
    portal_url: row.portal_url ?? null,
    contact_notes: row.contact_notes ?? null,
    manages: row.manages ?? null,
    manages_tags: Array.isArray(row.manages_tags) ? row.manages_tags : [],
    last_visit_at: row.last_visit_at ?? null,
    next_visit_at: row.next_visit_at ?? null,
    last_reviewed_at: row.last_reviewed_at ?? null,
    notes: row.notes ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function normalizeEmergencyMedicationRow(
  row: Record<string, unknown>,
): EmergencyPacketMedication {
  return {
    id: String(row.id),
    name: String(row.name),
    dose: row.dose ? String(row.dose) : null,
    route: row.route ? String(row.route) : null,
    frequency: row.frequency ? String(row.frequency) : null,
    prescriber: row.prescriber ? String(row.prescriber) : null,
    status: String(row.status),
    reason: row.reason ? String(row.reason) : null,
  };
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
        context.filters.care_team_member_id
          ? `Care team member: ${context.filters.care_team_member_id}`
          : "",
      ].filter(Boolean),
    ),
    "",
    "## Working Diagnosis / Case Summary",
    context.caseSummary
      ? [
          context.caseSummary.summary_text,
          context.caseSummary.calibration_note
            ? `Calibration note: ${context.caseSummary.calibration_note}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : activeDiagnoses.length === 0
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
  const profile = await requireCurrentProfile(supabase);
  const subjectUserId = parsed.subject_user_id ?? profile.id;
  const dateFrom = dateFromToDateTime(parsed.date_from);
  const dateTo = dateFromToDateTime(parsed.date_to, true);

  const [
    caseSummaryResult,
    timeline,
    diagnoses,
    medications,
    decisions,
    appointments,
    tasks,
    vasomotor,
    procedures,
  ] = await Promise.all([
    supabase
      .from("case_summary_versions")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  if (caseSummaryResult.error) throw caseSummaryResult.error;

  const markdown = buildClinicianPacketMarkdown({
    generatedAt: new Date().toISOString(),
    filters: parsed,
    caseSummary: caseSummaryResult.data
      ? normalizeCaseSummaryRow(
          caseSummaryResult.data as Record<string, unknown>,
        )
      : null,
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
    packet_kind: "clinician_visit",
    generated_at: new Date().toISOString(),
    markdown,
    included_attachment_ids: includedAttachmentIds,
    filters: parsed,
  });
}

export function buildEmergencyPacketMarkdown(
  context: EmergencyPacketContext,
): string {
  return [
    "# Bella Care Tracker Emergency Packet",
    "",
    `Generated: ${context.generatedAt}`,
    `Subject user: ${context.subjectUserId}`,
    `Last reviewed: ${context.lastReviewedAt ?? "Not reviewed yet"}`,
    "",
    "## Case Summary",
    context.caseSummary
      ? context.caseSummary.summary_text
      : "No reviewed case summary recorded.",
    "",
    "## Current Medications",
    bulletList(
      context.medications.map((medication) =>
        [
          medication.name,
          medication.dose ? `dose: ${medication.dose}` : "",
          medication.route ? `route: ${medication.route}` : "",
          medication.frequency ? `frequency: ${medication.frequency}` : "",
          medication.prescriber ? `prescriber: ${medication.prescriber}` : "",
          medication.reason ? `reason: ${medication.reason}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      ),
    ),
    "",
    "## Allergies And Intolerances",
    bulletList(
      context.allergiesIntolerances.map((item) =>
        [
          `${item.title} (${item.category}, ${item.severity})`,
          item.reaction_description,
          item.evidence_source ? `source: ${item.evidence_source}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      ),
    ),
    "",
    "## Avoid / Contraindications",
    bulletList(
      context.avoidContraindications.map((item) =>
        [
          `${item.title} (${item.category}, ${item.severity})`,
          item.reaction_description,
          item.evidence_source ? `source: ${item.evidence_source}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      ),
    ),
    "",
    "## Care Team",
    bulletList(
      context.careTeam.map((member) =>
        [
          member.name,
          member.role ?? member.specialty,
          member.organization,
          member.manages ? `manages: ${member.manages}` : "",
          member.contact_notes ? `contact: ${member.contact_notes}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      ),
    ),
    "",
    "_This packet summarizes family/clinician-reviewed records for emergency context. It does not diagnose, predict, or recommend treatment._",
    "",
  ].join("\n");
}

export async function generateEmergencyPacket(
  input: EmergencyPacketRequest,
  supabase: SupabaseClient,
): Promise<EmergencyPacket> {
  const parsed = emergencyPacketRequestSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  const subjectUserId = parsed.subject_user_id ?? profile.id;
  const generatedAt = parsed.generated_at ?? new Date().toISOString();

  const [
    caseSummaryResult,
    avoidResult,
    medicationResult,
    careTeamResult,
    reviewResult,
  ] = await Promise.all([
    supabase
      .from("case_summary_versions")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("avoid_contraindications")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("category", { ascending: true })
      .order("severity", { ascending: false })
      .order("title", { ascending: true }),
    supabase
      .from("medications")
      .select(
        "id,name,dose,route,frequency,prescriber,status,reason,updated_at",
      )
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("care_team_members")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("emergency_packet_reviews")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("subject_user_id", subjectUserId)
      .is("deleted_at", null)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (caseSummaryResult.error) throw caseSummaryResult.error;
  if (avoidResult.error) throw avoidResult.error;
  if (medicationResult.error) throw medicationResult.error;
  if (careTeamResult.error) throw careTeamResult.error;
  if (reviewResult.error) throw reviewResult.error;

  const caseSummary = caseSummaryResult.data
    ? normalizeCaseSummaryRow(caseSummaryResult.data as Record<string, unknown>)
    : null;
  const avoidItems = (
    (avoidResult.data ?? []) as Record<string, unknown>[]
  ).map(normalizeAvoidContraindicationRow);
  const allergiesIntolerances = avoidItems.filter((item) =>
    ["allergy", "medication_intolerance"].includes(item.category),
  );
  const avoidContraindications = avoidItems.filter(
    (item) => !["allergy", "medication_intolerance"].includes(item.category),
  );
  const medications = (
    (medicationResult.data ?? []) as Record<string, unknown>[]
  ).map(normalizeEmergencyMedicationRow);
  const careTeam = (
    (careTeamResult.data ?? []) as Record<string, unknown>[]
  ).map(normalizeCareTeamMemberRow);
  const reviewRow = reviewResult.data as Record<string, unknown> | null;
  const lastReviewedAt = latestTimestamp([
    reviewRow?.reviewed_at ? String(reviewRow.reviewed_at) : null,
    caseSummary?.reviewed_at,
    ...avoidItems.map((item) => item.last_reviewed_at),
    ...careTeam.map((member) => member.last_reviewed_at),
  ]);

  const context: EmergencyPacketContext = {
    generatedAt,
    subjectUserId,
    lastReviewedAt,
    caseSummary,
    medications,
    allergiesIntolerances,
    avoidContraindications,
    careTeam,
  };

  const sourceMap = [
    caseSummary
      ? {
          section: "case_summary",
          source_table: "case_summary_versions",
          source_id: caseSummary.id,
          reviewed_at: caseSummary.reviewed_at,
        }
      : null,
    reviewRow
      ? {
          section: "last_reviewed",
          source_table: "emergency_packet_reviews",
          source_id: String(reviewRow.id),
          reviewed_at: reviewRow.reviewed_at
            ? String(reviewRow.reviewed_at)
            : null,
        }
      : null,
    ...medications.map((medication) => ({
      section: "current_medications",
      source_table: "medications",
      source_id: medication.id,
      reviewed_at: null,
    })),
    ...allergiesIntolerances.map((item) => ({
      section: "allergies_intolerances",
      source_table: "avoid_contraindications",
      source_id: item.id,
      reviewed_at: item.last_reviewed_at,
    })),
    ...avoidContraindications.map((item) => ({
      section: "avoid_contraindications",
      source_table: "avoid_contraindications",
      source_id: item.id,
      reviewed_at: item.last_reviewed_at,
    })),
    ...careTeam.map((member) => ({
      section: "care_team",
      source_table: "care_team_members",
      source_id: member.id,
      reviewed_at: member.last_reviewed_at,
    })),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return emergencyPacketSchema.parse({
    id: randomUUID(),
    packet_type: "emergency",
    generated_at: generatedAt,
    subject_user_id: subjectUserId,
    last_reviewed_at: lastReviewedAt,
    markdown: buildEmergencyPacketMarkdown(context),
    case_summary: caseSummary,
    current_medications: medications,
    allergies_intolerances: allergiesIntolerances,
    avoid_contraindications: avoidContraindications,
    care_team: careTeam,
    source_map: sourceMap,
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
