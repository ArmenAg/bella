"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ToggleChip } from "@/components/entries/toggle-chip";
import {
  listAiImportDrafts,
  listAiImportSessions,
} from "@/server/actions/ai-import";
import type {
  AiImportDraft,
  AiImportSession,
  AiImportSessionStatus,
} from "@/server/contracts";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { formatDateTime } from "@/lib/format";
import { ImportDraftCard } from "./import-draft-card";
import { ImportSessionStatusBadge } from "./import-status-badge";

type FilterValue =
  | "all"
  | "ready"
  | "drafting"
  | "committed"
  | "rejected"
  | "failed";

interface ImportWorkspaceProps {
  initialSessions: AiImportSession[];
  initialDrafts: AiImportDraft[];
  initialFilter: FilterValue;
  highlightDraftId: string | null;
  canWrite: boolean;
}

const FILTER_TO_STATUS: Record<
  Exclude<FilterValue, "all">,
  AiImportSessionStatus
> = {
  ready: "ready_for_review",
  drafting: "drafting",
  committed: "committed",
  rejected: "rejected",
  failed: "failed",
};

export function ImportWorkspace({
  initialSessions,
  initialDrafts,
  initialFilter,
  highlightDraftId,
  canWrite,
}: ImportWorkspaceProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterValue>(initialFilter);
  const [sessions, setSessions] =
    React.useState<AiImportSession[]>(initialSessions);
  const [drafts, setDrafts] = React.useState<AiImportDraft[]>(initialDrafts);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const highlightRef = React.useRef<HTMLDivElement | null>(null);

  const refresh = React.useCallback(async (next: FilterValue) => {
    setLoading(true);
    setError(null);
    const sessionFilter =
      next === "all"
        ? { page_size: 50 }
        : { page_size: 50, status: FILTER_TO_STATUS[next] };
    const [sessionsResult, draftsResult] = await Promise.all([
      listAiImportSessions(sessionFilter),
      listAiImportDrafts({ page_size: 200 }),
    ]);
    setLoading(false);
    if (!sessionsResult.ok) {
      setError(userFacingErrorMessage(sessionsResult.error));
      setSessions([]);
      setDrafts([]);
      return;
    }
    setSessions(sessionsResult.data.items);
    setDrafts(draftsResult.ok ? draftsResult.data.items : []);
  }, []);

  const handleFilterChange = (next: FilterValue) => {
    setFilter(next);
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    if (highlightDraftId) params.set("draft", highlightDraftId);
    router.replace(
      `/import${params.toString() ? `?${params.toString()}` : ""}`,
    );
    void refresh(next);
  };

  React.useEffect(() => {
    if (highlightDraftId && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightDraftId]);

  const draftsBySession = React.useMemo(() => {
    const map = new Map<string, AiImportDraft[]>();
    for (const draft of drafts) {
      const list = map.get(draft.session_id) ?? [];
      list.push(draft);
      map.set(draft.session_id, list);
    }
    return map;
  }, [drafts]);

  const handleDraftUpdated = (next: AiImportDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === next.id ? next : d)));
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info">
        <ClipboardCheck aria-hidden="true" />
        <AlertDescription>{strings.importNs.boundary}</AlertDescription>
      </Alert>

      {!canWrite ? (
        <Alert variant="warning">
          <ClipboardCheck aria-hidden="true" />
          <AlertDescription>{strings.importNs.readOnly}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleChip
          active={filter === "all"}
          onToggle={() => handleFilterChange("all")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.all}
        </ToggleChip>
        <ToggleChip
          active={filter === "ready"}
          onToggle={() => handleFilterChange("ready")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.ready}
        </ToggleChip>
        <ToggleChip
          active={filter === "drafting"}
          onToggle={() => handleFilterChange("drafting")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.drafting}
        </ToggleChip>
        <ToggleChip
          active={filter === "committed"}
          onToggle={() => handleFilterChange("committed")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.committed}
        </ToggleChip>
        <ToggleChip
          active={filter === "rejected"}
          onToggle={() => handleFilterChange("rejected")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.rejected}
        </ToggleChip>
        <ToggleChip
          active={filter === "failed"}
          onToggle={() => handleFilterChange("failed")}
          disabled={loading}
        >
          {strings.importNs.sessions.filters.failed}
        </ToggleChip>
      </div>

      {error ? (
        <ErrorState
          title={strings.importNs.sessions.loadError}
          message={error}
          onRetry={() => void refresh(filter)}
        />
      ) : null}

      {!error && sessions.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={strings.importNs.sessions.empty.title}
          description={strings.importNs.sessions.empty.body}
        />
      ) : null}

      <div className="flex flex-col gap-6">
        {sessions.map((session) => {
          const sessionDrafts = draftsBySession.get(session.id) ?? [];
          const containsHighlight = sessionDrafts.some(
            (d) => d.id === highlightDraftId,
          );
          return (
            <section
              key={session.id}
              className="flex flex-col gap-3"
              ref={containsHighlight ? highlightRef : null}
            >
              <header className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {formatDateTime(session.created_at)}
                  </p>
                  <h2 className="text-base font-semibold tracking-tight">
                    {session.input_label ?? strings.importNs.sessions.untitled}
                  </h2>
                </div>
                <ImportSessionStatusBadge status={session.status} />
              </header>
              {sessionDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {strings.importNs.drafts.empty}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sessionDrafts.map((draft) => (
                    <ImportDraftCard
                      key={draft.id}
                      draft={draft}
                      canWrite={canWrite}
                      highlight={draft.id === highlightDraftId}
                      onUpdated={handleDraftUpdated}
                      onCommitted={handleDraftUpdated}
                      onRejected={handleDraftUpdated}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
