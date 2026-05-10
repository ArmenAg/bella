"use client";

import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActiveFlare } from "./active-flare-context";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export function ActiveFlareBanner({ className }: { className?: string }) {
  const flare = useActiveFlare();
  if (!flare) return null;

  const checkpointCount = flare.checkpoints.length;
  const peak = flare.entry.pain_peak ?? flare.entry.pain_current;

  return (
    <Link
      href="/flare"
      className={cn(
        "flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-destructive/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
      aria-label={strings.flare.banner.openLabel}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
        <Activity aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {flare.entry.title || strings.flare.banner.fallbackTitle}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {strings.flare.banner.startedAt}{" "}
          {formatRelative(flare.entry.occurred_at)}
          {checkpointCount > 0
            ? ` · ${checkpointCount} ${
                checkpointCount === 1
                  ? strings.flare.banner.checkpointSingular
                  : strings.flare.banner.checkpointPlural
              }`
            : ""}
        </p>
      </div>
      {peak != null ? (
        <Badge variant="destructive">
          {strings.flare.banner.peakLabel} {peak}
        </Badge>
      ) : null}
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 text-muted-foreground"
      />
    </Link>
  );
}
