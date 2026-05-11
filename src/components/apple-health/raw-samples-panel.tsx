"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Table2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAppleHealthSamples } from "@/server/actions/apple-health";
import type {
  AppleHealthMetricType,
  AppleHealthSample,
} from "@/server/contracts";
import { formatDateTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { cn } from "@/lib/utils";
import { FEATURED_METRIC_TYPES, metricLabel } from "./metric-meta";

const PAGE_SIZE = 50;

interface RawSamplesPanelProps {
  initialMetric: AppleHealthMetricType;
}

export function RawSamplesPanel({ initialMetric }: RawSamplesPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [metric, setMetric] =
    React.useState<AppleHealthMetricType>(initialMetric);
  const [samples, setSamples] = React.useState<AppleHealthSample[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadInitial = React.useCallback(async (next: AppleHealthMetricType) => {
    setLoading(true);
    setError(null);
    const result = await listAppleHealthSamples({
      page_size: PAGE_SIZE,
      normalized_type: next,
    });
    setLoading(false);
    if (!result.ok) {
      setError(userFacingErrorMessage(result.error));
      setSamples([]);
      setCursor(null);
      return;
    }
    setSamples(result.data.items);
    setCursor(result.data.next_cursor);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void loadInitial(metric);
  }, [open, metric, loadInitial]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    const result = await listAppleHealthSamples({
      page_size: PAGE_SIZE,
      normalized_type: metric,
      cursor,
    });
    setLoading(false);
    if (!result.ok) {
      setError(userFacingErrorMessage(result.error));
      return;
    }
    setSamples((prev) => [...prev, ...result.data.items]);
    setCursor(result.data.next_cursor);
  };

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          <span className="flex items-center gap-2">
            {open ? (
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            )}
            <CardTitle className="flex items-center gap-2">
              <Table2 aria-hidden="true" className="h-4 w-4 text-primary" />
              {strings.appleHealth.samples.title}
            </CardTitle>
          </span>
        </button>
        {open ? (
          <CardDescription>{strings.appleHealth.samples.hint}</CardDescription>
        ) : null}
      </CardHeader>
      {open ? (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="ah-samples-metric">
              {strings.appleHealth.samples.filters.metric}
            </Label>
            <Select
              value={metric}
              onValueChange={(value) =>
                setMetric(value as AppleHealthMetricType)
              }
            >
              <SelectTrigger id="ah-samples-metric">
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

          {error ? (
            <ErrorState message={error} />
          ) : samples.length === 0 && !loading ? (
            <EmptyState
              icon={Table2}
              title={strings.appleHealth.samples.empty}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.samples.table.source}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.samples.table.start}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.samples.table.end}
                    </th>
                    <th className="py-1.5 pr-3 text-right font-medium">
                      {strings.appleHealth.samples.table.value}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.samples.table.unit}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {strings.appleHealth.samples.table.type}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample) => (
                    <tr key={sample.id} className="border-b border-border/60">
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {sample.source_name ?? "—"}
                      </td>
                      <td className="py-1.5 pr-3 font-mono">
                        {sample.start_at
                          ? formatDateTime(sample.start_at)
                          : "—"}
                      </td>
                      <td className="py-1.5 pr-3 font-mono">
                        {sample.end_at ? formatDateTime(sample.end_at) : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium text-foreground">
                        {sample.value_numeric != null
                          ? sample.value_numeric.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : (sample.value_text ?? "—")}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {sample.unit ?? "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {sample.sample_kind}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cursor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadMore()}
              disabled={loading}
              className="self-start"
            >
              {loading
                ? strings.appleHealth.samples.loadingMore
                : strings.appleHealth.samples.loadMore}
            </Button>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
