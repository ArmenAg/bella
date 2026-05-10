import * as React from "react";

export interface ChartEmptyProps {
  message: string;
}

/**
 * Inline empty state used inside ChartCard bodies. Lighter than the full
 * EmptyState card, since the parent card already supplies title and chrome.
 */
export function ChartEmpty({ message }: ChartEmptyProps) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-card/40 px-3 py-4">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
