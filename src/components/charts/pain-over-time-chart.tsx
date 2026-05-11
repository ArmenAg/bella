"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { strings } from "@/lib/strings";
import { formatMonthDay } from "@/lib/format";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface PainOverTimePoint {
  occurred_at: string;
  pain_peak: number | null;
  pain_current: number | null;
}

export interface PainOverTimeChartProps {
  data: PainOverTimePoint[];
}

export function PainOverTimeChart({ data }: PainOverTimeChartProps) {
  const series = React.useMemo(
    () =>
      [...data]
        .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
        .map((item) => ({
          label: formatMonthDay(item.occurred_at),
          occurred_at: item.occurred_at,
          peak: item.pain_peak,
          current: item.pain_current,
        })),
    [data],
  );

  const hasAnyValue = series.some(
    (item) => item.peak !== null || item.current !== null,
  );

  return (
    <ChartCard title={strings.dashboard.sections.painOverTime}>
      {series.length === 0 || !hasAnyValue ? (
        <ChartEmpty message={strings.dashboard.empty.painOverTime} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
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
              domain={[0, 10]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => {
                const at = payload?.[0]?.payload?.occurred_at;
                return at ?? label;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="plainline"
              iconSize={12}
            />
            <Line
              type="monotone"
              name={strings.dashboard.painSeries.peak}
              dataKey="peak"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name={strings.dashboard.painSeries.current}
              dataKey="current"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
