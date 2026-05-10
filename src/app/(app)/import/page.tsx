import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { ImportWorkspace } from "@/components/imports/import-workspace";
import {
  listAiImportDrafts,
  listAiImportSessions,
} from "@/server/actions/ai-import";
import type { AiImportSessionStatus } from "@/server/contracts";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

type FilterValue =
  | "all"
  | "ready"
  | "drafting"
  | "committed"
  | "rejected"
  | "failed";

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

function pickFilter(value: string | undefined): FilterValue {
  if (
    value === "ready" ||
    value === "drafting" ||
    value === "committed" ||
    value === "rejected" ||
    value === "failed"
  )
    return value;
  return "ready";
}

interface ImportPageProps {
  searchParams: Promise<{ filter?: string; draft?: string }>;
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const filter = pickFilter(params.filter);
  const profile = await loadShellProfile();
  const canWrite = profile?.role === "primary" || profile?.role === "caregiver";

  const sessionInput =
    filter === "all"
      ? { page_size: 50 }
      : { page_size: 50, status: FILTER_TO_STATUS[filter] };

  const [sessionsResult, draftsResult] = await Promise.all([
    listAiImportSessions(sessionInput),
    listAiImportDrafts({ page_size: 200 }),
  ]);

  if (!sessionsResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={strings.importNs.navLabel}
          title={strings.importNs.title}
          description={strings.importNs.subtitle}
        />
        <ErrorState message={sessionsResult.error.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.importNs.navLabel}
        title={strings.importNs.title}
        description={strings.importNs.subtitle}
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/agent">
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              {strings.importNs.deepLinkBackToAgent}
            </Link>
          </Button>
        }
      />
      <ImportWorkspace
        initialSessions={sessionsResult.data.items}
        initialDrafts={draftsResult.ok ? draftsResult.data.items : []}
        initialFilter={filter}
        highlightDraftId={params.draft ?? null}
        canWrite={canWrite}
      />
    </div>
  );
}
