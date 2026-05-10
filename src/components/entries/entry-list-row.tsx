import Link from "next/link";
import { format as formatDate } from "date-fns";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { strings, format as formatString } from "@/lib/strings";
import type { EntryDTO } from "@/server/contracts";
import { cn } from "@/lib/utils";

export interface EntryListRowProps {
  entry: EntryDTO;
  href: string;
  hasAttachments?: boolean;
  variant: "pain" | "log";
}

function formatOccurredAt(iso: string): string {
  try {
    return formatDate(new Date(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function EntryListRow({
  entry,
  href,
  hasAttachments,
  variant,
}: EntryListRowProps) {
  const typeLabel =
    strings.painBook.types[entry.type as keyof typeof strings.painBook.types] ??
    entry.type;
  const regionCount = entry.body_region_ids?.length ?? 0;
  const regionStrings =
    variant === "pain" ? strings.painBook.list : strings.logBook.list;
  const regionTemplate =
    regionCount === 1
      ? regionStrings.regionCount
      : regionStrings.regionCountPlural;
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
            {formatOccurredAt(entry.occurred_at)}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {entry.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {variant === "pain" ? (
            <Badge variant="muted">{typeLabel}</Badge>
          ) : null}
          {entry.pain_peak !== null ? (
            <Badge variant={entry.pain_peak >= 8 ? "destructive" : "primary"}>
              Peak {entry.pain_peak}
            </Badge>
          ) : null}
          {regionCount > 0 ? (
            <Badge variant="muted">
              {formatString(regionTemplate, { count: regionCount })}
            </Badge>
          ) : null}
          {hasAttachments ? (
            <span
              className="inline-flex items-center text-muted-foreground"
              aria-label={regionStrings.attachmentsLabel}
              title={regionStrings.attachmentsLabel}
            >
              <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
      {entry.notes ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {entry.notes}
        </p>
      ) : null}
    </Link>
  );
}
