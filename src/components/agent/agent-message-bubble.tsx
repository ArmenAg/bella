"use client";

import { Bot, ShieldAlert, User2 } from "lucide-react";
import type { AgentMessage } from "@/server/contracts";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export function AgentMessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "system" || message.role === "tool") {
    return null;
  }

  const isUser = message.role === "user";
  const isFailed = message.status === "failed";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Bot aria-hidden="true" className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-1 rounded-md border px-3 py-2 text-sm leading-6",
          isUser
            ? "border-primary/20 bg-primary/5 text-foreground"
            : isFailed
              ? "border-destructive/30 bg-destructive/5 text-foreground"
              : "border-border bg-card text-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            {isFailed ? (
              <ShieldAlert
                aria-hidden="true"
                className="h-3 w-3 text-destructive"
              />
            ) : null}
            {isUser ? strings.agent.chat.userYou : strings.agent.chat.agentName}
            {isFailed ? ` · ${strings.agent.chat.failedAssistant}` : ""}
          </span>
          <time
            dateTime={message.created_at}
            title={message.created_at}
            className="font-normal normal-case tracking-normal text-muted-foreground/80"
          >
            {formatRelative(message.created_at)}
          </time>
        </div>
        <div className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.content || (isUser ? "" : strings.agent.chat.thinking)}
        </div>
      </div>
      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <User2 aria-hidden="true" className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  );
}
