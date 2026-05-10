import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { DecisionsBoard } from "@/components/decisions/decisions-board";
import { DecisionFilter } from "@/components/decisions/decision-filter";
import { listDecisions } from "@/server/actions/decisions";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface DecisionsPageProps {
  searchParams: Promise<{ scope?: string }>;
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function DecisionsPage({
  searchParams,
}: DecisionsPageProps) {
  const params = await searchParams;
  const scope: "open" | "all" = params.scope === "all" ? "all" : "open";

  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const result = await listDecisions({
    page_size: 200,
    open_only: scope === "open" ? true : undefined,
  });

  const newButton = showNew ? (
    <Button asChild size="sm">
      <Link href="/decisions/new">
        <Plus aria-hidden="true" className="h-4 w-4" />
        {strings.decisions.newCta}
      </Link>
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.decisions.title}
        description={strings.decisions.subtitle}
        actions={newButton}
      />

      <DecisionFilter current={scope} />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={
            scope === "open"
              ? strings.decisions.list.empty.title
              : strings.decisions.list.emptyAll.title
          }
          description={
            scope === "open"
              ? strings.decisions.list.empty.body
              : strings.decisions.list.emptyAll.body
          }
          action={newButton}
        />
      ) : (
        <DecisionsBoard decisions={result.data.items} />
      )}
    </div>
  );
}
