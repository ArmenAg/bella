"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps {
  id?: string;
  label: string;
  optional?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  id,
  label,
  optional,
  description,
  error,
  children,
  className,
}: FieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const descriptionId = id && description ? `${id}-description` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional ? (
          <span className="text-xs text-muted-foreground">Optional</span>
        ) : null}
      </div>
      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
