"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActiveFlare } from "@/components/shell/active-flare-context";
import { strings } from "@/lib/strings";
import { formatRelative } from "@/lib/format";
import { SectionCard } from "./section-card";

/**
 * Top-of-page summary of the currently active flare. Reads from the shell's
 * active-flare context (already populated upstream), so it stays in sync with
 * the global banner.
 */
export function ActiveFlareCard() {
  const flare = useActiveFlare();

  if (!flare) {
    // Hide entirely when no flare is active so the dashboard layout flows up.
    return null;
  }

  const { entry, checkpoints } = flare;

  return (
    <SectionCard
      title={strings.dashboard.sections.activeFlare}
      href="/flare"
      hrefLabel={strings.dashboard.openActiveFlare}
    >
      <Link
        href="/flare"
        className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Activity
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {strings.flare.banner.startedAt} {formatRelative(entry.occurred_at)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {entry.pain_peak !== null ? (
              <Badge variant="destructive">
                {strings.flare.banner.peakLabel} {entry.pain_peak}
              </Badge>
            ) : null}
            {entry.pain_current !== null ? (
              <Badge variant="primary">
                {strings.flare.active.now} {entry.pain_current}
              </Badge>
            ) : null}
            <Badge variant="muted">
              {checkpoints.length}{" "}
              {checkpoints.length === 1
                ? strings.flare.banner.checkpointSingular
                : strings.flare.banner.checkpointPlural}
            </Badge>
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </SectionCard>
  );
}
