import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadActiveFlare } from "@/components/shell/active-flare-loader";

import { VasomotorForm } from "@/components/vasomotor/vasomotor-form";

import { getVasomotorMeasurement } from "@/server/actions/vasomotor";

import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditVasomotorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVasomotorPage({
  params,
}: EditVasomotorPageProps) {
  const { id } = await params;
  const [measurementResult, activeFlare] = await Promise.all([
    getVasomotorMeasurement(id),
    loadActiveFlare(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.vasomotor.title}
        title={strings.vasomotor.form.editTitle}
      />
      {!measurementResult.ok ? (
        <ErrorState message={measurementResult.error.message} />
      ) : (
        <VasomotorForm
          mode="edit"
          measurement={measurementResult.data}
          activeFlareEntryId={activeFlare?.entry.id ?? null}
          redirectOnSuccess="/vasomotor"
        />
      )}
    </div>
  );
}
