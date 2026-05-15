"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Menu,
  MessageSquare,
  PanelRightClose,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createAgentThread,
  listAgentMessages,
  listAgentThreads,
  listAgentToolCalls,
  sendAgentMessage,
  updateAgentThread,
} from "@/server/actions/agent";
import { listAiImportDrafts } from "@/server/actions/ai-import";
import type {
  AgentMessage,
  AgentThread,
  AgentToolCall,
  AiImportDraft,
} from "@/server/contracts";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { cn } from "@/lib/utils";
import { AgentComposer } from "./agent-composer";
import { AgentDraftCard } from "./agent-draft-card";
import { AgentMessageBubble } from "./agent-message-bubble";
import { AgentThreadList } from "./agent-thread-list";
import { AgentToolCallRow } from "./agent-tool-call-row";
import { NewThreadDialog } from "./new-thread-dialog";
import type {
  AgentWorkspaceProps,
  MobileTab,
  ThreadFilter,
} from "./agent-types";

function filterToActionFilter(filter: ThreadFilter) {
  if (filter === "all") return { page_size: 50 };
  return { page_size: 50, status: filter };
}

type InspectorTab = "drafts" | "audit";

export function AgentWorkspace({
  initialThreads,
  initialFilter,
  initialThreadId,
  canWrite,
}: AgentWorkspaceProps) {
  const router = useRouter();
  const [threads, setThreads] = React.useState<AgentThread[]>(initialThreads);
  const [filter, setFilter] = React.useState<ThreadFilter>(initialFilter);
  const [threadsLoading, setThreadsLoading] = React.useState(false);
  const [threadsError, setThreadsError] = React.useState<string | null>(null);

  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(
    initialThreadId,
  );
  const [messages, setMessages] = React.useState<AgentMessage[]>([]);
  const [toolCalls, setToolCalls] = React.useState<AgentToolCall[]>([]);
  const [drafts, setDrafts] = React.useState<AiImportDraft[]>([]);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [threadError, setThreadError] = React.useState<string | null>(null);

  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [showNewThreadDialog, setShowNewThreadDialog] = React.useState(false);
  const [archiveBusy, setArchiveBusy] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("chat");
  const [threadsSheetOpen, setThreadsSheetOpen] = React.useState(false);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [inspectorTab, setInspectorTab] =
    React.useState<InspectorTab>("drafts");

  const messagesScrollRef = React.useRef<HTMLDivElement | null>(null);

  const loadThreads = React.useCallback(async (next: ThreadFilter) => {
    setThreadsLoading(true);
    setThreadsError(null);
    const result = await listAgentThreads(filterToActionFilter(next));
    if (!result.ok) {
      setThreadsError(userFacingErrorMessage(result.error));
      setThreads([]);
    } else {
      setThreads(result.data.items);
    }
    setThreadsLoading(false);
  }, []);

  const loadThreadDetail = React.useCallback(async (threadId: string) => {
    setThreadLoading(true);
    setThreadError(null);
    const [messagesResult, toolsResult, draftsResult] = await Promise.all([
      listAgentMessages({ thread_id: threadId, page_size: 200 }),
      listAgentToolCalls({ thread_id: threadId, page_size: 200 }),
      listAiImportDrafts({ page_size: 200, agent_thread_id: threadId }),
    ]);
    if (!messagesResult.ok) {
      setThreadError(userFacingErrorMessage(messagesResult.error));
      setMessages([]);
      setToolCalls([]);
      setDrafts([]);
    } else {
      setMessages(messagesResult.data.items);
      setToolCalls(toolsResult.ok ? toolsResult.data.items : []);
      setDrafts(draftsResult.ok ? draftsResult.data.items : []);
    }
    setThreadLoading(false);
  }, []);

  React.useEffect(() => {
    if (activeThreadId) void loadThreadDetail(activeThreadId);
    else {
      setMessages([]);
      setToolCalls([]);
      setDrafts([]);
    }
  }, [activeThreadId, loadThreadDetail]);

  React.useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop =
        messagesScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChangeFilter = (next: ThreadFilter) => {
    setFilter(next);
    void loadThreads(next);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setThreadsSheetOpen(false);
    setMobileTab("chat");
  };

  const handleCreate = async (title?: string) => {
    if (!canWrite) return;
    setCreating(true);
    setSendError(null);
    const result = await createAgentThread({
      ...(title ? { title } : {}),
      mode: "agent",
    });
    if (!result.ok) {
      setCreating(false);
      setSendError(userFacingErrorMessage(result.error));
      return;
    }
    const newThread = result.data;
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setShowNewThreadDialog(false);
    setCreating(false);
    setThreadsSheetOpen(false);
    setMobileTab("chat");
  };

  const handleArchive = async (id: string) => {
    if (!canWrite) return;
    setArchiveBusy(true);
    const result = await updateAgentThread({ id, status: "archived" });
    setArchiveBusy(false);
    if (!result.ok) {
      setThreadsError(userFacingErrorMessage(result.error));
      return;
    }
    const updated = result.data;
    setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (filter === "active") {
      setThreads((prev) => prev.filter((t) => t.status === "active"));
    }
    if (activeThreadId === id && filter === "active") {
      setActiveThreadId(null);
    }
  };

  const handleSend = async (message: string) => {
    if (!activeThreadId || sending) return;
    setSending(true);
    setSendError(null);
    const result = await sendAgentMessage({
      thread_id: activeThreadId,
      message,
    });
    setSending(false);
    if (!result.ok) {
      setSendError(userFacingErrorMessage(result.error));
      return;
    }
    const {
      user_message,
      assistant_message,
      tool_calls,
      drafts: newDrafts,
    } = result.data;
    setMessages((prev) => [...prev, user_message, assistant_message]);
    setToolCalls((prev) => mergeToolCalls(prev, tool_calls));
    setDrafts((prev) => mergeDrafts(prev, newDrafts));
    setThreads((prev) =>
      prev.map((t) => (t.id === activeThreadId ? result.data.thread : t)),
    );
  };

  const proposedDrafts = React.useMemo(
    () => drafts.filter((d) => d.status === "proposed"),
    [drafts],
  );
  const hasInspectorContent = drafts.length > 0 || toolCalls.length > 0;

  React.useEffect(() => {
    if (proposedDrafts.length > 0) {
      setInspectorOpen(true);
      setInspectorTab("drafts");
    }
  }, [proposedDrafts.length]);

  React.useEffect(() => {
    if (!hasInspectorContent) setInspectorOpen(false);
  }, [hasInspectorContent]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-primary"
        />
        <span>{strings.agent.boundary}</span>
      </div>

      {sendError ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{sendError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Desktop layout */}
      <div
        className={cn(
          "hidden h-[calc(100svh-12rem)] min-h-[560px] min-w-0 overflow-hidden rounded-md border border-border bg-card lg:grid",
          inspectorOpen && hasInspectorContent
            ? "lg:grid-cols-[232px_minmax(0,1fr)_320px]"
            : hasInspectorContent
              ? "lg:grid-cols-[232px_minmax(0,1fr)_56px]"
              : "lg:grid-cols-[232px_minmax(0,1fr)]",
        )}
      >
        <aside className="min-h-0 border-r border-border bg-muted/20 p-3">
          <AgentThreadList
            threads={threads}
            filter={filter}
            activeThreadId={activeThreadId}
            loading={threadsLoading}
            error={threadsError}
            onChangeFilter={handleChangeFilter}
            onSelectThread={handleSelectThread}
            onCreate={() => setShowNewThreadDialog(true)}
            onArchive={handleArchive}
            canWrite={canWrite}
            creating={creating}
            archiveBusy={archiveBusy}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-card">
          <ChatPanel
            threadId={activeThreadId}
            messages={messages}
            sending={sending}
            loading={threadLoading}
            error={threadError}
            canWrite={canWrite}
            onSend={handleSend}
            onRetryLoad={() =>
              activeThreadId && void loadThreadDetail(activeThreadId)
            }
            messagesScrollRef={messagesScrollRef}
          />
        </section>

        {hasInspectorContent ? (
          inspectorOpen ? (
            <aside className="flex min-h-0 flex-col border-l border-border bg-background/70 p-3">
              <RailTabs
                value={inspectorTab}
                onValueChange={setInspectorTab}
                onCollapse={() => setInspectorOpen(false)}
                toolCalls={toolCalls}
                drafts={drafts}
                proposedDrafts={proposedDrafts}
                hasThread={Boolean(activeThreadId)}
              />
            </aside>
          ) : (
            <CollapsedInspector
              draftsCount={drafts.length}
              proposedDraftsCount={proposedDrafts.length}
              toolCallsCount={toolCalls.length}
              onOpenTab={(nextTab) => {
                setInspectorTab(nextTab);
                setInspectorOpen(true);
              }}
            />
          )
        ) : null}
      </div>

      {/* Mobile layout */}
      <div className="flex min-w-0 flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setThreadsSheetOpen(true)}
            className="shrink-0 gap-1.5"
          >
            <Menu aria-hidden="true" className="h-3.5 w-3.5" />
            {strings.agent.threads.title}
          </Button>
          <Badge variant="muted" className="min-w-0 flex-1 truncate">
            {threads.find((t) => t.id === activeThreadId)?.title ??
              (activeThreadId
                ? strings.agent.threads.untitled
                : strings.agent.chat.noThreadTitle)}
          </Badge>
        </div>

        <Tabs
          value={mobileTab}
          onValueChange={(value) => setMobileTab(value as MobileTab)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1">
              <MessageSquare aria-hidden="true" className="mr-1 h-3 w-3" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex-1">
              <ClipboardList aria-hidden="true" className="mr-1 h-3 w-3" />
              {strings.agent.rail.tabs.drafts} ({proposedDrafts.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1">
              <Wrench aria-hidden="true" className="mr-1 h-3 w-3" />
              {strings.agent.rail.tabs.audit} ({toolCalls.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <section className="flex min-h-[420px] flex-col rounded-md border border-border bg-card">
              <ChatPanel
                threadId={activeThreadId}
                messages={messages}
                sending={sending}
                loading={threadLoading}
                error={threadError}
                canWrite={canWrite}
                onSend={handleSend}
                onRetryLoad={() =>
                  activeThreadId && void loadThreadDetail(activeThreadId)
                }
                messagesScrollRef={messagesScrollRef}
              />
            </section>
          </TabsContent>
          <TabsContent value="drafts">
            <DraftsPanel
              drafts={drafts}
              proposedDrafts={proposedDrafts}
              hasThread={Boolean(activeThreadId)}
            />
          </TabsContent>
          <TabsContent value="audit">
            <AuditPanel
              toolCalls={toolCalls}
              hasThread={Boolean(activeThreadId)}
            />
          </TabsContent>
        </Tabs>

        <Sheet open={threadsSheetOpen} onOpenChange={setThreadsSheetOpen}>
          <SheetContent side="left" className="w-80 p-3">
            <SheetHeader className="px-0">
              <SheetTitle>{strings.agent.threads.title}</SheetTitle>
            </SheetHeader>
            <AgentThreadList
              threads={threads}
              filter={filter}
              activeThreadId={activeThreadId}
              loading={threadsLoading}
              error={threadsError}
              onChangeFilter={handleChangeFilter}
              onSelectThread={handleSelectThread}
              onCreate={() => {
                setThreadsSheetOpen(false);
                setShowNewThreadDialog(true);
              }}
              onArchive={handleArchive}
              canWrite={canWrite}
              creating={creating}
              archiveBusy={archiveBusy}
            />
          </SheetContent>
        </Sheet>
      </div>

      <NewThreadDialog
        open={showNewThreadDialog}
        onOpenChange={(open) => {
          setShowNewThreadDialog(open);
          if (!open) {
            // Refresh thread list count after closing
            void loadThreads(filter);
            router.refresh();
          }
        }}
        creating={creating}
        onCreate={handleCreate}
      />
    </div>
  );
}

function mergeToolCalls(
  existing: AgentToolCall[],
  incoming: AgentToolCall[],
): AgentToolCall[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const call of incoming) byId.set(call.id, call);
  return Array.from(byId.values()).sort((a, b) => {
    const aTs = a.started_at ?? a.created_at;
    const bTs = b.started_at ?? b.created_at;
    return aTs.localeCompare(bTs);
  });
}

function mergeDrafts(
  existing: AiImportDraft[],
  incoming: AiImportDraft[],
): AiImportDraft[] {
  const byId = new Map(existing.map((d) => [d.id, d]));
  for (const draft of incoming) byId.set(draft.id, draft);
  return Array.from(byId.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

interface ChatPanelProps {
  threadId: string | null;
  messages: AgentMessage[];
  sending: boolean;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  onSend: (message: string) => void;
  onRetryLoad: () => void;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
}

function ChatPanel({
  threadId,
  messages,
  sending,
  loading,
  error,
  canWrite,
  onSend,
  onRetryLoad,
  messagesScrollRef,
}: ChatPanelProps) {
  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <MessageSquare
            aria-hidden="true"
            className="mx-auto mb-3 h-5 w-5 text-muted-foreground"
          />
          <p className="text-sm font-medium text-foreground">
            {strings.agent.chat.noThreadTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {strings.agent.chat.noThreadBody}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
        {strings.agent.chat.loadingMessages}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <ErrorState
          title={strings.agent.chat.loadError}
          message={error}
          onRetry={onRetryLoad}
        />
      </div>
    );
  }

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={messagesScrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 lg:px-5"
      >
        {visibleMessages.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {strings.agent.chat.emptyThreadTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {strings.agent.chat.emptyThreadBody}
            </p>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <AgentMessageBubble key={message.id} message={message} />
          ))
        )}
        {sending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            {strings.agent.chat.running}
          </div>
        ) : null}
      </div>
      <AgentComposer
        disabled={sending || !canWrite}
        sending={sending}
        onSend={onSend}
      />
    </div>
  );
}

interface RailTabsProps {
  value: InspectorTab;
  onValueChange: (value: InspectorTab) => void;
  onCollapse: () => void;
  toolCalls: AgentToolCall[];
  drafts: AiImportDraft[];
  proposedDrafts: AiImportDraft[];
  hasThread: boolean;
}

function RailTabs({
  value,
  onValueChange,
  onCollapse,
  toolCalls,
  drafts,
  proposedDrafts,
  hasThread,
}: RailTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as InspectorTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex items-center gap-2">
        <TabsList className="h-8 flex-1 border-0 bg-muted/60">
          <TabsTrigger value="drafts" className="flex-1">
            <ClipboardList aria-hidden="true" className="mr-1 h-3 w-3" />
            {strings.agent.rail.tabs.drafts} ({proposedDrafts.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1">
            <Wrench aria-hidden="true" className="mr-1 h-3 w-3" />
            {strings.agent.rail.tabs.audit} ({toolCalls.length})
          </TabsTrigger>
        </TabsList>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={onCollapse}
          aria-label="Collapse inspector"
          title="Collapse inspector"
        >
          <PanelRightClose aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <TabsContent value="drafts" className="flex-1 overflow-y-auto">
        <DraftsPanel
          drafts={drafts}
          proposedDrafts={proposedDrafts}
          hasThread={hasThread}
        />
      </TabsContent>
      <TabsContent value="audit" className="flex-1 overflow-y-auto">
        <AuditPanel toolCalls={toolCalls} hasThread={hasThread} />
      </TabsContent>
    </Tabs>
  );
}

function CollapsedInspector({
  draftsCount,
  proposedDraftsCount,
  toolCallsCount,
  onOpenTab,
}: {
  draftsCount: number;
  proposedDraftsCount: number;
  toolCallsCount: number;
  onOpenTab: (tab: InspectorTab) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col items-center gap-2 border-l border-border bg-background/70 px-2 py-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-9 w-9 text-muted-foreground",
          proposedDraftsCount > 0 && "text-primary hover:text-primary",
        )}
        onClick={() => onOpenTab("drafts")}
        aria-label={`Open drafts (${draftsCount})`}
        title={`Open drafts (${draftsCount})`}
      >
        <ClipboardList aria-hidden="true" className="h-4 w-4" />
        {draftsCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground">
            {draftsCount}
          </span>
        ) : null}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-muted-foreground"
        onClick={() => onOpenTab("audit")}
        aria-label={`Open audit (${toolCallsCount})`}
        title={`Open audit (${toolCallsCount})`}
      >
        <Wrench aria-hidden="true" className="h-4 w-4" />
        {toolCallsCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium leading-4 text-muted-foreground">
            {toolCallsCount}
          </span>
        ) : null}
      </Button>
    </aside>
  );
}

