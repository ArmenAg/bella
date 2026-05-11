import Link from "next/link";
import { canWrite } from "@/lib/auth";
import { Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { ProcedureListRow } from "@/components/procedures/procedure-list-row";
import {
  ProcedureTypeFilter,
  type ProcedureTypeFilterValue,
} from "@/components/procedures/procedure-type-filter";
import { listProcedureEvents } from "@/server/actions/procedures";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface ProceduresPageProps {
  searchParams: Promise<{ type?: string }>;
}

const TYPE_VALUES: ProcedureTypeFilterValue[] = [
  "procedure_test",
  "procedure",
  "imaging",
  "test_lab",
  "consult",
];

function resolveType(raw: string | undefined): ProcedureTypeFilterValue {
  if (raw && (TYPE_VALUES as string[]).includes(raw)) {
    return raw as ProcedureTypeFilterValue;
  }
  return "all";
}

export default async function ProceduresPage({
  searchParams,
}: ProceduresPageProps) {
  const params = await searchParams;
  const filter = resolveType(params.type);

  const profile = await loadShellProfile();
  const showWrite = canWrite(profile?.role);

  const result = await listProcedureEvents({
    page_size: 50,
    type:
      filter === "all"
        ? undefined
        : (filter as Exclude<ProcedureTypeFilterValue, "all">),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.procedures.title}
        description={strings.procedures.subtitle}
        actions={
          showWrite ? (
            <Button asChild size="sm">
              <Link href="/procedures/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.procedures.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      <ProcedureTypeFilter current={filter} />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={strings.procedures.list.empty.title}
          description={strings.procedures.list.empty.body}
          action={
            showWrite ? (
              <Button asChild size="sm">
                <Link href="/procedures/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.procedures.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items.map((event) => (
            <li key={event.id}>
              <ProcedureListRow
                event={event}
                href={`/procedures/${event.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
