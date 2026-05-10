"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

export interface TrendsAccordionProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible wrapper for the dashboard "Trends" section.
 *
 * Charts (Recharts ResponsiveContainer) measure their parent on mount and
 * warn when the parent has zero dimensions. A `<details>` element hides its
 * content with `display: none` while collapsed, so the charts cannot
 * measure on first render. This component only mounts its children after
 * the user expands the section, side-stepping the measurement issue.
 */
export function TrendsAccordion({
  children,
  defaultOpen = false,
  className,
}: TrendsAccordionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{strings.dashboard.sections.trends}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium normal-case tracking-normal text-primary">
          {open
            ? strings.dashboard.trendsToggle.hide
            : strings.dashboard.trendsToggle.show}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 transition-transform",
              open ? "rotate-180" : undefined,
            )}
          />
        </span>
      </button>
      {open ? (
        <div
          id={contentId}
          aria-label={strings.dashboard.sections.trends}
          role="region"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
