import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import type { AppleHealthImport } from "@/server/contracts";
import { formatDate, formatDateTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

interface ImportHistoryListProps {
  imports: AppleHealthImport[];
  errorMessage?: string | null;
}

function statusVariant(status: AppleHealthImport["status"]) {
  if (status === "completed") return "primary" as const;
  if (status === "failed") return "destructive" as const;
  return "accent" as const;
}

export function ImportHistoryList({
  imports,
  errorMessage,
}: ImportHistoryListProps) {
  if (errorMessage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.appleHealth.history.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message={errorMessage} />
        </CardContent>
      </Card>
    );
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.appleHealth.history.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={History}
            title={strings.appleHealth.history.empty.title}
            description={strings.appleHealth.history.empty.body}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History aria-hidden="true" className="h-4 w-4 text-primary" />
          {strings.appleHealth.history.title}
        </CardTitle>
        <CardDescription>{strings.appleHealth.upload.safe}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {imports.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {item.file_name ?? "—"}
                </p>
                <Badge variant={statusVariant(item.status)}>
                  {strings.appleHealth.history.statuses[item.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {strings.appleHealth.history.createdAt}:{" "}
                {formatDateTime(item.created_at)}
                {item.export_started_at && item.export_ended_at
                  ? ` · ${strings.appleHealth.history.dateRange}: ${formatDate(item.export_started_at)} → ${formatDate(item.export_ended_at)}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Stat
                  label={strings.appleHealth.history.imported}
                  value={item.imported_sample_count}
                />
                <Stat
                  label={strings.appleHealth.history.duplicates}
                  value={item.duplicate_sample_count}
                />
                <Stat
                  label={strings.appleHealth.history.skipped}
                  value={item.skipped_record_count}
                />
                <Stat
                  label={strings.appleHealth.history.dailySummaries}
                  value={item.daily_summary_count}
                />
              </div>
              {item.error_message ? (
                <p className={cn("text-xs text-destructive")}>
                  {item.error_message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="font-medium text-foreground">
        {value.toLocaleString()}
      </span>{" "}
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  );
}
