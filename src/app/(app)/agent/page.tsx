import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
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
  const canWrite = profile?.role === "primary" || profile?.role === "caregiver";

  const listInput: { page_size: number; status?: AgentThreadStatus } = {
    page_size: 50,
  };
  if (filter !== "all") listInput.status = filter;

  const threadsResult = await listAgentThreads(listInput);

  if (!threadsResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={strings.agent.navLabel}
          title={strings.agent.title}
          description={strings.agent.subtitle}
        />
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.agent.navLabel}
        title={strings.agent.title}
        description={strings.agent.subtitle}
      />
      <AgentWorkspace
        initialThreads={threads}
        initialFilter={filter}
        initialThreadId={initialThreadId}
        canWrite={canWrite}
      />
    </div>
  );
}
