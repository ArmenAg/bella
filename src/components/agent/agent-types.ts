import type {
  AgentMessage,
  AgentThread,
  AgentToolCall,
  AiImportDraft,
} from "@/server/contracts";

export type ThreadFilter = "active" | "archived" | "all";

export interface AgentWorkspaceProps {
  initialThreads: AgentThread[];
  initialFilter: ThreadFilter;
  initialThreadId: string | null;
  canWrite: boolean;
}

export interface ThreadDetail {
  thread: AgentThread;
  messages: AgentMessage[];
  toolCalls: AgentToolCall[];
  drafts: AiImportDraft[];
}

export type ChatStatus = "idle" | "loading" | "sending" | "error";

export type RailTab = "drafts" | "audit";

export type MobileTab = "chat" | "drafts" | "audit";
