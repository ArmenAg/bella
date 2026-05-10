/**
 * Contract for the multi-track timeline view. The page integration agent
 * fetches data and reshapes it into `TimelineSeries` server-side; this
 * component is purely a presentation layer (props in, no @/server imports).
 */

export interface PainPoint {
  entry_id: string;
  occurred_at: string; // ISO datetime
  pain_current: number | null; // 0-10
  pain_peak: number | null;
  pain_average: number | null;
  is_flare: boolean;
}

export interface FlareSession {
  id: string;
  start_at: string;
  ended_at: string | null; // null = ongoing
  peak_pain: number | null;
  title: string;
}

export interface MedicationRange {
  id: string;
  name: string;
  dose: string | null;
  start_at: string | null;
  end_at: string | null; // null = ongoing
  status: "active" | "paused" | "stopped" | "planned";
  helped_pain: boolean | null;
}

export type EventMarkerKind =
  | "injury"
  | "procedure"
  | "imaging"
  | "test_lab"
  | "medication_change";

export interface TimelineEventMarker {
  id: string;
  occurred_at: string;
  ended_at: string | null;
  title: string;
  summary: string | null;
  kind: EventMarkerKind;
}

export interface ConsultMarker {
  id: string;
  occurred_at: string;
  provider: string | null;
  specialty: string | null;
  purpose: string;
  summary: string | null;
}

export type DiagnosisStatusTo =
  | "unreviewed"
  | "suspected"
  | "supported"
  | "weakened"
  | "ruled_out"
  | "confirmed"
  | "monitoring";

export interface DiagnosticMilestoneMarker {
  id: string;
  occurred_at: string;
  diagnosis_id: string;
  diagnosis_name: string;
  status_to: DiagnosisStatusTo;
  notes: string | null;
}

export interface DecisionMarker {
  id: string;
  title: string;
  target_date: string | null; // YYYY-MM-DD
  decided_at: string | null;
  status: string;
}

export interface TimelineSeries {
  range: { from: string; to: string };
  anchors: { injury_date: string | null; today: string };
  pain_points: PainPoint[];
  flare_sessions: FlareSession[];
  medications: MedicationRange[];
  procedures: TimelineEventMarker[];
  consults: ConsultMarker[];
  diagnostic_milestones: DiagnosticMilestoneMarker[];
  decisions: DecisionMarker[];
}

export type ZoomKey = "all" | "5y" | "1y" | "6mo" | "3mo";

export interface VisibleWindow {
  from: string; // ISO
  to: string; // ISO
}

export interface TrackVisibility {
  pain: true; // pain track is always visible
  medications: boolean;
  procedures: boolean;
  consults: boolean;
  diagnostic_milestones: boolean;
  decisions: boolean;
  flare_bands: boolean;
}

/**
 * Discriminated union used by the side panel. Lets us list every event
 * that lands on a single calendar day under one type and a "kind" tag.
 */
export type DayEvent =
  | { kind: "pain_entry"; payload: PainPoint }
  | { kind: "flare_session"; payload: FlareSession }
  | { kind: "medication"; payload: MedicationRange; boundary: "start" | "end" }
  | { kind: "procedure"; payload: TimelineEventMarker }
  | { kind: "consult"; payload: ConsultMarker }
  | { kind: "diagnostic_milestone"; payload: DiagnosticMilestoneMarker }
  | {
      kind: "decision";
      payload: DecisionMarker;
      boundary: "target" | "decided";
    };
