import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { strings, format as formatString } from "@/lib/strings";
import { formatDateTime } from "@/lib/format";
import type { MedicationResponse } from "@/server/contracts";
import { cn } from "@/lib/utils";

export interface ResponseListRowProps {
  response: MedicationResponse;
  medicationName: string | null;
  href: string;
}

const HELPED_VARIANTS: Record<
  Exclude<MedicationResponse["helped"], null>,
  "primary" | "muted" | "destructive"
> = {
  helped: "muted",
  unclear: "muted",
  worsened: "muted",
};

function painDeltaLabel(response: MedicationResponse): string | null {
  const before = response.pain_before;
  const after =
    response.pain_after_120m ??
    response.pain_after_60m ??
    response.pain_after_30m;
  if (before != null && after != null) {
    return formatString(strings.medications.list.painDelta, {
      before,
      after,
    });
  }
  if (before != null) {
    return formatString(strings.medications.list.painDeltaBefore, {
      value: before,
    });
  }
  if (after != null) {
    return formatString(strings.medications.list.painDeltaAfter, {
      value: after,
    });
  }
  return null;
}

export function ResponseListRow({
  response,
  medicationName,
  href,
}: ResponseListRowProps) {
  const delta = painDeltaLabel(response);
  const helpedLabel =
    response.helped !== null
      ? strings.medications.response.helpedValues[response.helped]
      : null;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatDateTime(response.taken_at)}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {medicationName ?? strings.medications.list.unknownMedication}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {delta ? <Badge variant="primary">{delta}</Badge> : null}
          {helpedLabel && response.helped ? (
            <Badge variant={HELPED_VARIANTS[response.helped]}>
              {helpedLabel}
            </Badge>
          ) : null}
        </div>
      </div>
      {response.reason ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {response.reason}
        </p>
      ) : null}
    </Link>
  );
}
