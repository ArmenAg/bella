import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  timelineFilterSchema,
  timelineItemSchema,
  timelinePageSchema,
  type TimelineFilter,
  type TimelineItem,
  type TimelinePage,
  type TimelineSourceTable,
} from "@/server/contracts";
import { requireCurrentProfile } from "./auth";

type Row = Record<string, unknown>;
const TIMELINE_SOURCE_ROW_LIMIT = 1000;

export type TimelineSourceRows = {
  entries?: Row[];
  entry_regions?: Row[];
  entry_symptoms?: Row[];
  entry_triggers?: Row[];
  flare_checkpoints?: Row[];
  events?: Row[];
  appointments?: Row[];
  medications?: Row[];
  medication_responses?: Row[];
  decisions?: Row[];
  sources?: Row[];
  diagnoses?: Row[];
  attachments?: Row[];
  attachment_links?: Row[];
  evidence_links?: Row[];
  decision_evidence_links?: Row[];
  vasomotor_measurements?: Row[];
};

type TargetKey = `${string}:${string}`;

const TIMELINE_QUERY_TABLES = [
  "entries",
  "entry_regions",
  "entry_symptoms",
  "entry_triggers",
  "flare_checkpoints",
  "events",
  "appointments",
  "medications",
  "medication_responses",
  "decisions",
  "sources",
  "diagnoses",
  "attachments",
  "attachment_links",
  "evidence_links",
  "decision_evidence_links",
  "vasomotor_measurements",
] satisfies TimelineSourceTable[];

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toIsoDateTime(value: unknown): string {
  if (typeof value === "string" && value.trim() !== "") {
    return new Date(value).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(0).toISOString();
}

function toDateTimeFromDate(value: unknown, fallback: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  return toIsoDateTime(fallback);
}

function targetKey(type: string, id: unknown): TargetKey {
  return `${type}:${String(id)}`;
}

function appendMapValue(
  map: Map<TargetKey, string[]>,
  key: TargetKey,
  id: string,
) {
  const existing = map.get(key) ?? [];
  existing.push(id);
  map.set(key, existing);
}

function groupEntryLinks(rows: Row[] | undefined, idColumn: string) {
  const grouped = new Map<string, string[]>();

  for (const row of rows ?? []) {
    const entryId = String(row.entry_id);
    const existing = grouped.get(entryId) ?? [];
    existing.push(String(row[idColumn]));
    grouped.set(entryId, existing);
  }

  return grouped;
}

function eventItemType(type: unknown): TimelineItem["item_type"] {
  switch (type) {
    case "injury":
    case "procedure":
    case "imaging":
    case "test_lab":
    case "consult":
    case "medication_change":
      return type;
    case "procedure_test":
      return "procedure";
    default:
      return "log_entry";
  }
}

function linkedTypeForSourceTable(sourceTable: string) {
  switch (sourceTable) {
    case "entries":
      return "entry";
    case "events":
      return "event";
    case "attachments":
      return "attachment";
    case "sources":
      return "source";
    case "decisions":
      return "decision";
    case "diagnoses":
      return "diagnosis";
    case "vasomotor_measurements":
      return "vasomotor_measurement";
    case "medication_responses":
      return "medication_response";
    case "appointments":
      return "appointment";
    case "medications":
      return "medication";
    case "flare_checkpoints":
      return "flare_checkpoint";
    default:
      return sourceTable;
  }
}

function entryItemType(row: Row): TimelineItem["item_type"] {
  if (row.is_flare || row.type === "flare") return "flare";
  if (row.type === "procedure_related") return "procedure";
  if (row.type === "medication_related") return "medication_change";
  if (row.type === "vasomotor") return "vasomotor_measurement";
  if (
    row.pain_current !== null ||
    row.pain_peak !== null ||
    row.pain_average !== null
  ) {
    return "pain_entry";
  }
  return "log_entry";
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function compareTimelineItems(a: TimelineItem, b: TimelineItem) {
  const byDate = Date.parse(b.occurred_at) - Date.parse(a.occurred_at);
  if (byDate !== 0) return byDate;
  return b.id.localeCompare(a.id);
}

function buildLookupMaps(rows: TimelineSourceRows) {
  const regionIdsByEntry = groupEntryLinks(
    rows.entry_regions,
    "body_region_id",
  );
  const symptomIdsByEntry = groupEntryLinks(rows.entry_symptoms, "symptom_id");
  const triggerIdsByEntry = groupEntryLinks(rows.entry_triggers, "trigger_id");
  const entryRowsById = new Map(
    (rows.entries ?? []).map((row) => [String(row.id), row]),
  );
  const attachmentIdsByTarget = new Map<TargetKey, string[]>();
  const diagnosisIdsByTarget = new Map<TargetKey, string[]>();
  const evidenceCountByTarget = new Map<TargetKey, number>();
  const evidenceTargetsByDiagnosis = new Map<string, Set<TargetKey>>();

  for (const row of rows.attachment_links ?? []) {
    appendMapValue(
      attachmentIdsByTarget,
      targetKey(String(row.linked_type), row.linked_id),
      String(row.attachment_id),
    );
  }

  for (const row of rows.evidence_links ?? []) {
    const key = targetKey(String(row.linked_type), row.linked_id);
    const diagnosisId = String(row.diagnosis_id);
    appendMapValue(diagnosisIdsByTarget, key, diagnosisId);
    evidenceCountByTarget.set(key, (evidenceCountByTarget.get(key) ?? 0) + 1);
    evidenceCountByTarget.set(
      targetKey("diagnosis", diagnosisId),
      (evidenceCountByTarget.get(targetKey("diagnosis", diagnosisId)) ?? 0) + 1,
    );

    const diagnosisTargets =
      evidenceTargetsByDiagnosis.get(diagnosisId) ?? new Set<TargetKey>();
    diagnosisTargets.add(key);
    evidenceTargetsByDiagnosis.set(diagnosisId, diagnosisTargets);
  }

  for (const row of rows.decision_evidence_links ?? []) {
    evidenceCountByTarget.set(
      targetKey("decision", row.decision_id),
      (evidenceCountByTarget.get(targetKey("decision", row.decision_id)) ?? 0) +
        1,
    );
  }

  return {
    regionIdsByEntry,
    symptomIdsByEntry,
    triggerIdsByEntry,
    entryRowsById,
    attachmentIdsByTarget,
    diagnosisIdsByTarget,
    evidenceCountByTarget,
    evidenceTargetsByDiagnosis,
  };
}

function normalizeTimelineItem(
  item: Omit<TimelineItem, "id"> & { id: string },
): TimelineItem {
  return timelineItemSchema.parse({
    ...item,
    ended_at: item.ended_at ?? null,
    summary: item.summary ?? null,
    body_region_ids: unique(item.body_region_ids ?? []),
    symptom_ids: unique(item.symptom_ids ?? []),
    trigger_ids: unique(item.trigger_ids ?? []),
    diagnosis_ids: unique(item.diagnosis_ids ?? []),
    attachment_ids: unique(item.attachment_ids ?? []),
    evidence_count: item.evidence_count ?? 0,
    metadata: item.metadata ?? {},
  });
}

export function buildTimelinePage(
  sourceRows: TimelineSourceRows,
  input: TimelineFilter,
  sourceCapsHit: TimelineSourceTable[] = [],
): TimelinePage {
  const parsed = timelineFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  const maps = buildLookupMaps(sourceRows);
  const items: TimelineItem[] = [];

  const pushItem = (
    tableType: string,
    row: Row,
    item: Omit<TimelineItem, "id" | "source_id"> & { source_id?: string },
  ) => {
    const sourceId = item.source_id ?? String(row.id);
    const key = targetKey(tableType, sourceId);
    const attachmentIds = [
      ...(item.attachment_ids ?? []),
      ...(maps.attachmentIdsByTarget.get(key) ?? []),
    ];
    const diagnosisIds = [
      ...(item.diagnosis_ids ?? []),
      ...(maps.diagnosisIdsByTarget.get(key) ?? []),
    ];

    items.push(
      normalizeTimelineItem({
        id: `${item.source_table}:${sourceId}`,
        source_id: sourceId,
        ...item,
        attachment_ids: attachmentIds,
        diagnosis_ids: diagnosisIds,
        evidence_count:
          (item.evidence_count ?? 0) +
          (maps.evidenceCountByTarget.get(key) ?? 0),
        metadata: {
          ...(item.metadata ?? {}),
          attachment_count: unique(attachmentIds).length,
          attachment_preview_id: attachmentIds[0] ?? null,
        },
      }),
    );
  };

  for (const row of sourceRows.entries ?? []) {
    const entryId = String(row.id);
    pushItem("entry", row, {
      source_table: "entries",
      item_type: entryItemType(row),
      occurred_at: toIsoDateTime(row.occurred_at),
      ended_at: row.ended_at ? toIsoDateTime(row.ended_at) : null,
      title: String(row.title ?? "Entry"),
      summary: row.notes ? String(row.notes) : null,
      body_region_ids: maps.regionIdsByEntry.get(entryId) ?? [],
      symptom_ids: maps.symptomIdsByEntry.get(entryId) ?? [],
      trigger_ids: maps.triggerIdsByEntry.get(entryId) ?? [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        entry_type: row.type,
        is_flare: Boolean(row.is_flare),
        pain_current: row.pain_current ?? null,
        pain_peak: row.pain_peak ?? null,
      },
    });
  }

  for (const row of sourceRows.flare_checkpoints ?? []) {
    const entry = maps.entryRowsById.get(String(row.entry_id));
    const entryId = String(row.entry_id);
    pushItem("flare_checkpoint", row, {
      source_table: "flare_checkpoints",
      item_type: "flare",
      occurred_at: toIsoDateTime(row.checkpoint_at),
      ended_at: null,
      title: `Flare checkpoint ${String(row.checkpoint_type)}`,
      summary: row.notes ? String(row.notes) : null,
      body_region_ids: maps.regionIdsByEntry.get(entryId) ?? [],
      symptom_ids: maps.symptomIdsByEntry.get(entryId) ?? [],
      trigger_ids: maps.triggerIdsByEntry.get(entryId) ?? [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        checkpoint_type: row.checkpoint_type,
        pain_score: row.pain_score ?? null,
        entry_id: entryId,
        entry_title: entry?.title ?? null,
      },
    });
  }

  for (const row of sourceRows.events ?? []) {
    pushItem("event", row, {
      source_table: "events",
      item_type: eventItemType(row.type),
      occurred_at: toIsoDateTime(row.occurred_at),
      ended_at: row.ended_at ? toIsoDateTime(row.ended_at) : null,
      title: String(row.title ?? "Event"),
      summary: row.summary ? String(row.summary) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        event_type: row.type,
        provider: row.provider ?? null,
        source_id: row.source_id ?? null,
        answered_question: row.answered_question ?? null,
      },
    });
  }

  for (const row of sourceRows.appointments ?? []) {
    pushItem("appointment", row, {
      source_table: "appointments",
      item_type: "appointment",
      occurred_at: toIsoDateTime(row.date_time),
      ended_at: null,
      title: String(row.purpose ?? "Appointment"),
      summary: row.provider ? String(row.provider) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        status: row.status,
        specialty: row.specialty ?? null,
        location: row.location ?? null,
      },
    });
  }

  for (const row of sourceRows.medications ?? []) {
    pushItem("medication", row, {
      source_table: "medications",
      item_type: "medication_change",
      occurred_at: toDateTimeFromDate(row.start_date, row.created_at),
      ended_at: row.stop_date
        ? toDateTimeFromDate(row.stop_date, row.stop_date)
        : null,
      title: String(row.name ?? "Medication"),
      summary: row.reason ? String(row.reason) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        status: row.status,
        dose: row.dose ?? null,
        route: row.route ?? null,
      },
    });
  }

  for (const row of sourceRows.medication_responses ?? []) {
    pushItem("medication_response", row, {
      source_table: "medication_responses",
      item_type: "medication_change",
      occurred_at: toIsoDateTime(row.taken_at),
      ended_at: null,
      title: String(row.reason ?? "Medication response"),
      summary: row.notes ? String(row.notes) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        medication_id: row.medication_id ?? null,
        entry_id: row.entry_id ?? null,
        helped: row.helped ?? null,
      },
    });
  }

  for (const row of sourceRows.decisions ?? []) {
    pushItem("decision", row, {
      source_table: "decisions",
      item_type: "decision",
      occurred_at: toDateTimeFromDate(row.target_date, row.updated_at),
      ended_at: null,
      title: String(row.title ?? "Decision"),
      summary: row.question ? String(row.question) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        status: row.status,
        owner: row.owner ?? null,
        target_date: row.target_date ?? null,
      },
    });
  }

  for (const row of sourceRows.sources ?? []) {
    pushItem("source", row, {
      source_table: "sources",
      item_type: row.source_type === "upload" ? "uploaded_media" : "source",
      occurred_at: toDateTimeFromDate(row.source_date, row.created_at),
      ended_at: null,
      title: String(row.title ?? "Source"),
      summary: row.summary ? String(row.summary) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        source_type: row.source_type,
        provider: row.provider ?? null,
        tags: toStringArray(row.tags),
      },
    });
  }

  for (const row of sourceRows.diagnoses ?? []) {
    pushItem("diagnosis", row, {
      source_table: "diagnoses",
      item_type: "diagnosis_update",
      occurred_at: toIsoDateTime(row.last_reviewed_at ?? row.updated_at),
      ended_at: null,
      title: String(row.title ?? "Diagnosis"),
      summary: row.summary ? String(row.summary) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [String(row.id)],
      attachment_ids: [],
      evidence_count: 0,
      metadata: {
        status: row.status,
        confidence: row.confidence,
        parent_diagnosis_id: row.parent_diagnosis_id ?? null,
      },
    });
  }

  for (const row of sourceRows.attachments ?? []) {
    pushItem("attachment", row, {
      source_table: "attachments",
      item_type: "uploaded_media",
      occurred_at: toIsoDateTime(row.captured_at ?? row.created_at),
      ended_at: null,
      title: String(row.file_name ?? "Attachment"),
      summary: row.description ? String(row.description) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: [String(row.id)],
      evidence_count: 0,
      metadata: {
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        file_path: row.file_path,
      },
    });
  }

  for (const row of sourceRows.vasomotor_measurements ?? []) {
    const attachmentIds = [
      row.left_attachment_id ? String(row.left_attachment_id) : null,
      row.right_attachment_id ? String(row.right_attachment_id) : null,
    ].filter((id): id is string => id !== null);

    pushItem("vasomotor_measurement", row, {
      source_table: "vasomotor_measurements",
      item_type: "vasomotor_measurement",
      occurred_at: toIsoDateTime(row.measured_at),
      ended_at: null,
      title: `Vasomotor measurement: ${String(row.site ?? "site")}`,
      summary: row.notes ? String(row.notes) : null,
      body_region_ids: [],
      symptom_ids: [],
      trigger_ids: [],
      diagnosis_ids: [],
      attachment_ids: attachmentIds,
      evidence_count: 0,
      metadata: {
        entry_id: row.entry_id ?? null,
        site: row.site,
        delta_c: row.delta_c ?? null,
        context: row.context,
      },
    });
  }

  const diagnosticTargets = parsed.diagnostic_branch_id
    ? (maps.evidenceTargetsByDiagnosis.get(parsed.diagnostic_branch_id) ??
      new Set<TargetKey>())
    : null;

  const filtered = items
    .filter((item) =>
      parsed.date_from ? item.occurred_at >= parsed.date_from : true,
    )
    .filter((item) =>
      parsed.date_to ? item.occurred_at <= parsed.date_to : true,
    )
    .filter((item) => (parsed.cursor ? item.occurred_at < parsed.cursor : true))
    .filter((item) =>
      parsed.item_type ? item.item_type === parsed.item_type : true,
    )
    .filter((item) =>
      parsed.body_region_id
        ? item.body_region_ids.includes(parsed.body_region_id)
        : true,
    )
    .filter((item) =>
      parsed.symptom_id ? item.symptom_ids.includes(parsed.symptom_id) : true,
    )
    .filter((item) =>
      parsed.trigger_id ? item.trigger_ids.includes(parsed.trigger_id) : true,
    )
    .filter((item) =>
      parsed.diagnostic_branch_id
        ? item.diagnosis_ids.includes(parsed.diagnostic_branch_id) ||
          item.source_id === parsed.diagnostic_branch_id ||
          diagnosticTargets?.has(
            targetKey(
              linkedTypeForSourceTable(item.source_table),
              item.source_id,
            ),
          )
        : true,
    )
    .filter((item) => (parsed.flare_only ? item.item_type === "flare" : true))
    .filter((item) =>
      parsed.media_only
        ? item.source_table === "attachments" || item.attachment_ids.length > 0
        : true,
    )
    .sort(compareTimelineItems);

  const pageItems = filtered.slice(0, pageSize);
  const overflow = filtered[pageSize];

  return timelinePageSchema.parse({
    items: pageItems,
    next_cursor: overflow ? overflow.occurred_at : null,
    page_size: pageSize,
    source_truncated: sourceCapsHit.length > 0 ? true : undefined,
    metadata: {
      source_row_limit: TIMELINE_SOURCE_ROW_LIMIT,
      source_caps_hit: sourceCapsHit,
      warnings:
        sourceCapsHit.length > 0
          ? [
              {
                code: "TIMELINE_SOURCE_CAP_HIT",
                message:
                  "Timeline source queries are capped at 1000 rows per table; results may be incomplete.",
                source_tables: sourceCapsHit,
              },
            ]
          : [],
    },
  });
}

async function selectRows(
  supabase: SupabaseClient,
  tableName: TimelineSourceTable,
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .is("deleted_at", null)
    .limit(TIMELINE_SOURCE_ROW_LIMIT + 1);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Row[];

  return {
    rows: rows.slice(0, TIMELINE_SOURCE_ROW_LIMIT),
    capHit: rows.length > TIMELINE_SOURCE_ROW_LIMIT,
  };
}

export async function listTimelineItems(
  input: TimelineFilter,
  supabase: SupabaseClient,
): Promise<TimelinePage> {
  timelineFilterSchema.parse(input);
  await requireCurrentProfile(supabase);

  const sourceRows: TimelineSourceRows = {};
  const sourceCapsHit: TimelineSourceTable[] = [];
  const results = await Promise.all(
    TIMELINE_QUERY_TABLES.map((table) => selectRows(supabase, table)),
  );

  TIMELINE_QUERY_TABLES.forEach((table, index) => {
    sourceRows[table] = results[index].rows;
    if (results[index].capHit) {
      sourceCapsHit.push(table);
    }
  });

  return buildTimelinePage(sourceRows, input, sourceCapsHit);
}
