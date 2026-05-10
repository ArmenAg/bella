"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export type TimelineView = "timeline" | "feed";

export interface TimelineViewToggleProps {
  current: TimelineView;
}

const ORDER: { value: TimelineView; labelKey: TimelineView }[] = [
  { value: "timeline", labelKey: "timeline" },
  { value: "feed", labelKey: "feed" },
];

/**
 * Two-segment view toggle for the Timeline page. Renders as <Link>s so each
 * segment has a stable, server-side-resolvable href that preserves all the
 * other current search params (date_from, item_type, etc.). Only the `view`
 * param is flipped.
 */
export function TimelineViewToggle({ current }: TimelineViewToggleProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = React.useCallback(
    (view: TimelineView) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      // The default view is "timeline" — keep URLs short by omitting the param
      // when it matches the default.
      if (view === "timeline") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  return (
    <div
      role="group"
      aria-label={strings.timeline.viewToggleAriaLabel}
      className="inline-flex items-center rounded-md border border-border bg-card/40 p-0.5"
    >
      {ORDER.map((item) => {
        const active = item.value === current;
        return (
          <Link
            key={item.value}
            href={hrefFor(item.value)}
            scroll={false}
            aria-pressed={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {strings.timeline.views[item.labelKey]}
          </Link>
        );
      })}
    </div>
  );
}
