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
import type { BodyRegionDTO, PainByBodyRegionMetric } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { buildIdNameMap } from "@/lib/utils";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface PainByRegionChartProps {
  data: PainByBodyRegionMetric[];
  bodyRegions: BodyRegionDTO[];
}

export function PainByRegionChart({
  data,
  bodyRegions,
}: PainByRegionChartProps) {
  const regionNames = React.useMemo(
    () => buildIdNameMap(bodyRegions),
    [bodyRegions],
  );

  const rows = React.useMemo(
    () =>
      [...data]
        .filter((item) => item.average_pain_peak != null)
        .sort((a, b) => (b.average_pain_peak ?? 0) - (a.average_pain_peak ?? 0))
        .slice(0, 10)
        .map((item) => ({
          name:
            regionNames.get(item.body_region_id) ??
            strings.charts.unknownRegion,
          peak: Math.round((item.average_pain_peak ?? 0) * 10) / 10,
          count: item.entry_count,
        })),
    [data, regionNames],
  );

  return (
    <ChartCard title={strings.charts.painByRegion}>
      {rows.length === 0 ? (
        <ChartEmpty message={strings.charts.empty} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 10]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value) => [value, strings.charts.axes.pain]}
            />
            <Bar
              dataKey="peak"
              fill="hsl(var(--destructive))"
              radius={[0, 3, 3, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
