"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { strings } from "@/lib/strings";

export interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  maxLength?: number;
}

export function ChipInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  ariaLabel,
  maxLength = 120,
}: ChipInputProps) {
  const [draft, setDraft] = React.useState("");

  const addCurrent = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed.slice(0, maxLength)]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCurrent();
            }
          }}
          placeholder={placeholder ?? strings.painBook.form.chipPlaceholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-label={ariaLabel}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCurrent}
          disabled={disabled || draft.trim().length === 0}
        >
          {strings.actions.add}
        </Button>
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((entry, idx) => (
            <li key={`${entry}-${idx}`}>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs">
                {entry}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  disabled={disabled}
                  className="rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${strings.actions.remove} ${entry}`}
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
