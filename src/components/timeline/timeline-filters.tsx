"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/entries/field";

import { strings, format as formatString } from "@/lib/strings";
import {
  toLocalDateTimeInputValue,
  fromLocalDateTimeInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import type {
  BodyRegionDTO,
  DiagnosisNode,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

const TIMELINE_ITEM_TYPES = [
  "injury",
  "procedure",
  "imaging",
  "test_lab",
  "consult",
  "medication_change",
  "flare",
  "pain_entry",
  "log_entry",
  "uploaded_media",
  "decision",
  "appointment",
  "diagnosis_update",
  "source",
  "export_packet",
  "vasomotor_measurement",
] as const;

export type TimelineItemTypeKey = (typeof TIMELINE_ITEM_TYPES)[number];

const ANY_VALUE = "__any__";

export interface TimelineFiltersProps {
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
  branches: DiagnosisNode[];
  initial: {
    date_from: string | null;
    date_to: string | null;
    item_type: TimelineItemTypeKey | null;
    body_region_id: string | null;
    symptom_id: string | null;
    trigger_id: string | null;
    diagnostic_branch_id: string | null;
    flare_only: boolean;
    media_only: boolean;
  };
}

interface DraftState {
  date_from: string;
  date_to: string;
  item_type: string;
  body_region_id: string;
  symptom_id: string;
  trigger_id: string;
  diagnostic_branch_id: string;
  flare_only: boolean;
  media_only: boolean;
}

function buildDraft(initial: TimelineFiltersProps["initial"]): DraftState {
  return {
    date_from: initial.date_from
      ? toLocalDateTimeInputValue(initial.date_from)
      : "",
    date_to: initial.date_to ? toLocalDateTimeInputValue(initial.date_to) : "",
    item_type: initial.item_type ?? ANY_VALUE,
    body_region_id: initial.body_region_id ?? ANY_VALUE,
    symptom_id: initial.symptom_id ?? ANY_VALUE,
    trigger_id: initial.trigger_id ?? ANY_VALUE,
    diagnostic_branch_id: initial.diagnostic_branch_id ?? ANY_VALUE,
    flare_only: initial.flare_only,
    media_only: initial.media_only,
  };
}

function activeFilterCount(initial: TimelineFiltersProps["initial"]): number {
  let count = 0;
  if (initial.date_from) count += 1;
  if (initial.date_to) count += 1;
  if (initial.item_type) count += 1;
  if (initial.body_region_id) count += 1;
  if (initial.symptom_id) count += 1;
  if (initial.trigger_id) count += 1;
  if (initial.diagnostic_branch_id) count += 1;
  if (initial.flare_only) count += 1;
  if (initial.media_only) count += 1;
  return count;
}

export function TimelineFilters({
  bodyRegions,
  symptoms,
  triggers,
  branches,
  initial,
}: TimelineFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const initialActive = activeFilterCount(initial);
  const [open, setOpen] = React.useState(initialActive > 0);
  const [draft, setDraft] = React.useState<DraftState>(buildDraft(initial));

  React.useEffect(() => {
    setDraft(buildDraft(initial));
  }, [initial]);

  const orderedRegions = React.useMemo(
    () => [...bodyRegions].sort((a, b) => a.display_order - b.display_order),
    [bodyRegions],
  );
  const orderedSymptoms = React.useMemo(
    () => [...symptoms].sort((a, b) => a.display_order - b.display_order),
    [symptoms],
  );
  const orderedTriggers = React.useMemo(
    () => [...triggers].sort((a, b) => a.display_order - b.display_order),
    [triggers],
  );
  const orderedBranches = React.useMemo(
    () =>
      [...branches].sort((a, b) =>
        a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase()),
      ),
    [branches],
  );

  const apply = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    const setOrDelete = (key: string, value: string | undefined | null) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    const dateFromIso = fromLocalDateTimeInputValue(draft.date_from);
    const dateToIso = fromLocalDateTimeInputValue(draft.date_to);

    setOrDelete("date_from", dateFromIso);
    setOrDelete("date_to", dateToIso);
    setOrDelete(
      "item_type",
      draft.item_type === ANY_VALUE ? undefined : draft.item_type,
    );
    setOrDelete(
      "body_region_id",
      draft.body_region_id === ANY_VALUE ? undefined : draft.body_region_id,
    );
    setOrDelete(
      "symptom_id",
      draft.symptom_id === ANY_VALUE ? undefined : draft.symptom_id,
    );
    setOrDelete(
      "trigger_id",
      draft.trigger_id === ANY_VALUE ? undefined : draft.trigger_id,
    );
    setOrDelete(
      "diagnostic_branch_id",
      draft.diagnostic_branch_id === ANY_VALUE
        ? undefined
        : draft.diagnostic_branch_id,
    );
    if (draft.flare_only) params.set("flare_only", "1");
    else params.delete("flare_only");
    if (draft.media_only) params.set("media_only", "1");
    else params.delete("media_only");

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  const clear = () => {
    setDraft({
      date_from: "",
      date_to: "",
      item_type: ANY_VALUE,
      body_region_id: ANY_VALUE,
      symptom_id: ANY_VALUE,
      trigger_id: ANY_VALUE,
      diagnostic_branch_id: ANY_VALUE,
      flare_only: false,
      media_only: false,
    });
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "hover:bg-muted",
          )}
          aria-expanded={open}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          {strings.timeline.filters.title}
          {initialActive > 0 ? (
            <Badge variant="primary">
              {formatString(strings.timeline.filters.activeCount, {
                count: initialActive,
              })}
            </Badge>
          ) : null}
        </button>
        {initialActive > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={pending}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            {strings.timeline.filters.clear}
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              id="timeline-date-from"
              label={strings.timeline.filters.dateFrom}
              optional
            >
              <Input
                id="timeline-date-from"
                type="datetime-local"
                value={draft.date_from}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    date_from: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              id="timeline-date-to"
              label={strings.timeline.filters.dateTo}
              optional
            >
              <Input
                id="timeline-date-to"
                type="datetime-local"
                value={draft.date_to}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    date_to: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              id="timeline-item-type"
              label={strings.timeline.filters.itemType}
              optional
            >
              <Select
                value={draft.item_type}
                onValueChange={(next) =>
                  setDraft((prev) => ({ ...prev, item_type: next }))
                }
              >
                <SelectTrigger id="timeline-item-type">
                  <SelectValue
                    placeholder={strings.timeline.filters.itemTypeAll}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.timeline.filters.itemTypeAll}
                  </SelectItem>
                  {TIMELINE_ITEM_TYPES.map((typeKey) => (
                    <SelectItem key={typeKey} value={typeKey}>
                      {strings.timeline.itemTypes[typeKey]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="timeline-branch"
              label={strings.timeline.filters.branch}
              optional
            >
              <Select
                value={draft.diagnostic_branch_id}
                onValueChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    diagnostic_branch_id: next,
                  }))
                }
              >
                <SelectTrigger id="timeline-branch">
                  <SelectValue placeholder={strings.timeline.filters.any} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.timeline.filters.any}
                  </SelectItem>
                  {orderedBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              id="timeline-region"
              label={strings.timeline.filters.bodyRegion}
              optional
            >
              <Select
                value={draft.body_region_id}
                onValueChange={(next) =>
                  setDraft((prev) => ({ ...prev, body_region_id: next }))
                }
              >
                <SelectTrigger id="timeline-region">
                  <SelectValue placeholder={strings.timeline.filters.any} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.timeline.filters.any}
                  </SelectItem>
                  {orderedRegions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="timeline-symptom"
              label={strings.timeline.filters.symptom}
              optional
            >
              <Select
                value={draft.symptom_id}
                onValueChange={(next) =>
                  setDraft((prev) => ({ ...prev, symptom_id: next }))
                }
              >
                <SelectTrigger id="timeline-symptom">
                  <SelectValue placeholder={strings.timeline.filters.any} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.timeline.filters.any}
                  </SelectItem>
                  {orderedSymptoms.map((symptom) => (
                    <SelectItem key={symptom.id} value={symptom.id}>
                      {symptom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="timeline-trigger"
              label={strings.timeline.filters.trigger}
              optional
            >
              <Select
                value={draft.trigger_id}
                onValueChange={(next) =>
                  setDraft((prev) => ({ ...prev, trigger_id: next }))
                }
              >
                <SelectTrigger id="timeline-trigger">
                  <SelectValue placeholder={strings.timeline.filters.any} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.timeline.filters.any}
                  </SelectItem>
                  {orderedTriggers.map((trigger) => (
                    <SelectItem key={trigger.id} value={trigger.id}>
                      {trigger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.flare_only}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    flare_only: checked === true,
                  }))
                }
              />
              <span>{strings.timeline.filters.flareOnly}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.media_only}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    media_only: checked === true,
                  }))
                }
              />
              <span>{strings.timeline.filters.mediaOnly}</span>
            </label>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending}
            >
              {strings.timeline.filters.clear}
            </Button>
            <Button type="button" size="sm" onClick={apply} disabled={pending}>
              {strings.timeline.filters.apply}
            </Button>
          </div>
        </div>
      ) : null}
      {/* sr-only label fallback so screen readers can describe the section */}
      <Label htmlFor="timeline-date-from" className="sr-only">
        {strings.timeline.filters.title}
      </Label>
    </div>
  );
}
