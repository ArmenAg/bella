import { format as fmt, formatDistanceStrict } from "date-fns";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return fmt(new Date(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return fmt(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return fmt(new Date(iso), "h:mm a");
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceStrict(new Date(iso), new Date(), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatDurationMinutes(
  minutes: number | null | undefined,
): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

/**
 * Convert an ISO timestamp to the value expected by `<input type="datetime-local">`
 * (`YYYY-MM-DDTHH:mm` in the user's local timezone).
 */
export function toLocalDateTimeInputValue(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Convert an `<input type="datetime-local">` value back to an ISO UTC string.
 */
export function fromLocalDateTimeInputValue(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * `JSON.stringify(value, null, 2)` with a String() fallback for values that
 * can't be serialized (BigInt, cycles, etc.). Used by the agent/import draft
 * cards and tool-call audit panels.
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
