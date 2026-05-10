"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/entries/field";

import { strings, format as formatString } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { SourceType } from "@/server/contracts";

const SOURCE_TYPES: SourceType[] = [
  "visit_note",
  "imaging_report",
  "lab_report",
  "generated_report",
  "literature",
  "upload",
  "other",
];

const ANY_VALUE = "__any__";

export interface SourceListFilterProps {
  initial: {
    source_type: SourceType | null;
    tag: string | null;
    date_from: string | null;
    date_to: string | null;
  };
}

interface DraftState {
  source_type: string;
  tag: string;
  date_from: string;
  date_to: string;
}

function buildDraft(initial: SourceListFilterProps["initial"]): DraftState {
  return {
    source_type: initial.source_type ?? ANY_VALUE,
    tag: initial.tag ?? "",
    date_from: initial.date_from ?? "",
    date_to: initial.date_to ?? "",
  };
}

function activeCount(initial: SourceListFilterProps["initial"]): number {
  let count = 0;
  if (initial.source_type) count += 1;
  if (initial.tag) count += 1;
  if (initial.date_from) count += 1;
  if (initial.date_to) count += 1;
  return count;
}

export function SourceListFilter({ initial }: SourceListFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const initialActive = activeCount(initial);
  const [open, setOpen] = React.useState(initialActive > 0);
  const [draft, setDraft] = React.useState<DraftState>(buildDraft(initial));

  React.useEffect(() => {
    setDraft(buildDraft(initial));
  }, [initial]);

  const apply = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const setOrDelete = (key: string, value: string | undefined | null) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete(
      "source_type",
      draft.source_type === ANY_VALUE ? undefined : draft.source_type,
    );
    setOrDelete("tag", draft.tag.trim() || undefined);
    setOrDelete("date_from", draft.date_from || undefined);
    setOrDelete("date_to", draft.date_to || undefined);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  const clear = () => {
    setDraft({
      source_type: ANY_VALUE,
      tag: "",
      date_from: "",
      date_to: "",
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
              {formatString(strings.sources.filters.activeCount, {
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
            {strings.sources.filters.clear}
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            id="source-filter-type"
            label={strings.sources.filters.type}
            optional
          >
            <Select
              value={draft.source_type}
              onValueChange={(next) =>
                setDraft((prev) => ({ ...prev, source_type: next }))
              }
            >
              <SelectTrigger id="source-filter-type">
                <SelectValue placeholder={strings.sources.filters.typeAny} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_VALUE}>
                  {strings.sources.filters.typeAny}
                </SelectItem>
                {SOURCE_TYPES.map((typeKey) => (
                  <SelectItem key={typeKey} value={typeKey}>
                    {
                      strings.sources.types[
                        typeKey as keyof typeof strings.sources.types
                      ]
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="source-filter-tag"
            label={strings.sources.filters.tag}
            optional
          >
            <Input
              id="source-filter-tag"
              value={draft.tag}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, tag: event.target.value }))
              }
              placeholder={strings.sources.filters.tagPlaceholder}
            />
          </Field>
          <Field
            id="source-filter-from"
            label={strings.sources.filters.dateFrom}
            optional
          >
            <Input
              id="source-filter-from"
              type="date"
              value={draft.date_from}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, date_from: event.target.value }))
              }
            />
          </Field>
          <Field
            id="source-filter-to"
            label={strings.sources.filters.dateTo}
            optional
          >
            <Input
              id="source-filter-to"
              type="date"
              value={draft.date_to}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, date_to: event.target.value }))
              }
            />
          </Field>
          <div className="col-span-full flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending}
            >
              {strings.sources.filters.clear}
            </Button>
            <Button type="button" size="sm" onClick={apply} disabled={pending}>
              {strings.sources.filters.apply}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
