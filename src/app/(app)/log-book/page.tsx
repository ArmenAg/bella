import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { EntryListRow } from "@/components/entries/entry-list-row";
import { listEntries } from "@/server/actions/entries";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function LogBookPage() {
  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const result = await listEntries({ page_size: 50, type: "freeform" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.logBook.title}
        description={strings.logBook.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/log-book/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.logBook.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={strings.logBook.list.empty.title}
          description={strings.logBook.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/log-book/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.logBook.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items.map((entry) => (
            <li key={entry.id}>
              <EntryListRow
                entry={entry}
                variant="log"
                href={`/log-book/${entry.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
