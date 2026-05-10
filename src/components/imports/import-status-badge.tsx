import { Badge } from "@/components/ui/badge";
import type { AiImportDraft, AiImportSession } from "@/server/contracts";
import { strings } from "@/lib/strings";

export function ImportSessionStatusBadge({
  status,
}: {
  status: AiImportSession["status"];
}) {
  const label =
    strings.importNs.sessions.statuses[
      status as keyof typeof strings.importNs.sessions.statuses
    ] ?? status;
  switch (status) {
    case "ready_for_review":
      return <Badge variant="accent">{label}</Badge>;
    case "committed":
      return <Badge variant="primary">{label}</Badge>;
    case "rejected":
      return <Badge variant="muted">{label}</Badge>;
    case "failed":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export function ImportDraftStatusBadge({
  status,
}: {
  status: AiImportDraft["status"];
}) {
  const label =
    strings.importNs.drafts.statuses[
      status as keyof typeof strings.importNs.drafts.statuses
    ] ?? status;
  switch (status) {
    case "committed":
      return <Badge variant="primary">{label}</Badge>;
    case "rejected":
      return <Badge variant="muted">{label}</Badge>;
    case "failed":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="accent">{label}</Badge>;
  }
}
