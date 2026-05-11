"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Medication, MedicationResponseSummary } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { buildIdNameMap } from "@/lib/utils";
import { ChartCard } from "./chart-card";
import { ChartEmpty } from "./empty";

export interface MedicationResponseSummaryChartProps {
  data: MedicationResponseSummary[];
  medications: Medication[];
}

export function MedicationResponseSummaryChart({
  data,
  medications,
}: MedicationResponseSummaryChartProps) {
  const medicationNames = React.useMemo(
    () => buildIdNameMap(medications),
    [medications],
  );

  const rows = React.useMemo(
    () =>
      [...data]
        .filter((item) => item.response_count > 0)
        .sort((a, b) => b.response_count - a.response_count)
        .slice(0, 8)
        .map((item) => ({
          name:
            (item.medication_id && medicationNames.get(item.medication_id)) ||
            strings.charts.unknownMedication,
          helped: item.helped_count,
          unclear: item.unclear_count,
          worsened: item.worsened_count,
        })),
    [data, medicationNames],
  );

  return (
    <ChartCard title={strings.charts.medicationResponse}>
      {rows.length === 0 ? (
        <ChartEmpty message={strings.charts.empty} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
            barCategoryGap={4}
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
            />
            <Legend
              verticalAlign="bottom"
              height={20}
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar
              dataKey="helped"
              name={strings.charts.legend.helped}
              stackId="response"
              fill="hsl(var(--primary))"
            />
            <Bar
              dataKey="unclear"
              name={strings.charts.legend.unclear}
              stackId="response"
              fill="hsl(var(--muted-foreground))"
            />
            <Bar
              dataKey="worsened"
              name={strings.charts.legend.worsened}
              stackId="response"
              fill="hsl(var(--destructive))"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
