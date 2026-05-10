"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";

interface AgentComposerProps {
  disabled: boolean;
  sending: boolean;
  onSend: (message: string) => void;
}

export function AgentComposer({
  disabled,
  sending,
  onSend,
}: AgentComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      className="flex flex-col gap-2 border-t border-border bg-background/95 px-3 py-3 backdrop-blur"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) submit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            !disabled
          ) {
            event.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder={strings.agent.chat.composerPlaceholder}
        disabled={disabled}
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-tight text-muted-foreground">
          {strings.agent.boundaryShort}
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={disabled || value.trim().length === 0}
          className="gap-1.5"
        >
          <Send aria-hidden="true" className="h-3.5 w-3.5" />
          {sending ? strings.agent.chat.sending : strings.agent.chat.send}
        </Button>
      </div>
    </form>
  );
}
