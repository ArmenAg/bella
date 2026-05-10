import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { DiagnosisTreeFilters } from "@/components/diagnoses/diagnosis-tree-filters";
import type {
  DiagnosisConfidenceKey,
  DiagnosisStatusKey,
} from "@/components/diagnoses/diagnosis-tree-filters";
import { DiagnosisTreeList } from "@/components/diagnoses/diagnosis-tree-list";
import { buildDiagnosisTree } from "@/components/diagnoses/diagnosis-tree";
import { loadShellProfile } from "@/components/shell/profile-loader";

import { listDiagnoses } from "@/server/actions/diagnoses";
import type { DiagnosisFilter } from "@/server/contracts";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

const STATUS_KEYS: ReadonlySet<string> = new Set([
  "unreviewed",
  "suspected",
  "supported",
  "weakened",
  "ruled_out",
  "confirmed",
  "monitoring",
]);

const CONFIDENCE_KEYS: ReadonlySet<string> = new Set([
  "unknown",
  "low",
  "moderate",
  "high",
]);

interface DiagnosticTreePageProps {
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

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function DiagnosticTreePage({
  searchParams,
}: DiagnosticTreePageProps) {
  const params = await searchParams;

  const statusRaw = pickString(params, "status");
  const status: DiagnosisStatusKey | null =
    statusRaw && STATUS_KEYS.has(statusRaw)
      ? (statusRaw as DiagnosisStatusKey)
      : null;
  const confidenceRaw = pickString(params, "confidence");
  const confidence: DiagnosisConfidenceKey | null =
    confidenceRaw && CONFIDENCE_KEYS.has(confidenceRaw)
      ? (confidenceRaw as DiagnosisConfidenceKey)
      : null;

  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const filter: DiagnosisFilter = {
    page_size: 200,
    ...(status ? { status } : {}),
    ...(confidence ? { confidence } : {}),
  };

  const result = await listDiagnoses(filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.diagnoses.title}
        description={strings.diagnoses.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/diagnostic-tree/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.diagnoses.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      <DiagnosisTreeFilters status={status} confidence={confidence} />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title={strings.diagnoses.list.empty.title}
          description={strings.diagnoses.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/diagnostic-tree/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.diagnoses.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <DiagnosisTreeList tree={buildDiagnosisTree(result.data.items)} />
      )}
    </div>
  );
}
