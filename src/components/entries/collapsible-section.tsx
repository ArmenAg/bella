"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleSectionProps {
  /**
   * Visible heading for the disclosure (e.g. the card title text).
   */
  title: string;
  /**
   * Tiny hint shown to the right of the title when collapsed
   * (e.g. "body regions, symptoms, triggers"). Optional.
   */
  hint?: string;
  /**
   * Whether the disclosure should start expanded. The form decides this
   * based on edit-mode + whether any underlying values are present.
   */
  defaultOpen?: boolean;
  /**
   * Optional class on the outer <details> element.
   */
  className?: string;
  /**
   * Optional class on the inner content wrapper (after the summary).
   */
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * Minimal accessible disclosure wrapper built on the native <details>/<summary>
 * pair so we get keyboard + screen-reader support for free. Designed to slot
 * inside (or replace) a Card when we want optional sections to start hidden.
 */
export function CollapsibleSection({
  title,
  hint,
  defaultOpen,
  className,
  contentClassName,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-lg border border-border bg-card", className)}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3",
          "rounded-lg px-4 py-3 text-sm font-medium",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold text-foreground">
            {title}
          </span>
          {hint ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
        <span
          className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span className="hidden group-open:inline">Hide</span>
          <span className="inline group-open:hidden">Add</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div
        className={cn("flex flex-col gap-5 px-4 pb-4 pt-1", contentClassName)}
      >
        {children}
      </div>
    </details>
  );
}
