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
import type { TriggerFrequencyMetric, TriggerDTO } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface TriggerFrequencyChartProps {
  data: TriggerFrequencyMetric[];
  triggers: TriggerDTO[];
}

export function TriggerFrequencyChart({
  data,
  triggers,
}: TriggerFrequencyChartProps) {
  const triggerNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const trigger of triggers) {
      map.set(trigger.id, trigger.name);
    }
    return map;
  }, [triggers]);

  const rows = React.useMemo(
    () =>
      [...data]
        .sort((a, b) => b.entry_count - a.entry_count)
        .slice(0, 10)
        .map((item) => ({
          name:
            triggerNames.get(item.trigger_id) ?? strings.charts.unknownTrigger,
          count: item.entry_count,
        })),
    [data, triggerNames],
  );

  return (
    <ChartCard title={strings.charts.triggerFrequency}>
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
              allowDecimals={false}
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
              formatter={(value) => [value, strings.charts.axes.count]}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[0, 3, 3, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
