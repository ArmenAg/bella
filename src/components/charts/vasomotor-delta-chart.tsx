"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VasomotorDeltaMetric } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface VasomotorDeltaChartProps {
  data: VasomotorDeltaMetric[];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return iso;
  }
}

export function VasomotorDeltaChart({ data }: VasomotorDeltaChartProps) {
  const rows = React.useMemo(
    () =>
      [...data]
        .filter((point) => point.delta_c != null)
        .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
        .map((point) => ({
          measured_at: point.measured_at,
          label: formatDate(point.measured_at),
          delta: Math.round((point.delta_c ?? 0) * 10) / 10,
          site: point.site,
        })),
    [data],
  );

  return (
    <ChartCard title={strings.charts.vasomotorDeltas}>
      {rows.length === 0 ? (
        <ChartEmpty message={strings.charts.empty} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => {
                const site = payload?.[0]?.payload?.site;
                return site ? `${label} · ${site}` : label;
              }}
              formatter={(value) => [value, strings.charts.axes.delta]}
            />
            <Line
              type="monotone"
              dataKey="delta"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
