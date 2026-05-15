"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleChipProps {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ToggleChip({
  active,
  onToggle,
  children,
  disabled,
  className,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
