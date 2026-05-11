import { ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { AppleHealthPageClient } from "@/components/apple-health/apple-health-page-client";
import { DailySummaryPanel } from "@/components/apple-health/daily-summary-panel";
import { ImportHistoryList } from "@/components/apple-health/import-history-list";
import {
  ALL_METRIC_TYPES,
  FEATURED_METRIC_TYPES,
} from "@/components/apple-health/metric-meta";
import { RawSamplesPanel } from "@/components/apple-health/raw-samples-panel";
import { canWrite } from "@/lib/auth";
import { strings } from "@/lib/strings";
import {
  listAppleHealthDailySummaries,
  listAppleHealthImports,
} from "@/server/actions/apple-health";
import type {
  AppleHealthDailySummaryFilter,
  AppleHealthMetricType,
} from "@/server/contracts";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_METRIC: AppleHealthMetricType = "step_count";
const METRIC_SET: ReadonlySet<string> = new Set(ALL_METRIC_TYPES);

function pickMetric(raw: string | undefined): AppleHealthMetricType {
  if (raw && METRIC_SET.has(raw)) return raw as AppleHealthMetricType;
  return DEFAULT_METRIC;
}

function pickDate(raw: string | undefined): string | null {
  if (raw && DATE_REGEX.test(raw)) return raw;
  return null;
}

interface AppleHealthPageProps {
  searchParams: Promise<{
    metric?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AppleHealthPage({
  searchParams,
}: AppleHealthPageProps) {
  const params = await searchParams;
  const metric = pickMetric(params.metric);
  const dateFrom = pickDate(params.from);
  const dateTo = pickDate(params.to);

  const profile = await loadShellProfile();
  const writable = canWrite(profile?.role);

  const summaryFilter: AppleHealthDailySummaryFilter = {
    page_size: 200,
    metric_type: metric,
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const [importsResult, summariesResult] = await Promise.all([
    listAppleHealthImports({ page_size: 20 }),
    listAppleHealthDailySummaries(summaryFilter),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.appleHealth.navLabel}
        title={strings.appleHealth.title}
        description={strings.appleHealth.subtitle}
      />

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertDescription>{strings.appleHealth.boundary}</AlertDescription>
      </Alert>

      <AppleHealthPageClient canWrite={writable} />

      {!importsResult.ok ? (
        <ErrorState
          title={strings.appleHealth.history.loadError}
          message={importsResult.error.message}
        />
      ) : (
        <ImportHistoryList imports={importsResult.data.items} />
      )}

      <DailySummaryPanel
        metric={metric}
        dateFrom={dateFrom}
        dateTo={dateTo}
        summaries={summariesResult.ok ? summariesResult.data.items : []}
        errorMessage={summariesResult.ok ? null : summariesResult.error.message}
      />

      <RawSamplesPanel
        initialMetric={
          FEATURED_METRIC_TYPES.includes(metric) ? metric : DEFAULT_METRIC
        }
      />
    </div>
  );
}
