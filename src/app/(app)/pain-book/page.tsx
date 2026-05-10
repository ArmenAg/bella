import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { EntryListRow } from "@/components/entries/entry-list-row";
import { PainListFilter } from "@/components/entries/pain-list-filter";
import { listEntries } from "@/server/actions/entries";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface PainBookPageProps {
  searchParams: Promise<{ filter?: string }>;
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function PainBookPage({
  searchParams,
}: PainBookPageProps) {
  const params = await searchParams;
  const flaresOnly = params.filter === "flares";

  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const result = await listEntries({
    page_size: 50,
    flare_only: flaresOnly || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.painBook.title}
        description={strings.painBook.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/pain-book/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.painBook.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      <PainListFilter current={flaresOnly ? "flares" : "all"} />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={strings.painBook.list.empty.title}
          description={strings.painBook.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/pain-book/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.painBook.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items
            .filter((entry) => entry.type !== "freeform")
            .map((entry) => (
              <li key={entry.id}>
                <EntryListRow
                  entry={entry}
                  variant="pain"
                  href={`/pain-book/${entry.id}/edit`}
                />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
