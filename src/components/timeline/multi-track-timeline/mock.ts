import { addDays, formatISO, subDays, subMonths } from "date-fns";

import type {
  ConsultMarker,
  DecisionMarker,
  DiagnosticMilestoneMarker,
  FlareSession,
  MedicationRange,
  PainPoint,
  TimelineEventMarker,
  TimelineSeries,
} from "./types";

/**
 * Fixed mock series for storybook/dev. Used by the page integration agent
 * when the live query returns empty in dev. All dates are anchored to a
 * fixed `today` so snapshot tests stay stable.
 */
const TODAY = new Date("2026-05-10T12:00:00.000Z");

function iso(date: Date): string {
  return formatISO(date);
}

const painPoints: PainPoint[] = (() => {
  const points: PainPoint[] = [];
  // 50 pain points roughly weekly over 18 months.
  for (let i = 50; i >= 0; i -= 1) {
    const at = subDays(TODAY, i * 11);
    const flare = i % 8 === 0;
    const base = 4 + Math.sin(i / 3) * 1.5;
    const peak = Math.min(10, base + (flare ? 4 : 1.5));
    const current = Math.max(0, base + (flare ? 2 : 0));
    const avg = Math.max(0, base);
    points.push({
      entry_id: `mock-pain-${i}`,
      occurred_at: iso(at),
      pain_current: Math.round(current),
      pain_peak: Math.round(peak),
      pain_average: Math.round(avg),
      is_flare: flare,
    });
  }
  return points;
})();

const flareSessions: FlareSession[] = [
  {
    id: "mock-flare-1",
    start_at: iso(subMonths(TODAY, 16)),
    ended_at: iso(addDays(subMonths(TODAY, 16), 4)),
    peak_pain: 9,
    title: "Flare after long flight",
  },
  {
    id: "mock-flare-2",
    start_at: iso(subMonths(TODAY, 8)),
    ended_at: iso(addDays(subMonths(TODAY, 8), 6)),
    peak_pain: 8,
    title: "Cold-weather flare",
  },
  {
    id: "mock-flare-3",
    start_at: iso(subDays(TODAY, 5)),
    ended_at: null,
    peak_pain: 7,
    title: "Current flare",
  },
];

const medications: MedicationRange[] = [
  {
    id: "mock-med-1",
    name: "Gabapentin",
    dose: "300mg TID",
    start_at: iso(subMonths(TODAY, 17)),
    end_at: null,
    status: "active",
    helped_pain: true,
  },
  {
    id: "mock-med-2",
    name: "Duloxetine",
    dose: "60mg",
    start_at: iso(subMonths(TODAY, 6)),
    end_at: null,
    status: "active",
    helped_pain: null,
  },
  {
    id: "mock-med-3",
    name: "Tramadol",
    dose: "50mg PRN",
    start_at: iso(subMonths(TODAY, 14)),
    end_at: iso(subMonths(TODAY, 9)),
    status: "stopped",
    helped_pain: false,
  },
  {
    id: "mock-med-4",
    name: "Lidocaine patch",
    dose: "5%",
    start_at: iso(subMonths(TODAY, 4)),
    end_at: iso(subMonths(TODAY, 2)),
    status: "stopped",
    helped_pain: false,
  },
];

const procedures: TimelineEventMarker[] = [
  {
    id: "mock-proc-1",
    occurred_at: iso(subMonths(TODAY, 17)),
    ended_at: null,
    title: "Initial stab wound",
    summary: "L lateral thigh injury",
    kind: "injury",
  },
  {
    id: "mock-proc-2",
    occurred_at: iso(subMonths(TODAY, 12)),
    ended_at: null,
    title: "Lumbar MRI",
    summary: "Unremarkable",
    kind: "imaging",
  },
  {
    id: "mock-proc-3",
    occurred_at: iso(subMonths(TODAY, 10)),
    ended_at: null,
    title: "Diagnostic nerve block",
    summary: "Lateral femoral cutaneous",
    kind: "procedure",
  },
  {
    id: "mock-proc-4",
    occurred_at: iso(subMonths(TODAY, 7)),
    ended_at: null,
    title: "EMG / NCS",
    summary: "Mild changes",
    kind: "test_lab",
  },
  {
    id: "mock-proc-5",
    occurred_at: iso(subMonths(TODAY, 4)),
    ended_at: null,
    title: "Hip MRI",
    summary: "Normal",
    kind: "imaging",
  },
  {
    id: "mock-proc-6",
    occurred_at: iso(subMonths(TODAY, 1)),
    ended_at: null,
    title: "Trigger point injection",
    summary: null,
    kind: "procedure",
  },
];

const consults: ConsultMarker[] = [
  {
    id: "mock-consult-1",
    occurred_at: iso(subMonths(TODAY, 13)),
    provider: "Dr. Patel",
    specialty: "Pain medicine",
    purpose: "Initial consult",
    summary: null,
  },
  {
    id: "mock-consult-2",
    occurred_at: iso(subMonths(TODAY, 9)),
    provider: "Dr. Lee",
    specialty: "Neurology",
    purpose: "Neuropathic pain workup",
    summary: null,
  },
  {
    id: "mock-consult-3",
    occurred_at: iso(subMonths(TODAY, 5)),
    provider: "Dr. Cho",
    specialty: "Orthopedics",
    purpose: "Hip and thigh evaluation",
    summary: null,
  },
  {
    id: "mock-consult-4",
    occurred_at: iso(subMonths(TODAY, 2)),
    provider: "Dr. Patel",
    specialty: "Pain medicine",
    purpose: "Follow-up",
    summary: null,
  },
];

const diagnosticMilestones: DiagnosticMilestoneMarker[] = [
  {
    id: "mock-dx-1",
    occurred_at: iso(subMonths(TODAY, 11)),
    diagnosis_id: "dx-neuropathic",
    diagnosis_name: "Neuropathic pain",
    status_to: "supported",
    notes: "Symptoms map to LFCN distribution.",
  },
  {
    id: "mock-dx-2",
    occurred_at: iso(subMonths(TODAY, 6)),
    diagnosis_id: "dx-radiculopathy",
    diagnosis_name: "Lumbar radiculopathy",
    status_to: "ruled_out",
    notes: "MRI clean, EMG without root signs.",
  },
  {
    id: "mock-dx-3",
    occurred_at: iso(subMonths(TODAY, 1)),
    diagnosis_id: "dx-meralgia",
    diagnosis_name: "Meralgia paresthetica",
    status_to: "monitoring",
    notes: "Provisional; awaiting block response.",
  },
];

const decisions: DecisionMarker[] = [
  {
    id: "mock-dec-1",
    title: "Try repeat nerve block",
    target_date: "2026-06-15",
    decided_at: null,
    status: "pending",
  },
  {
    id: "mock-dec-2",
    title: "Discontinue tramadol",
    target_date: null,
    decided_at: iso(subMonths(TODAY, 9)),
    status: "decided",
  },
];

export const MOCK_TIMELINE_SERIES: TimelineSeries = {
  range: {
    from: iso(subMonths(TODAY, 18)),
    to: iso(addDays(TODAY, 30)),
  },
  anchors: {
    injury_date: iso(subMonths(TODAY, 17)),
    today: iso(TODAY),
  },
  pain_points: painPoints,
  flare_sessions: flareSessions,
  medications,
  procedures,
  consults,
  diagnostic_milestones: diagnosticMilestones,
  decisions,
};
