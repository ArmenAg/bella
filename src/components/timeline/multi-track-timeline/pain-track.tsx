"use client";

import * as React from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format as formatDate, parseISO, isValid } from "date-fns";

import { strings } from "@/lib/strings";
import { ChartEmpty } from "@/components/charts/empty";

import type { FlareSession, PainPoint, VisibleWindow } from "./types";

export interface PainTrackProps {
  painPoints: PainPoint[];
  flareSessions: FlareSession[];
  window: VisibleWindow;
  showFlareBands: boolean;
  heightClass?: string;
  onHoverIso?: (iso: string | null) => void;
  hoveredIso?: string | null;
}

interface ChartDatum {
  ts: number; // epoch ms — Recharts XAxis is `number` so it stretches across the window
  iso: string;
  pain_current: number | null;
  pain_peak: number | null;
  pain_average: number | null;
  is_flare: boolean;
}

function safeMs(iso: string): number {
  const d = parseISO(iso);
  return isValid(d) ? d.getTime() : NaN;
}

/**
 * Pain track. A Recharts ComposedChart laid out so the X axis aligns with
 * the SVG event lanes underneath it (same numeric domain — epoch ms — fed
 * to both layers).
 *
 * IMPORTANT: this renders inside a fixed-height wrapper so Recharts never
 * boots at 0×0. Don't park it inside a <details> that's collapsed at first
 * paint or you'll see "The width(0) and height(0) of chart should be greater
 * than 0".
 */
export function PainTrack({
  painPoints,
  flareSessions,
  window,
  showFlareBands,
  heightClass = "h-[180px] min-h-[180px]",
  onHoverIso,
  hoveredIso,
}: PainTrackProps) {
  const fromMs = safeMs(window.from);
  const toMs = safeMs(window.to);

  const data = React.useMemo<ChartDatum[]>(() => {
    return painPoints
      .map((p) => {
        const ts = safeMs(p.occurred_at);
        if (!Number.isFinite(ts)) return null;
        return {
          ts,
          iso: p.occurred_at,
          pain_current: p.pain_current,
          pain_peak: p.pain_peak,
          pain_average: p.pain_average,
          is_flare: p.is_flare,
        } satisfies ChartDatum;
      })
      .filter((d): d is ChartDatum => d != null)
      .filter((d) => d.ts >= fromMs && d.ts <= toMs)
      .sort((a, b) => a.ts - b.ts);
  }, [painPoints, fromMs, toMs]);

  const visibleFlares = React.useMemo(() => {
    return flareSessions
      .map((f) => {
        const start = safeMs(f.start_at);
        const end = f.ended_at ? safeMs(f.ended_at) : toMs;
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        if (end < fromMs || start > toMs) return null;
        return {
          id: f.id,
          start: Math.max(start, fromMs),
          end: Math.min(end, toMs),
          title: f.title,
        };
      })
      .filter(
        (f): f is { id: string; start: number; end: number; title: string } =>
          f != null,
      );
  }, [flareSessions, fromMs, toMs]);

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return (
      <div className={heightClass}>
        <ChartEmpty message={strings.timelineSeries.pain.empty} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={heightClass}>
        <ChartEmpty message={strings.timelineSeries.pain.empty} />
      </div>
    );
  }

  return (
    <div className={heightClass} onMouseLeave={() => onHoverIso?.(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          // YAxis width below pads the left side so the plotting region
          // starts ~92px in. The event-tracks SVG starts its plot at
          // LABEL_COL_WIDTH=120 — close enough that ticks read together.
          onMouseMove={(state) => {
            if (!onHoverIso) return;
            // Recharts hands us the active payload at the cursor; fall back to
            // raw activeLabel which is the X domain value (ms).
            const stateAny = state as
              | {
                  activePayload?: Array<{ payload?: ChartDatum }>;
                  activeLabel?: number | string;
                }
              | undefined;
            const active = stateAny?.activePayload?.[0];
            const iso =
              active?.payload?.iso ??
              (typeof stateAny?.activeLabel === "number"
                ? new Date(stateAny.activeLabel).toISOString()
                : null);
            onHoverIso(iso);
          }}
        >
          <defs>
            <linearGradient id="painPeakGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[fromMs, toMs]}
            allowDataOverflow
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value: number) => {
              const d = new Date(value);
              return isValid(d) ? formatDate(d, "MMM yyyy") : "";
            }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={112}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--ring))", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(value) => {
              if (typeof value !== "number") return "";
              const d = new Date(value);
              return isValid(d) ? formatDate(d, "PP") : "";
            }}
            formatter={(value, name) => {
              if (value == null) return ["—", String(name)];
              return [String(value), String(name)];
            }}
          />
          {showFlareBands
            ? visibleFlares.map((f) => (
                <ReferenceArea
                  key={f.id}
                  x1={f.start}
                  x2={f.end}
                  y1={0}
                  y2={10}
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.12}
                  stroke="none"
                  ifOverflow="extendDomain"
                />
              ))
            : null}
          {hoveredIso ? (
            <ReferenceArea
              x1={safeMs(hoveredIso) - 1}
              x2={safeMs(hoveredIso) + 1}
              y1={0}
              y2={10}
              fill="hsl(var(--ring))"
              fillOpacity={0.6}
              stroke="none"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="pain_average"
            name={strings.timelineSeries.pain.average}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pain_current"
            name={strings.timelineSeries.pain.current}
            stroke="hsl(var(--accent))"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pain_peak"
            name={strings.timelineSeries.pain.peak}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2, strokeWidth: 0, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
