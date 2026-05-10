"use client";

import * as React from "react";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function monthKeyFor(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // YYYY-MM in the user's local timezone, matching how the visible label is
  // computed (Intl uses local time too).
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthLabelFor(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return MONTH_FORMATTER.format(date);
}

export interface TimelineMonthHeaderProps {
  label: string;
}

export function TimelineMonthHeader({ label }: TimelineMonthHeaderProps) {
  return (
    <div className="sticky top-12 z-10 bg-background/95 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur sm:top-0">
      {label}
    </div>
  );
}