function DraftsPanel({
  drafts,
  proposedDrafts,
  hasThread,
}: {
  drafts: AiImportDraft[];
  proposedDrafts: AiImportDraft[];
  hasThread: boolean;
}) {
  if (!hasThread) {
    return (
      <div className="px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
        {strings.agent.chat.noThreadBody}
      </div>
    );
  }
  if (drafts.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
        {strings.agent.drafts.empty}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        {strings.agent.drafts.panelHint}
      </p>
      {proposedDrafts.length > 0 ? (
        <Button asChild size="sm" variant="outline" className="self-start">
          <Link href="/import">{strings.agent.rail.openAllInReview}</Link>
        </Button>
      ) : null}
      <div className="flex flex-col gap-2">
        {drafts.map((draft) => (
          <AgentDraftCard key={draft.id} draft={draft} />
        ))}
      </div>
    </div>
  );
}

function AuditPanel({
  toolCalls,
  hasThread,
}: {
  toolCalls: AgentToolCall[];
  hasThread: boolean;
}) {
  if (!hasThread) {
    return (
      <div className="px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
        {strings.agent.chat.noThreadBody}
      </div>
    );
  }
  if (toolCalls.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
        {strings.agent.tools.empty}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        {strings.agent.tools.panelHint}
      </p>
      <div className={cn("flex flex-col gap-2")}>
        {toolCalls.map((call) => (
          <AgentToolCallRow key={call.id} call={call} />
        ))}
      </div>
    </div>
  );
}
