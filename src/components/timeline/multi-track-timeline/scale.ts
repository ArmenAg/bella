import {
  addDays,
  differenceInCalendarDays,
  parseISO,
  subMonths,
  subYears,
  format as formatDate,
  isValid,
} from "date-fns";

import type { DayEvent, TimelineSeries, VisibleWindow, ZoomKey } from "./types";

/**
 * Pure helpers for the multi-track timeline. No React, no DOM. All time
 * arithmetic goes through date-fns so DST handling stays consistent with
 * the rest of the app. Inputs are ISO strings; outputs are ISO strings or
 * pixel offsets so the React layer can stay declarative.
 */

const MS_PER_DAY = 86_400_000;

function safeParse(iso: string): Date {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) {
    return new Date(NaN);
  }
  return parsed;
}

export function makeTimeScale({
  fromIso,
  toIso,
  widthPx,
}: {
  fromIso: string;
  toIso: string;
  widthPx: number;
}): {
  xOf: (iso: string) => number;
  xToIso: (px: number) => string;
  domainMs: number;
} {
  const fromMs = safeParse(fromIso).getTime();
  const toMs = safeParse(toIso).getTime();
  const domainMs = Math.max(1, toMs - fromMs);
  const safeWidth = Math.max(1, widthPx);

  return {
    xOf(iso: string): number {
      const ms = safeParse(iso).getTime();
      if (!Number.isFinite(ms)) return 0;
      const ratio = (ms - fromMs) / domainMs;
      return Math.max(0, Math.min(safeWidth, ratio * safeWidth));
    },
    xToIso(px: number): string {
      const clamped = Math.max(0, Math.min(safeWidth, px));
      const ratio = clamped / safeWidth;
      const ms = fromMs + ratio * domainMs;
      return new Date(ms).toISOString();
    },
    domainMs,
  };
}

/**
 * Earliest date present in any series channel. Used as the lower bound
 * for the "all" zoom preset when no injury_date is set.
 */
