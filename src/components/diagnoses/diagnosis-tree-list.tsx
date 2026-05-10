import Link from "next/link";

import { Card } from "@/components/ui/card";
import {
  ConfidenceBadge,
  STATUS_TEXT_CLASS_MAP,
  StatusBadge,
} from "./diagnosis-badges";
import type { DiagnosisTreeNode } from "./diagnosis-tree";

import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export interface DiagnosisTreeListProps {
  tree: DiagnosisTreeNode[];
}

/**
 * Render the diagnosis tree as a structured list. Top-level branches are
 * cards, sub-branches are nested rows indented to the left. Per the design
 * doc we deliberately avoid a graph layout.
 */
export function DiagnosisTreeList({ tree }: DiagnosisTreeListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {tree.map((entry) => (
        <li key={entry.node.id}>
          <RootCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function RootCard({ entry }: { entry: DiagnosisTreeNode }) {
  return (
    <Card className="overflow-hidden">
      <NodeRow entry={entry} depth={0} />
      {entry.children.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {flatten(entry.children, 1).map(({ entry: child, depth }) => (
            <li key={child.node.id}>
              <NodeRow entry={child} depth={depth} />
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function flatten(
  entries: DiagnosisTreeNode[],
  depth: number,
): { entry: DiagnosisTreeNode; depth: number }[] {
  const out: { entry: DiagnosisTreeNode; depth: number }[] = [];
  for (const entry of entries) {
    out.push({ entry, depth });
    if (entry.children.length > 0) {
      out.push(...flatten(entry.children, depth + 1));
    }
  }
  return out;
}

function NodeRow({
  entry,
  depth,
}: {
  entry: DiagnosisTreeNode;
  depth: number;
}) {
  const { node } = entry;
  const summary = node.summary?.trim();
  const isStruck = node.status === "ruled_out";
  return (
    <Link
      href={`/diagnostic-tree/${node.id}/edit`}
      className={cn(
        "block px-4 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      )}
      style={{ paddingLeft: depth === 0 ? undefined : `${1 + depth * 1}rem` }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <p
            className={cn(
              "text-sm font-semibold text-foreground",
              isStruck ? STATUS_TEXT_CLASS_MAP.ruled_out : null,
            )}
          >
            {node.title}
          </p>
          <StatusBadge status={node.status} />
          <ConfidenceBadge confidence={node.confidence} />
        </div>
        {summary ? (
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {summary}
          </p>
        ) : null}
        {node.open_questions.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {strings.diagnoses.node.openQuestions}: {node.open_questions.length}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
