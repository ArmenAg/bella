import type { DiagnosisNode } from "@/server/contracts";

export interface DiagnosisTreeNode {
  node: DiagnosisNode;
  children: DiagnosisTreeNode[];
}

/**
 * Build a tree from a flat list of diagnosis nodes by joining
 * `parent_diagnosis_id`. Nodes whose parent is missing from the input
 * (e.g. filtered out) are promoted to the top level so they remain visible.
 */
export function buildDiagnosisTree(
  nodes: readonly DiagnosisNode[],
): DiagnosisTreeNode[] {
  const byId = new Map<string, DiagnosisTreeNode>();
  for (const node of nodes) {
    byId.set(node.id, { node, children: [] });
  }

  const roots: DiagnosisTreeNode[] = [];
  for (const entry of byId.values()) {
    const parentId = entry.node.parent_diagnosis_id;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(entry);
    } else {
      roots.push(entry);
    }
  }

  const sortByTitle = (a: DiagnosisTreeNode, b: DiagnosisTreeNode) =>
    a.node.title
      .toLocaleLowerCase()
      .localeCompare(b.node.title.toLocaleLowerCase());

  const sortRecursive = (entries: DiagnosisTreeNode[]) => {
    entries.sort(sortByTitle);
    for (const entry of entries) {
      sortRecursive(entry.children);
    }
  };
  sortRecursive(roots);

  return roots;
}

/**
 * Collect IDs of `target` and all of its transitive descendants. Used to
 * exclude self/descendants from the parent-select on the edit page (so the
 * user cannot create a cycle).
 */
export function collectDescendantIds(
  nodes: readonly DiagnosisNode[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parent_diagnosis_id) {
      const list = childrenByParent.get(node.parent_diagnosis_id) ?? [];
      list.push(node.id);
      childrenByParent.set(node.parent_diagnosis_id, list);
    }
  }

  const out = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const next = queue.shift()!;
    const children = childrenByParent.get(next) ?? [];
    for (const childId of children) {
      if (!out.has(childId)) {
        out.add(childId);
        queue.push(childId);
      }
    }
  }
  return out;
}