function earliestSeriesIso(series: TimelineSeries): string | null {
  const candidates: string[] = [];
  for (const p of series.pain_points) candidates.push(p.occurred_at);
  for (const f of series.flare_sessions) candidates.push(f.start_at);
  for (const m of series.medications) {
    if (m.start_at) candidates.push(m.start_at);
  }
  for (const e of series.procedures) candidates.push(e.occurred_at);
  for (const c of series.consults) candidates.push(c.occurred_at);
  for (const d of series.diagnostic_milestones) candidates.push(d.occurred_at);
  for (const d of series.decisions) {
    if (d.target_date) candidates.push(d.target_date);
    if (d.decided_at) candidates.push(d.decided_at);
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((min, iso) =>
    safeParse(iso) < safeParse(min) ? iso : min,
  );
}

export function computeWindow({
  series,
  zoom,
}: {
  series: TimelineSeries;
  zoom: ZoomKey;
}): VisibleWindow {
  const today = safeParse(series.anchors.today);
  const todayIso = isValid(today)
    ? series.anchors.today
    : new Date().toISOString();
  const todayDate = safeParse(todayIso);
  const horizon = addDays(todayDate, 30);

  if (zoom === "all") {
    const lower =
      series.anchors.injury_date ??
      earliestSeriesIso(series) ??
      series.range.from;
    return { from: lower, to: horizon.toISOString() };
  }

  let from: Date;
  switch (zoom) {
    case "5y":
      from = subYears(todayDate, 5);
      break;
    case "1y":
      from = subYears(todayDate, 1);
      break;
    case "6mo":
      from = subMonths(todayDate, 6);
      break;
    case "3mo":
      from = subMonths(todayDate, 3);
      break;
    default:
      from = subYears(todayDate, 1);
  }
  return { from: from.toISOString(), to: horizon.toISOString() };
}

/**
 * Calendar-day key used to bucket events for the side panel and to compare
 * a hovered/selected pixel back to a discrete day. We use the local date
 * portion (YYYY-MM-DD); ISO datetimes get truncated.
 */
export function dayKey(iso: string): string {
  const d = safeParse(iso);
  if (!isValid(d)) return iso;
  return formatDate(d, "yyyy-MM-dd");
}

export function isSameDay(aIso: string, bIso: string): boolean {
  const a = safeParse(aIso);
  const b = safeParse(bIso);
  if (!isValid(a) || !isValid(b)) return false;
  return differenceInCalendarDays(a, b) === 0;
}

/**
 * Group every event in a TimelineSeries by calendar day. Used by the side
 * panel to list "what happened on Tuesday" in one shot.
 */
export function groupByDay(series: TimelineSeries): Map<string, DayEvent[]> {
  const map = new Map<string, DayEvent[]>();
  const push = (key: string, event: DayEvent) => {
    const existing = map.get(key);
    if (existing) {
      existing.push(event);
    } else {
      map.set(key, [event]);
    }
  };

  for (const p of series.pain_points) {
    push(dayKey(p.occurred_at), { kind: "pain_entry", payload: p });
  }
  for (const f of series.flare_sessions) {
    push(dayKey(f.start_at), { kind: "flare_session", payload: f });
  }
  for (const m of series.medications) {
    if (m.start_at) {
      push(dayKey(m.start_at), {
        kind: "medication",
        payload: m,
        boundary: "start",
      });
    }
    if (m.end_at) {
      push(dayKey(m.end_at), {
        kind: "medication",
        payload: m,
        boundary: "end",
      });
    }
  }
  for (const e of series.procedures) {
    push(dayKey(e.occurred_at), { kind: "procedure", payload: e });
  }
  for (const c of series.consults) {
    push(dayKey(c.occurred_at), { kind: "consult", payload: c });
  }
  for (const d of series.diagnostic_milestones) {
    push(dayKey(d.occurred_at), {
      kind: "diagnostic_milestone",
      payload: d,
    });
  }
  for (const d of series.decisions) {
    if (d.decided_at) {
      push(dayKey(d.decided_at), {
        kind: "decision",
        payload: d,
        boundary: "decided",
      });
    } else if (d.target_date) {
      push(dayKey(d.target_date), {
        kind: "decision",
        payload: d,
        boundary: "target",
      });
    }
  }
  return map;
}

/**
 * Pick "nice" tick positions across the visible window — month boundaries
 * for windows under ~2 years, otherwise quarters or years. Returns ISO
 * strings the SVG layer can hand to xOf().
 */
export function generateAxisTicks(window: VisibleWindow): string[] {
  const from = safeParse(window.from);
  const to = safeParse(window.to);
  if (!isValid(from) || !isValid(to)) return [];
  const span = to.getTime() - from.getTime();
  const days = span / MS_PER_DAY;

  const ticks: Date[] = [];
  if (days <= 95) {
    // Weekly-ish: every 14 days.
    let cur = new Date(from);
    while (cur <= to) {
      ticks.push(new Date(cur));
      cur = addDays(cur, 14);
    }
  } else if (days <= 540) {
    // Monthly.
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      ticks.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else if (days <= 1850) {
    // Quarterly.
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      ticks.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
    }
  } else {
    // Yearly.
    let cur = new Date(from.getFullYear(), 0, 1);
    while (cur <= to) {
      ticks.push(new Date(cur));
      cur = new Date(cur.getFullYear() + 1, 0, 1);
    }
  }

  return ticks.filter((d) => d >= from && d <= to).map((d) => d.toISOString());
}

export function formatTickLabel(iso: string, window: VisibleWindow): string {
  const date = safeParse(iso);
  if (!isValid(date)) return "";
  const span =
    safeParse(window.to).getTime() - safeParse(window.from).getTime();
  const days = span / MS_PER_DAY;
  if (days <= 95) return formatDate(date, "MMM d");
  if (days <= 540) return formatDate(date, "MMM yyyy");
  if (days <= 1850) {
    const m = date.getMonth();
    if (m === 0) return formatDate(date, "yyyy");
    return `Q${Math.floor(m / 3) + 1} ${formatDate(date, "yyyy")}`;
  }
  return formatDate(date, "yyyy");
}
