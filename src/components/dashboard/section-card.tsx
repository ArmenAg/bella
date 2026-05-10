import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Dashboard section wrapper. Title + optional "view all" link, then dense
 * list-style content. Padding matches the rest of the app's Card primitive.
 */
export function SectionCard({
  title,
  hint,
  href,
  hrefLabel,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {href && hrefLabel ? (
          <Link
            href={href}
            className="text-xs font-medium text-primary hover:underline"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}
