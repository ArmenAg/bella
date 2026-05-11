"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateTime,
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const nowFieldStrings = strings.entries.nowField;

export interface NowDateTimeFieldHandle {
  /**
   * If the field is in "Now" mode, push a fresh `new Date().toISOString()` to
   * the parent and return it. Forms should call this just before submit so the
   * timestamp matches the actual save moment, and use the returned value
   * directly (since the parent's state update is asynchronous).
   *
   * Returns `null` when the field is in edited mode and the parent's value
   * should be used as-is.
   */
  snapToNow: () => string | null;
  /** Whether the field is currently in "Now" (un-edited) mode. */
  isNow: () => boolean;
}

export interface NowDateTimeFieldProps {
  /** ISO timestamp. */
  value: string | undefined;
  /** Called with a new ISO timestamp whenever the user edits the field. */
  onChange: (iso: string) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Compact datetime helper for "two taps" capture flows.
 *
 * Default state shows a static label ("Now · May 10, 2:14 PM") plus a small
 * "Edit time" button. Tapping it reveals the native `datetime-local` picker
 * with a "Use now" link to snap back. While in "Now" mode the visible label
 * always reads from `Date.now()` so it stays accurate; consumers should call
 * `snapToNow()` via the imperative ref just before submit so the value sent to
 * the server matches the moment of save.
 */
export const NowDateTimeField = React.forwardRef<
  NowDateTimeFieldHandle,
  NowDateTimeFieldProps
>(function NowDateTimeField(
  { value, onChange, id, ariaLabel, className },
  ref,
) {
  const [editing, setEditing] = React.useState(false);

  React.useImperativeHandle(
    ref,
    () => ({
      snapToNow: () => {
        if (editing) return null;
        const nowIso = new Date().toISOString();
        onChange(nowIso);
        return nowIso;
      },
      isNow: () => !editing,
    }),
    [editing, onChange],
  );

  const displayIso = editing
    ? (value ?? new Date().toISOString())
    : new Date().toISOString();

  if (!editing) {
    return (
      <div
        id={id}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
          className,
        )}
        aria-label={ariaLabel}
      >
        <span className="text-foreground">
          {nowFieldStrings.nowPrefix} · {formatDateTime(displayIso)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => {
            // Push the current "now" up so the parent's value matches what the
            // user just saw, then open the picker.
            onChange(new Date().toISOString());
            setEditing(true);
          }}
        >
          {nowFieldStrings.editTime}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        id={id}
        type="datetime-local"
        value={toLocalDateTimeInputValue(displayIso)}
        onChange={(event) => {
          const next = fromLocalDateTimeInputValue(event.target.value);
          if (next) onChange(next);
        }}
        aria-label={ariaLabel}
        className="max-w-[14rem]"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => {
          onChange(new Date().toISOString());
          setEditing(false);
        }}
      >
        {nowFieldStrings.useNow}
      </Button>
    </div>
  );
});
