"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Check, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useActiveFlare } from "./active-flare-context";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

import { addFlareCheckpoint } from "@/server/actions/flares";
import type { FlareCheckpointInput } from "@/server/contracts";

const bannerActionStrings = strings.flare.banner.actions;

type CheckpointType = FlareCheckpointInput["checkpoint_type"];

const QUICK_CHIPS: ReadonlyArray<{ type: CheckpointType; label: string }> = [
  { type: "30m", label: bannerActionStrings.add30m },
  { type: "60m", label: bannerActionStrings.add60m },
  { type: "120m", label: bannerActionStrings.add2h },
];

export function ActiveFlareBanner({ className }: { className?: string }) {
  const flare = useActiveFlare();
  const router = useRouter();
  const [pendingType, setPendingType] = React.useState<CheckpointType | null>(
    null,
  );

  if (!flare) return null;

  const checkpointCount = flare.checkpoints.length;
  const peak = flare.entry.pain_peak ?? flare.entry.pain_current;
  const existingTypes = new Set<CheckpointType>(
    flare.checkpoints.map((cp) => cp.checkpoint_type),
  );
  const entryId = flare.entry.id;

  const handleQuickChip = async (type: CheckpointType) => {
    if (pendingType) return;
    setPendingType(type);
    try {
      const result = await addFlareCheckpoint({
        entry_id: entryId,
        checkpoint_type: type,
        checkpoint_at: new Date().toISOString(),
        pain_score: undefined,
        symptoms: [],
        notes: undefined,
      });
      if (result.ok) {
        router.refresh();
      }
      // Silently swallow errors at the banner level — the user can tap into
      // the flare view to see the full error UI. The banner is a glance, not
      // a form.
    } finally {
      setPendingType(null);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-rose-100/80",
        className,
      )}
    >
      <Link
        href="/flare"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        aria-label={strings.flare.banner.openLabel}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-700">
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
          className="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        {QUICK_CHIPS.map((chip) => {
          const alreadyLogged = existingTypes.has(chip.type);
          const isPending = pendingType === chip.type;
          const disabled = alreadyLogged || pendingType !== null;
          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => handleQuickChip(chip.type)}
              disabled={disabled}
              aria-label={
                alreadyLogged
                  ? `${chip.label} — ${bannerActionStrings.alreadyLogged}`
                  : chip.label
              }
              title={
                alreadyLogged ? bannerActionStrings.alreadyLogged : undefined
              }
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
                alreadyLogged
                  ? "border-rose-200 bg-rose-50 text-rose-700/70 line-through"
                  : "border-rose-300 bg-white text-rose-700 hover:bg-rose-100",
              )}
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
              ) : alreadyLogged ? (
                <Check aria-hidden="true" className="h-3 w-3" />
              ) : null}
              <span>{chip.label}</span>
            </button>
          );
        })}
        <Link
          href="/flare"
          aria-label={bannerActionStrings.endFlareLabel}
          className={cn(
            "inline-flex h-7 items-center rounded-md border border-rose-300 bg-white px-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          {bannerActionStrings.end}
        </Link>
      </div>
    </div>
  );
}
