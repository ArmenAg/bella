import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Calm container around recharts visualizations. Holds title + optional hint,
 * a fixed-height body, and an optional footer (e.g. legend / caveat).
 */
export function ChartCard({
  title,
  hint,
  children,
  footer,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="h-[220px] w-full">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
