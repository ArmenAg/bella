import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Source } from "@/server/contracts";

export interface SourceRowProps {
  source: Source;
  href: string;
}

export function SourceRow({ source, href }: SourceRowProps) {
  const typeLabel =
    strings.sources.types[source.source_type] ?? source.source_type;
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
            {source.source_date ? formatDate(source.source_date) : typeLabel}
            {source.source_date && source.provider ? " · " : ""}
            {source.provider ?? ""}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {source.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">{typeLabel}</Badge>
        </div>
      </div>

      {source.summary ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {source.summary}
        </p>
      ) : null}

      {source.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {source.tags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          {source.tags.length > 6 ? (
            <span className="text-xs text-muted-foreground">
              +{source.tags.length - 6}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
