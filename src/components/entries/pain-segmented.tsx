"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

export interface PainSegmentedProps {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function PainSegmented({
  value,
  onChange,
  id,
  ariaLabel,
  disabled,
}: PainSegmentedProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        id={id}
        role="radiogroup"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1"
      >
        {Array.from({ length: 11 }).map((_, n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(n)}
              disabled={disabled}
              className={cn(
                "h-9 min-w-[2.25rem] flex-1 rounded-md border px-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {strings.painBook.form.painScale}
        </p>
        {value !== undefined && value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            disabled={disabled}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            {strings.actions.clear}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
