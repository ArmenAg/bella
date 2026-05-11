import type { AppleHealthMetricType } from "@/server/contracts";
import { strings } from "@/lib/strings";

export const ALL_METRIC_TYPES: AppleHealthMetricType[] = [
  "step_count",
  "distance_walking_running",
  "flights_climbed",
  "active_energy_burned",
  "apple_exercise_time",
  "heart_rate",
  "resting_heart_rate",
  "heart_rate_variability_sdnn",
  "walking_heart_rate_average",
  "walking_step_length",
  "walking_speed",
  "walking_asymmetry_percentage",
  "walking_double_support_percentage",
  "stair_ascent_speed",
  "stair_descent_speed",
  "six_minute_walk_test_distance",
  "apple_walking_steadiness",
  "sleep_asleep_minutes",
  "sleep_in_bed_minutes",
  "workout_minutes",
  "workout_distance",
  "workout_energy",
];

/** Metrics highlighted in the default summary view. */
export const FEATURED_METRIC_TYPES: AppleHealthMetricType[] = [
  "step_count",
  "sleep_asleep_minutes",
  "active_energy_burned",
  "heart_rate",
  "heart_rate_variability_sdnn",
  "distance_walking_running",
  "walking_speed",
  "workout_minutes",
];

export function metricLabel(metric: AppleHealthMetricType): string {
  return strings.appleHealth.metrics[metric] ?? metric;
}

/**
 * Which aggregate column matters most for a given metric.
 *
 * - count-like (steps, energy, sleep, workouts): sum
 * - rate-like (heart rate, HRV, speeds): average
 */
export function preferredAggregate(
  metric: AppleHealthMetricType,
): "sum" | "avg" {
  switch (metric) {
    case "step_count":
    case "distance_walking_running":
    case "flights_climbed":
    case "active_energy_burned":
    case "apple_exercise_time":
    case "sleep_asleep_minutes":
    case "sleep_in_bed_minutes":
    case "workout_minutes":
    case "workout_distance":
    case "workout_energy":
    case "six_minute_walk_test_distance":
      return "sum";
    default:
      return "avg";
  }
}

interface FormatOptions {
  /** Optional unit override; falls back to a canonical unit per metric. */
  unit?: string | null;
}

/**
 * Render a numeric metric value with a readable unit. Returns "—" for nullish
 * values so the table layout stays stable.
 */
export function formatMetricValue(
  metric: AppleHealthMetricType,
  value: number | null | undefined,
  options: FormatOptions = {},
): string {
  if (value == null) return "—";
  switch (metric) {
    case "step_count":
    case "flights_climbed":
      return new Intl.NumberFormat("en-US").format(Math.round(value));
    case "active_energy_burned":
    case "workout_energy":
      return `${Math.round(value)} ${strings.appleHealth.units.kcal}`;
    case "sleep_asleep_minutes":
    case "sleep_in_bed_minutes":
      return formatMinutesAsDuration(value);
    case "apple_exercise_time":
    case "workout_minutes":
      return `${Math.round(value)} ${strings.appleHealth.units.minutes}`;
    case "heart_rate":
    case "resting_heart_rate":
    case "walking_heart_rate_average":
      return `${Math.round(value)} ${strings.appleHealth.units.bpm}`;
    case "heart_rate_variability_sdnn":
      return `${value.toFixed(1)} ${strings.appleHealth.units.ms}`;
    case "distance_walking_running":
    case "workout_distance":
    case "six_minute_walk_test_distance":
      return formatDistance(value, options.unit ?? null);
    case "walking_speed":
      return `${value.toFixed(2)} ${options.unit ?? "m/s"}`;
    case "walking_step_length":
      return `${(value * 100).toFixed(1)} cm`;
    case "walking_asymmetry_percentage":
    case "walking_double_support_percentage":
    case "apple_walking_steadiness":
      return `${value.toFixed(1)}${strings.appleHealth.units.percent}`;
    case "stair_ascent_speed":
    case "stair_descent_speed":
      return `${value.toFixed(2)} ${options.unit ?? "m/s"}`;
    default:
      return value.toFixed(2);
  }
}

function formatMinutesAsDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes - hours * 60);
    return mins > 0
      ? `${hours}${strings.appleHealth.units.hours} ${mins}${strings.appleHealth.units.minutes}`
      : `${hours}${strings.appleHealth.units.hours}`;
  }
  return `${Math.round(minutes)} ${strings.appleHealth.units.minutes}`;
}

function formatDistance(value: number, unit: string | null): string {
  // Apple typically reports walking distance in km, energy as kcal, etc.
  // If unit is missing or already km/mi, assume km; otherwise format meters.
  const u = (unit ?? "").toLowerCase();
  if (u === "mi" || u === "ft") {
    return `${value.toFixed(2)} ${unit}`;
  }
  if (u === "km") {
    return `${value.toFixed(2)} ${strings.appleHealth.units.km}`;
  }
  if (u === "m" || u === "") {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} ${strings.appleHealth.units.km}`;
    }
    return `${value.toFixed(0)} ${strings.appleHealth.units.m}`;
  }
  return `${value.toFixed(2)} ${unit ?? ""}`.trim();
}

export function valueForAggregate(
  metric: AppleHealthMetricType,
  summary: {
    value_sum: number | null;
    value_avg: number | null;
  },
): number | null {
  return preferredAggregate(metric) === "sum"
    ? summary.value_sum
    : summary.value_avg;
}
