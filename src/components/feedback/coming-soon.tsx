import { Sparkles, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { strings } from "@/lib/strings";

export function ComingSoon({
  title = strings.empty.comingSoon,
  body = strings.empty.comingSoonBody,
  icon = Sparkles,
}: {
  title?: string;
  body?: string;
  icon?: LucideIcon;
}) {
  return <EmptyState icon={icon} title={title} description={body} />;
}
