"use client";

import * as React from "react";
import { Archive, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import type { AgentThread } from "@/server/contracts";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { ThreadFilter } from "./agent-types";

interface AgentThreadListProps {
  threads: AgentThread[];
  filter: ThreadFilter;
  activeThreadId: string | null;
  loading: boolean;
  error: string | null;
  onChangeFilter: (filter: ThreadFilter) => void;
  onSelectThread: (id: string) => void;
  onCreate: () => void;
  onArchive: (id: string) => Promise<void> | void;
  canWrite: boolean;
  creating: boolean;
  archiveBusy: boolean;
}

export function AgentThreadList({
  threads,
  filter,
  activeThreadId,
  loading,
  error,
  onChangeFilter,
  onSelectThread,
  onCreate,
  onArchive,
  canWrite,
  creating,
  archiveBusy,
}: AgentThreadListProps) {
  const [confirmArchiveId, setConfirmArchiveId] = React.useState<string | null>(
    null,
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {strings.agent.threads.title}
        </h2>
        {canWrite ? (
          <Button
            size="sm"
            onClick={onCreate}
            disabled={creating}
            className="gap-1.5"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {creating
                ? strings.agent.threads.creating
                : strings.agent.threads.newButton}
            </span>
            <span className="sm:hidden">
              {creating ? "…" : strings.agent.threads.newButtonShort}
            </span>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleChip
          active={filter === "active"}
          onToggle={() => onChangeFilter("active")}
        >
          {strings.agent.threads.filterActive}
        </ToggleChip>
        <ToggleChip
          active={filter === "archived"}
          onToggle={() => onChangeFilter("archived")}
        >
          {strings.agent.threads.filterArchived}
        </ToggleChip>
        <ToggleChip
          active={filter === "all"}
          onToggle={() => onChangeFilter("all")}
        >
          {strings.agent.threads.filterAll}
        </ToggleChip>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-muted-foreground">
            {strings.agent.threads.loading}
          </p>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
            <p className="font-medium text-destructive">
              {strings.agent.threads.errorTitle}
            </p>
            <p>{error}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card/40 px-3 py-4 text-center">
            <MessageSquare
              aria-hidden="true"
              className="mx-auto mb-2 h-4 w-4 text-muted-foreground"
            />
            <p className="text-xs font-medium text-foreground">
              {strings.agent.threads.empty.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {strings.agent.threads.empty.body}
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              active={thread.id === activeThreadId}
              onSelect={() => onSelectThread(thread.id)}
              onRequestArchive={() => setConfirmArchiveId(thread.id)}
              canWrite={canWrite}
            />
          ))
        )}
      </div>

      <DestructiveConfirm
        open={confirmArchiveId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmArchiveId(null);
        }}
        title={strings.agent.threads.archiveConfirmTitle}
        description={strings.agent.threads.archiveConfirmBody}
        confirming={archiveBusy}
        onConfirm={async () => {
          if (!confirmArchiveId) return;
          await onArchive(confirmArchiveId);
          setConfirmArchiveId(null);
        }}
      />
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  onSelect,
  onRequestArchive,
  canWrite,
}: {
  thread: AgentThread;
  active: boolean;
  onSelect: () => void;
  onRequestArchive: () => void;
  canWrite: boolean;
}) {
  const title = thread.title ?? strings.agent.threads.untitled;
  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border border-transparent px-2 py-2 transition-colors",
        active
          ? "border-primary/20 bg-primary/5"
          : "hover:border-border hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
        aria-current={active ? "true" : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {title}
          </p>
          {thread.status !== "active" ? (
            <Badge
              variant={thread.status === "failed" ? "destructive" : "muted"}
              className="shrink-0"
            >
              {thread.status === "archived"
                ? strings.agent.threads.archivedBadge
                : thread.status === "failed"
                  ? strings.agent.threads.failedBadge
                  : ""}
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {thread.last_message_at
            ? formatRelative(thread.last_message_at)
            : formatRelative(thread.created_at)}
        </p>
      </button>
      {canWrite && thread.status === "active" ? (
        <button
          type="button"
          onClick={onRequestArchive}
          aria-label={strings.agent.threads.archive}
          title={strings.agent.threads.archive}
          className="rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
