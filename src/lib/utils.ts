import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Build a `Map<id, name>` from a list of items that have both fields.
 * Used by dashboard charts and forms to resolve body-region / trigger /
 * medication ids to human labels.
 */
export function buildIdNameMap<T extends { id: string; name: string }>(
  items: readonly T[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, item.name);
  }
  return map;
}
