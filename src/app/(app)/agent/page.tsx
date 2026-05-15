import { ErrorState } from "@/components/feedback/error-state";
import { canWrite } from "@/lib/auth";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { AgentWorkspace } from "@/components/agent/agent-workspace";
import { listAgentThreads } from "@/server/actions/agent";
import type { AgentThreadStatus } from "@/server/contracts";
import { strings } from "@/lib/strings";
import type { ThreadFilter } from "@/components/agent/agent-types";

export const dynamic = "force-dynamic";

interface AgentPageProps {
  searchParams: Promise<{ thread?: string; status?: string }>;
}

function pickFilter(value: string | undefined): ThreadFilter {
  if (value === "archived") return "archived";
  if (value === "all") return "all";
  return "active";
}

export default async function AgentPage({ searchParams }: AgentPageProps) {
  const params = await searchParams;
  const filter = pickFilter(params.status);
  const profile = await loadShellProfile();
  const writable = canWrite(profile?.role);

  const listInput: { page_size: number; status?: AgentThreadStatus } = {
    page_size: 50,
  };
  if (filter !== "all") listInput.status = filter;

  const threadsResult = await listAgentThreads(listInput);

  if (!threadsResult.ok) {
    return (
      <div className="flex flex-col gap-4 lg:relative lg:left-1/2 lg:w-[min(calc(100vw-19rem),88rem)] lg:-translate-x-1/2">
        <AgentPageHeader />
        <ErrorState message={threadsResult.error.message} />
      </div>
    );
  }

  const threads = threadsResult.data.items;
  const initialThreadId =
    params.thread && threads.some((t) => t.id === params.thread)
      ? params.thread
      : (threads[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-4 lg:relative lg:left-1/2 lg:w-[min(calc(100vw-19rem),88rem)] lg:-translate-x-1/2">
      <AgentPageHeader />
      <AgentWorkspace
        initialThreads={threads}
        initialFilter={filter}
        initialThreadId={initialThreadId}
        canWrite={writable}
      />
    </div>
  );
}

function AgentPageHeader() {
  return (
    <header className="flex min-w-0 flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {strings.agent.navLabel}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Agent
        </h1>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-right">
        {strings.agent.subtitle}
      </p>
    </header>
  );
}
