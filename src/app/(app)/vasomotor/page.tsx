import Link from "next/link";
import { Camera, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadShellProfile } from "@/components/shell/profile-loader";

import { VasomotorListRow } from "@/components/vasomotor/vasomotor-list-row";

import { listVasomotorMeasurements } from "@/server/actions/vasomotor";

import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

function canWriteRole(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function VasomotorPage() {
  const profile = await loadShellProfile();
  const showNew = canWriteRole(profile?.role);

  const result = await listVasomotorMeasurements({ page_size: 50 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.vasomotor.title}
        title={strings.vasomotor.title}
        description={strings.vasomotor.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/vasomotor/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.vasomotor.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title={strings.vasomotor.list.empty.title}
          description={strings.vasomotor.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/vasomotor/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.vasomotor.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items.map((measurement) => (
            <li key={measurement.id}>
              <VasomotorListRow
                measurement={measurement}
                href={`/vasomotor/${measurement.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
