import { z } from "zod";
import {
  dateSchema,
  painScoreSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";
import { decisionStatusSchema } from "./decisions";
import { diagnosisStatusSchema } from "./diagnoses";
import { medicationStatusSchema } from "./medications";

export const timelineSeriesFilterSchema = z.object({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
});

export const painPointSchema = z.object({
  entry_id: uuidSchema,
  occurred_at: utcDateTimeSchema,
  pain_current: painScoreSchema.nullable(),
  pain_peak: painScoreSchema.nullable(),
  pain_average: painScoreSchema.nullable(),
  is_flare: z.boolean(),
});

export const flareSessionMarkerSchema = z.object({
  id: uuidSchema,
  start_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  peak_pain: painScoreSchema.nullable(),
  title: z.string(),
});

export const medicationRangeSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  dose: z.string().nullable(),
  start_at: utcDateTimeSchema.nullable(),
  end_at: utcDateTimeSchema.nullable(),
  status: medicationStatusSchema,
  helped_pain: z.boolean().nullable(),
});

export const timelineEventMarkerKindSchema = z.enum([
  "injury",
  "procedure",
  "imaging",
  "test_lab",
  "medication_change",
]);

export const timelineEventMarkerSchema = z.object({
  id: uuidSchema,
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  kind: timelineEventMarkerKindSchema,
});

export const consultMarkerSchema = z.object({
  id: uuidSchema,
  occurred_at: utcDateTimeSchema,
  provider: z.string().nullable(),
  specialty: z.string().nullable(),
  purpose: z.string(),
  summary: z.string().nullable(),
});

export const diagnosticMilestoneMarkerSchema = z.object({
  id: uuidSchema,
  occurred_at: utcDateTimeSchema,
  diagnosis_id: uuidSchema,
  diagnosis_name: z.string(),
  status_to: diagnosisStatusSchema,
  notes: z.string().nullable(),
});

export const decisionMarkerSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  target_date: dateSchema.nullable(),
  decided_at: utcDateTimeSchema.nullable(),
  status: decisionStatusSchema,
});

export const timelineSeriesAnchorsSchema = z.object({
  injury_date: utcDateTimeSchema.nullable(),
  today: utcDateTimeSchema,
});

export const timelineSeriesRangeSchema = z.object({
  from: utcDateTimeSchema,
  to: utcDateTimeSchema,
});

export const timelineSeriesSchema = z.object({
  range: timelineSeriesRangeSchema,
  anchors: timelineSeriesAnchorsSchema,
  pain_points: z.array(painPointSchema),
  flare_sessions: z.array(flareSessionMarkerSchema),
  medications: z.array(medicationRangeSchema),
  procedures: z.array(timelineEventMarkerSchema),
  consults: z.array(consultMarkerSchema),
  diagnostic_milestones: z.array(diagnosticMilestoneMarkerSchema),
  decisions: z.array(decisionMarkerSchema),
});

export type TimelineSeriesFilter = z.input<typeof timelineSeriesFilterSchema>;
export type PainPoint = z.infer<typeof painPointSchema>;
export type FlareSessionMarker = z.infer<typeof flareSessionMarkerSchema>;
export type MedicationRange = z.infer<typeof medicationRangeSchema>;
export type TimelineEventMarker = z.infer<typeof timelineEventMarkerSchema>;
export type TimelineEventMarkerKind = z.infer<
  typeof timelineEventMarkerKindSchema
>;
export type ConsultMarker = z.infer<typeof consultMarkerSchema>;
export type DiagnosticMilestoneMarker = z.infer<
  typeof diagnosticMilestoneMarkerSchema
>;
export type DecisionMarker = z.infer<typeof decisionMarkerSchema>;
export type TimelineSeriesAnchors = z.infer<typeof timelineSeriesAnchorsSchema>;
export type TimelineSeriesRange = z.infer<typeof timelineSeriesRangeSchema>;
export type TimelineSeries = z.infer<typeof timelineSeriesSchema>;
