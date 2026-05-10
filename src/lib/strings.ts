import enUS from "@/strings/en-us.json";

export const strings = enUS;

/**
 * Render a template with `{token}` placeholders against a values object.
 * Used for the small subset of strings that need interpolation.
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export type Strings = typeof enUS;
