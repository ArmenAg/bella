import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { SourceListFilter } from "@/components/sources/source-list-filter";
import { SourceRow } from "@/components/sources/source-row";

import { listSources } from "@/server/actions/sources";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";
import type { SourceFilter, SourceType } from "@/server/contracts";

export const dynamic = "force-dynamic";

const SOURCE_TYPE_KEYS: ReadonlySet<string> = new Set([
  "visit_note",
  "imaging_report",
  "lab_report",
  "generated_report",
  "literature",
  "upload",
  "other",
]);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface SourcesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function pickSourceType(
  params: Record<string, string | string[] | undefined>,
): SourceType | null {
  const value = pickString(params, "source_type");
  if (value && SOURCE_TYPE_KEYS.has(value)) return value as SourceType;
  return null;
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const params = await searchParams;
  const sourceType = pickSourceType(params);
  const tag = pickString(params, "tag");
  const dateFromRaw = pickString(params, "date_from");
  const dateToRaw = pickString(params, "date_to");
  const dateFrom =
    dateFromRaw && DATE_REGEX.test(dateFromRaw) ? dateFromRaw : null;
  const dateTo = dateToRaw && DATE_REGEX.test(dateToRaw) ? dateToRaw : null;

  const filter: SourceFilter = {
    page_size: 100,
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(tag ? { tag } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const [profile, result] = await Promise.all([
    loadShellProfile(),
    listSources(filter),
  ]);

  const showNew = canWrite(profile?.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.sources.title}
        description={strings.sources.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/sources/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.sources.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      <SourceListFilter
        initial={{
          source_type: sourceType,
          tag,
          date_from: dateFrom,
          date_to: dateTo,
        }}
      />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={strings.sources.list.empty.title}
          description={strings.sources.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/sources/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.sources.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items.map((source) => (
            <li key={source.id}>
              <SourceRow source={source} href={`/sources/${source.id}/edit`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
