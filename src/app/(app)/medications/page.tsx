import Link from "next/link";
import { Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import {
  MedicationsTabs,
  type MedicationsTab,
} from "@/components/medications/medications-tabs";
import { MedicationListRow } from "@/components/medications/medication-list-row";
import { ResponseListRow } from "@/components/medications/response-list-row";
import {
  listMedicationResponses,
  listMedications,
} from "@/server/actions/medications";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";
import type { Medication } from "@/server/contracts";

export const dynamic = "force-dynamic";

interface MedicationsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

function resolveTab(raw: string | undefined): MedicationsTab {
  if (raw === "past" || raw === "responses") return raw;
  return "current";
}

function compareByName(a: Medication, b: Medication): number {
  return a.name.localeCompare(b.name);
}

function compareByStopDateDesc(a: Medication, b: Medication): number {
  const aDate = a.stop_date ?? "";
  const bDate = b.stop_date ?? "";
  if (aDate === bDate) return compareByName(a, b);
  return aDate < bDate ? 1 : -1;
}

export default async function MedicationsPage({
  searchParams,
}: MedicationsPageProps) {
  const params = await searchParams;
  const tab = resolveTab(params.tab);

  const profile = await loadShellProfile();
  const showWrite = canWrite(profile?.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.medications.title}
        description={strings.medications.subtitle}
        actions={
          showWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/medications/responses/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.medications.response.newCta}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/medications/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.medications.newCta}
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <MedicationsTabs current={tab} />

      {tab === "responses" ? (
        <ResponsesPanel />
      ) : tab === "past" ? (
        <PastPanel showWrite={showWrite} />
      ) : (
        <CurrentPanel showWrite={showWrite} />
      )}
    </div>
  );
}

async function CurrentPanel({ showWrite }: { showWrite: boolean }) {
  const [active, paused, planned] = await Promise.all([
    listMedications({ status: "active", page_size: 200 }),
    listMedications({ status: "paused", page_size: 200 }),
    listMedications({ status: "planned", page_size: 200 }),
  ]);

  if (!active.ok) return <ErrorState message={active.error.message} />;
  if (!paused.ok) return <ErrorState message={paused.error.message} />;
  if (!planned.ok) return <ErrorState message={planned.error.message} />;

  const merged: Medication[] = [
    ...active.data.items,
    ...paused.data.items,
    ...planned.data.items,
  ].sort(compareByName);

  if (merged.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title={strings.medications.list.empty.current}
        action={
          showWrite ? (
            <Button asChild size="sm">
              <Link href="/medications/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.medications.newCta}
              </Link>
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {merged.map((medication) => (
        <li key={medication.id}>
          <MedicationListRow
            medication={medication}
            href={`/medications/${medication.id}/edit`}
          />
        </li>
      ))}
    </ul>
  );
}

async function PastPanel({ showWrite }: { showWrite: boolean }) {
  const result = await listMedications({ status: "stopped", page_size: 200 });

  if (!result.ok) return <ErrorState message={result.error.message} />;

  const items = [...result.data.items].sort(compareByStopDateDesc);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title={strings.medications.list.empty.past}
        action={
          showWrite ? (
            <Button asChild size="sm">
              <Link href="/medications/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.medications.newCta}
              </Link>
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((medication) => (
        <li key={medication.id}>
          <MedicationListRow
            medication={medication}
            href={`/medications/${medication.id}/edit`}
          />
        </li>
      ))}
    </ul>
  );
}

async function ResponsesPanel() {
  const [responsesResult, medsResult] = await Promise.all([
    listMedicationResponses({ page_size: 50 }),
    listMedications({ page_size: 200 }),
  ]);

  if (!responsesResult.ok) {
    return <ErrorState message={responsesResult.error.message} />;
  }
  if (!medsResult.ok) {
    return <ErrorState message={medsResult.error.message} />;
  }

  const nameById = new Map<string, string>();
  for (const med of medsResult.data.items) {
    nameById.set(med.id, med.name);
  }

  if (responsesResult.data.items.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title={strings.medications.list.empty.responses}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {responsesResult.data.items.map((response) => (
        <li key={response.id}>
          <ResponseListRow
            response={response}
            medicationName={
              response.medication_id
                ? (nameById.get(response.medication_id) ?? null)
                : null
            }
            href={`/medications/responses/${response.id}/edit`}
          />
        </li>
      ))}
    </ul>
  );
}
