"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = strings.common.errorTitle,
  message = strings.common.errorBody,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        {title}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} size="sm" variant="outline">
          {strings.actions.retry}
        </Button>
      ) : null}
    </div>
  );
}
