"use client";

import * as React from "react";
import type { RecoveryMetric } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { ChartCard } from "./chart-card";

export interface RecoveryTimeChartProps {
  data: RecoveryMetric;
}

function formatMinutes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return strings.charts.summary.noData;
  }
  if (value < 60) return `${Math.round(value)}m`;
  const hours = Math.floor(value / 60);
  const remainder = Math.round(value % 60);
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

/**
 * Stat block (not a chart) summarizing recovery — count, average, median.
 * Lives inside the same chart row so the section composition is even.
 */
export function RecoveryTimeChart({ data }: RecoveryTimeChartProps) {
  return (
    <ChartCard title={strings.charts.recoveryTime}>
      <div className="grid h-full grid-cols-3 items-center gap-3">
        <Stat
          label={strings.charts.summary.flareCount}
          value={String(data.flare_count)}
        />
        <Stat
          label={strings.charts.summary.averageRecovery}
          value={formatMinutes(data.average_recovery_minutes)}
        />
        <Stat
          label={strings.charts.summary.medianRecovery}
          value={formatMinutes(data.median_recovery_minutes)}
        />
      </div>
    </ChartCard>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card/40 px-2 py-3 text-center">
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
