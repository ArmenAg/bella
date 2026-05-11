import Link from "next/link";
import { canWrite } from "@/lib/auth";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { EntryListRow } from "@/components/entries/entry-list-row";
import { PainListFilter } from "@/components/entries/pain-list-filter";
import { QuickPainEntry } from "@/components/entries/quick-pain-entry";
import { listEntries } from "@/server/actions/entries";
import { listReferenceData } from "@/server/actions/reference";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

const RECENT_REGION_LIMIT = 5;

interface PainBookPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function PainBookPage({
  searchParams,
}: PainBookPageProps) {
  const params = await searchParams;
  const flaresOnly = params.filter === "flares";

  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const [result, referenceResult] = await Promise.all([
    listEntries({
      page_size: 50,
      flare_only: flaresOnly || undefined,
    }),
    listReferenceData(),
  ]);

  const bodyRegions = referenceResult.ok
    ? referenceResult.data.body_regions
    : [];

  // Derive the most-recent body regions across the latest entries so the quick
  // composer can surface them first. Falls back to display_order downstream
  // when this list is empty.
  const recentRegionIds: string[] = [];
  if (result.ok) {
    const seen = new Set<string>();
    for (const entry of result.data.items) {
      for (const regionId of entry.body_region_ids ?? []) {
        if (!seen.has(regionId)) {
          seen.add(regionId);
          recentRegionIds.push(regionId);
          if (recentRegionIds.length >= RECENT_REGION_LIMIT) break;
        }
      }
      if (recentRegionIds.length >= RECENT_REGION_LIMIT) break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.painBook.title}
        description={strings.painBook.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/pain-book/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.painBook.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      {showNew ? (
        <QuickPainEntry
          bodyRegions={bodyRegions}
          recentRegionIds={recentRegionIds}
        />
      ) : null}

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
