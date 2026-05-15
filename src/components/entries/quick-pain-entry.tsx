"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { strings } from "@/lib/strings";

import { createEntry } from "@/server/actions/entries";
import type {
  BodyRegionDTO,
  CreateEntryInput,
  EntryType,
} from "@/server/contracts";

import { PainSegmented } from "./pain-segmented";
import { ToggleChip } from "./toggle-chip";

const quickStrings = strings.painBook.quick;
const baselineLabel = strings.painBook.types.baseline;

const VISIBLE_REGION_LIMIT = 6;
const SAVED_BADGE_DURATION_MS = 3000;

export interface QuickPainEntryProps {
  bodyRegions: BodyRegionDTO[];
  recentRegionIds?: string[];
}

function orderRegions(
  regions: BodyRegionDTO[],
  recentRegionIds: string[] | undefined,
): BodyRegionDTO[] {
  if (!recentRegionIds || recentRegionIds.length === 0) {
    return [...regions].sort((a, b) => a.display_order - b.display_order);
  }
  // Recent ids first (preserving order), then everything else by display_order.
  const byId = new Map(regions.map((region) => [region.id, region]));
  const seen = new Set<string>();
  const recent: BodyRegionDTO[] = [];
  for (const id of recentRegionIds) {
    const region = byId.get(id);
    if (region && !seen.has(id)) {
      recent.push(region);
      seen.add(id);
    }
  }
  const rest = regions
    .filter((region) => !seen.has(region.id))
    .sort((a, b) => a.display_order - b.display_order);
  return [...recent, ...rest];
}

export function QuickPainEntry({
  bodyRegions,
  recentRegionIds,
}: QuickPainEntryProps) {
  const router = useRouter();

  const orderedRegions = React.useMemo(
    () => orderRegions(bodyRegions, recentRegionIds),
    [bodyRegions, recentRegionIds],
  );
  const visibleRegions = orderedRegions.slice(0, VISIBLE_REGION_LIMIT);
  const hasOverflow = orderedRegions.length > VISIBLE_REGION_LIMIT;

  const [pain, setPain] = React.useState<number | undefined>(undefined);
  const [notes, setNotes] = React.useState("");
  const [selectedRegions, setSelectedRegions] = React.useState<Set<string>>(
    new Set(),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [overflowOpen, setOverflowOpen] = React.useState(false);

  // Auto-fade the "Saved" badge after a few seconds.
  React.useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => {
      setSavedAt(null);
    }, SAVED_BADGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  const toggleRegion = React.useCallback((regionId: string) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  }, []);

  const resetForm = React.useCallback(() => {
    setPain(undefined);
    setNotes("");
    setSelectedRegions(new Set());
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    // Light client-side validation: at minimum require a pain digit, a note,
    // or one body region — otherwise the entry is empty noise.
    const hasPain = pain !== undefined;
    const hasNotes = notes.trim().length > 0;
    const hasRegion = selectedRegions.size > 0;
    if (!hasPain && !hasNotes && !hasRegion) {
      setServerError(quickStrings.validationMissingPain);
      return;
    }

    const occurredAt = new Date().toISOString();
    const type: EntryType = "baseline";
    // Mirror EntryForm's auto-title behaviour: derive a default so the server
    // contract's `title.min(1)` does not block the submit.
    const autoTitle = `${baselineLabel} · ${formatDateTime(occurredAt)}`;

    const payload: CreateEntryInput = {
      type,
      occurred_at: occurredAt,
      title: autoTitle,
      pain_current: hasPain ? pain : undefined,
      notes: hasNotes ? notes.trim() : undefined,
      body_region_ids: Array.from(selectedRegions),
      function_impact: [],
      interventions_tried: [],
      symptoms: [],
      triggers: [],
      is_flare: false,
    };

    setSubmitting(true);
    try {
      const result = await createEntry(payload);
      if (!result.ok) {
        setServerError(result.error.message);
        return;
      }
      resetForm();
      setSavedAt(Date.now());
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-label={quickStrings.heading}
      className="rounded-md border border-border bg-card p-4"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight">
              {quickStrings.heading}
            </h2>
            <p className="text-xs text-muted-foreground">{quickStrings.hint}</p>
          </div>
          {savedAt !== null ? (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
              {quickStrings.savedBadge}
            </span>
          ) : null}
        </div>

        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>{quickStrings.errorTitle}</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto] lg:items-end">
          {/* 1. Pain segmented (focal action) */}
          <div className="flex flex-col gap-1">
            <span
              id="quick-pain-label"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {quickStrings.painLabel}
            </span>
            <PainSegmented
              value={pain}
              onChange={(next) => setPain(next)}
              ariaLabel={quickStrings.painLabel}
              disabled={submitting}
            />
          </div>

          {/* 2. Body region chips, recent first, with overflow Sheet */}
          <div className="flex flex-col gap-1">
            <span
              id="quick-regions-label"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {quickStrings.bodyRegionsLabel}
            </span>
            {orderedRegions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {quickStrings.noRegionsAvailable}
              </p>
            ) : (
              <div
                role="group"
                aria-labelledby="quick-regions-label"
                className="flex flex-wrap gap-1.5 overflow-x-auto"
              >
                {visibleRegions.map((region) => {
                  const active = selectedRegions.has(region.id);
                  return (
                    <ToggleChip
                      key={region.id}
                      active={active}
                      disabled={submitting}
                      onToggle={() => toggleRegion(region.id)}
                    >
                      {region.name}
                    </ToggleChip>
                  );
                })}
                {hasOverflow ? (
                  <ToggleChip
                    active={false}
                    disabled={submitting}
                    onToggle={() => setOverflowOpen(true)}
                    aria-label={quickStrings.more}
                  >
                    {quickStrings.more}
                  </ToggleChip>
                ) : null}
              </div>
            )}
          </div>

          {/* 3. Notes input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="quick-pain-notes"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {quickStrings.notesAriaLabel}
            </label>
            <Input
              id="quick-pain-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={quickStrings.notesPlaceholder}
              disabled={submitting}
              autoComplete="off"
            />
          </div>

          {/* 4. Save */}
          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full lg:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  {quickStrings.saving}
                </>
              ) : (
                quickStrings.save
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/pain-book/new"
            className={cn(
              "text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
            )}
          >
            {quickStrings.fullEntry}
          </Link>
        </div>
      </form>

      <Sheet open={overflowOpen} onOpenChange={setOverflowOpen}>
        <SheetContent side="right" className="flex flex-col gap-3">
          <SheetHeader>
            <SheetTitle>{quickStrings.moreSheetTitle}</SheetTitle>
            <SheetDescription>
              {quickStrings.moreSheetDescription}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {orderedRegions.map((region) => {
                const active = selectedRegions.has(region.id);
                return (
                  <ToggleChip
                    key={region.id}
                    active={active}
                    onToggle={() => toggleRegion(region.id)}
                  >
                    {region.name}
                  </ToggleChip>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-end border-t border-border px-4 py-3">
            <SheetClose asChild>
              <Button type="button" size="sm">
                {quickStrings.moreSheetDone}
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
