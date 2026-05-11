"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AppleHealthDailySummary,
  AppleHealthMetricType,
} from "@/server/contracts";
import { formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import {
  FEATURED_METRIC_TYPES,
  formatMetricValue,
  metricLabel,
  preferredAggregate,
  valueForAggregate,
} from "./metric-meta";

interface DailySummaryPanelProps {
  metric: AppleHealthMetricType;
  dateFrom: string | null;
  dateTo: string | null;
  summaries: AppleHealthDailySummary[];
  errorMessage?: string | null;
}

export function DailySummaryPanel({
  metric,
  dateFrom,
  dateTo,
  summaries,
  errorMessage,
}: DailySummaryPanelProps) {
  const router = useRouter();
  const [pendingMetric, setPendingMetric] =
    React.useState<AppleHealthMetricType>(metric);
  const [pendingFrom, setPendingFrom] = React.useState(dateFrom ?? "");
  const [pendingTo, setPendingTo] = React.useState(dateTo ?? "");

  React.useEffect(() => setPendingMetric(metric), [metric]);
  React.useEffect(() => setPendingFrom(dateFrom ?? ""), [dateFrom]);
  React.useEffect(() => setPendingTo(dateTo ?? ""), [dateTo]);

  const apply = () => {
    const params = new URLSearchParams();
    params.set("metric", pendingMetric);
    if (pendingFrom) params.set("from", pendingFrom);
    if (pendingTo) params.set("to", pendingTo);
    router.push(`/apple-health?${params.toString()}`);
  };

  const clear = () => {
    setPendingFrom("");
    setPendingTo("");
    router.push("/apple-health");
  };

  const chartRows = React.useMemo(
    () =>
      [...summaries]
        .filter((s) => valueForAggregate(metric, s) != null)
        .sort((a, b) => a.summary_date.localeCompare(b.summary_date))
        .map((s) => ({
          date: s.summary_date,
          value: valueForAggregate(metric, s) ?? 0,
        })),
    [summaries, metric],
  );

  const tableRows = React.useMemo(
    () =>
      [...summaries].sort((a, b) =>
        b.summary_date.localeCompare(a.summary_date),
      ),
    [summaries],
  );

  const aggregate = preferredAggregate(metric);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon aria-hidden="true" className="h-4 w-4 text-primary" />
          {strings.appleHealth.summaries.title}
        </CardTitle>
        <CardDescription>{strings.appleHealth.summaries.hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ah-metric">
              {strings.appleHealth.summaries.filters.metric}
            </Label>
            <Select
              value={pendingMetric}
              onValueChange={(value) =>
                setPendingMetric(value as AppleHealthMetricType)
              }
            >
              <SelectTrigger id="ah-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURED_METRIC_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {metricLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ah-from">
              {strings.appleHealth.summaries.filters.dateFrom}
            </Label>
            <Input
              id="ah-from"
              type="date"
              value={pendingFrom}
              onChange={(event) => setPendingFrom(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ah-to">
              {strings.appleHealth.summaries.filters.dateTo}
            </Label>
            <Input
              id="ah-to"
              type="date"
              value={pendingTo}
              onChange={(event) => setPendingTo(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" size="sm" onClick={apply}>
              {strings.appleHealth.summaries.filters.apply}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              {strings.appleHealth.summaries.filters.clear}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : chartRows.length === 0 ? (
          <EmptyState
            icon={LineChartIcon}
            title={strings.appleHealth.summaries.empty.title}
            description={strings.appleHealth.summaries.empty.body}
          />
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatDate(String(value))}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelFormatter={(label) => formatDate(String(label))}
                    formatter={(value) => {
                      const numeric =
                        typeof value === "number"
                          ? value
                          : typeof value === "string"
                            ? Number(value)
                            : 0;
                      return [
                        formatMetricValue(metric, numeric),
                        metricLabel(metric),
                      ];
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.summaries.table.date}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {aggregate === "sum"
                        ? strings.appleHealth.summaries.table.value
                        : strings.appleHealth.summaries.table.avg}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.summaries.table.min}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.summaries.table.max}
                    </th>
                    <th className="py-1.5 pr-3 text-right font-medium">
                      {strings.appleHealth.summaries.table.samples}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-1.5 pr-3 font-mono">
                        {formatDate(row.summary_date)}
                      </td>
                      <td className="py-1.5 pr-3 font-medium text-foreground">
                        {formatMetricValue(
                          metric,
                          aggregate === "sum" ? row.value_sum : row.value_avg,
                          { unit: row.unit },
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {formatMetricValue(metric, row.value_min, {
                          unit: row.unit,
                        })}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {formatMetricValue(metric, row.value_max, {
                          unit: row.unit,
                        })}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-muted-foreground">
                        {row.sample_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
