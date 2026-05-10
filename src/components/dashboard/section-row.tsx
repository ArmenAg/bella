import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionRowProps {
  href?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  tone?: "default" | "urgent";
  className?: string;
}

/**
 * Compact list row used inside dashboard SectionCard. Mirrors the calm,
 * clinical density of `EntryListRow` but without the larger summary block.
 */
export function SectionRow({
  href,
  eyebrow,
  title,
  meta,
  trailing,
  tone = "default",
  className,
}: SectionRowProps) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        {meta ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
      ) : null}
      {href ? (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground"
        />
      ) : null}
    </>
  );

  const baseClass = cn(
    "flex items-start gap-3 rounded-md border px-3 py-2",
    tone === "urgent"
      ? "border-destructive/40 bg-destructive/5"
      : "border-border bg-card",
    href &&
      "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
