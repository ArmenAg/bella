"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyFlareMetric } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { formatMonthDay } from "@/lib/format";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface FlareFrequencyChartProps {
  data: WeeklyFlareMetric[];
}

export function FlareFrequencyChart({ data }: FlareFrequencyChartProps) {
  const sorted = React.useMemo(
    () =>
      [...data]
        .sort((a, b) => a.week_start.localeCompare(b.week_start))
        .map((item) => ({
          weekLabel: formatMonthDay(item.week_start),
          weekStart: item.week_start,
          count: item.flare_count,
        })),
    [data],
  );

  return (
    <ChartCard title={strings.charts.flaresPerWeek}>
      {sorted.length === 0 ? (
        <ChartEmpty message={strings.charts.empty} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => {
                const week = payload?.[0]?.payload?.weekStart;
                return week ?? label;
              }}
              formatter={(value) => [value, strings.charts.axes.count]}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
