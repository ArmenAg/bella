import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const appRoot = path.resolve(new URL("../..", import.meta.url).pathname);
export const workspaceRoot = path.resolve(appRoot, "..");
export const bootstrapDir = path.join(appRoot, "data/bootstrap");
export const importInboxDir = path.join(appRoot, "data/import-inbox");

const textExtensions = new Set([
  ".md",
  ".txt",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".htm",
]);

const importExtensions = new Set([
  ...textExtensions,
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".heic",
  ".webp",
  ".zip",
]);

export function isImportFileName(fileName) {
  return importExtensions.has(path.extname(fileName).toLowerCase());
}

const skippedBasenames = new Set([
  "README.md",
  "HEALTHSUMMARY_INDEX.md",
  "SOURCE_PAGE_NOTES.md",
]);

export function parseArgs(argv = process.argv.slice(2)) {
  const parsed = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith("--")) continue;

    const [rawKey, rawValue] = item.slice(2).split("=", 2);
    const nextValue = argv[index + 1];

    if (rawValue !== undefined) {
      parsed.set(rawKey, rawValue);
    } else if (nextValue && !nextValue.startsWith("--")) {
      parsed.set(rawKey, nextValue);
      index += 1;
    } else {
      parsed.set(rawKey, true);
    }
  }

  return parsed;
}

export function argValue(args, key, fallback) {
  return args.has(key) ? args.get(key) : fallback;
}

export function toWorkspaceRelative(absolutePath) {
  return path.relative(workspaceRoot, absolutePath).split(path.sep).join("/");
}

export function toAppRelative(absolutePath) {
  return path.relative(appRoot, absolutePath).split(path.sep).join("/");
}

export function cleanTitle(value) {
  return String(value ?? "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value, maxLength) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function stableUuid(seed) {
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export async function sha256File(absolutePath) {
  const buffer = await readFile(absolutePath);
  return createHash("sha256").update(buffer).digest("hex");
}

export async function writeJsonl(filePath, rows) {
  const body = rows.map((row) => `${JSON.stringify(row)}\n`).join("");
  await writeFile(filePath, body, "utf8");
}

export async function readJsonl(filePath) {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

export async function walkImportFiles(rootPath) {
  const results = [];

  let rootStat;
  try {
    rootStat = await stat(rootPath);
  } catch {
    return results;
  }

  if (rootStat.isFile()) {
    if (
      !skippedBasenames.has(path.basename(rootPath)) &&
      isImportFileName(rootPath)
    ) {
      results.push(rootPath);
    }
    return results;
  }

  async function visit(currentPath) {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".gitkeep") continue;

      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (skippedBasenames.has(entry.name)) continue;

      const extension = path.extname(entry.name).toLowerCase();
      if (!importExtensions.has(extension)) continue;

      results.push(absolutePath);
    }
  }

  await visit(rootPath);
  return results.sort((a, b) => a.localeCompare(b));
}

export async function readTextForImportFile(absolutePath) {
  const extension = path.extname(absolutePath).toLowerCase();

  if (textExtensions.has(extension)) {
    return {
      text: await readFile(absolutePath, "utf8"),
      extraction: "text_file",
    };
  }

  if (extension !== ".pdf") {
    return { text: "", extraction: "binary_only" };
  }

  const version = spawnSync("pdftotext", ["-v"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  if (version.error || version.status !== 0) {
    return { text: "", extraction: "pdf_binary_only_pdftotext_missing" };
  }

  const extracted = spawnSync("pdftotext", ["-layout", absolutePath, "-"], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (extracted.error || extracted.status !== 0) {
    return { text: "", extraction: "pdf_binary_only_pdftotext_failed" };
  }

  return { text: extracted.stdout, extraction: "pdftotext_layout" };
}

export async function fileInfo(absolutePath) {
  const fileStat = await stat(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();

  return {
    absolute_path: absolutePath,
    workspace_path: toWorkspaceRelative(absolutePath),
    app_path: toAppRelative(absolutePath),
    file_name: path.basename(absolutePath),
    extension,
    size_bytes: fileStat.size,
    modified_at: fileStat.mtime.toISOString(),
    sha256: await sha256File(absolutePath),
  };
}

export async function parseHealthSummaryIndex() {
  const indexPath = path.join(
    workspaceRoot,
    "records_md/HEALTHSUMMARY_INDEX.md",
  );
  const rows = new Map();

  let content;
  try {
    content = await readFile(indexPath, "utf8");
  } catch {
    return rows;
  }

  for (const line of content.split("\n")) {
    if (!line.startsWith("| DOC")) continue;

    const cells = line
      .trim()
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    const [
      file,
      title,
      documentTime,
      encounterDate,
      type,
      department,
      provider,
      reason,
    ] = cells;

    const markdownName = file.replace(/\.XML$/i, ".md");
    rows.set(markdownName, {
      file,
      title,
      document_time: normalizeDateTime(documentTime),
      encounter_datetime: normalizeDateTime(encounterDate),
      encounter_date: dateOnlyFromValue(encounterDate),
      type,
      department,
      provider,
      reason,
    });
  }

  return rows;
}

export function markdownTitle(text, fallback) {
  const match = text.match(/^#\s+(.+)$/m);
  return truncate(match?.[1] ?? cleanTitle(fallback), 240);
}

export function metadataValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`^[-* ]*\\*\\*${escaped}:\\*\\*\\s*(.+)$`, "im"),
  );
  if (match?.[1]) return match[1].trim();

  const plainMatch = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return plainMatch?.[1]?.trim() ?? "";
}

export function normalizeDateTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const isoLike = text.match(
    /\b(\d{4})[-_](\d{2})[-_](\d{2})(?:[ T](\d{1,2}):(\d{2}))?/,
  );
  if (isoLike) {
    const [, year, month, day, hour = "12", minute = "00"] = isoLike;
    return `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:00.000Z`;
  }

  const usDate = text.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  if (usDate) {
    const [, rawMonth, rawDay, year, rawHour, minute = "00", meridiem] = usDate;
    let hour = rawHour ? Number(rawHour) : 12;
    if (meridiem?.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (meridiem?.toUpperCase() === "AM" && hour === 12) hour = 0;

    return `${year}-${rawMonth.padStart(2, "0")}-${rawDay.padStart(
      2,
      "0",
    )}T${String(hour).padStart(2, "0")}:${minute}:00.000Z`;
  }

  return "";
}

export function dateOnlyFromValue(value) {
  const normalized = normalizeDateTime(value);
  return normalized ? normalized.slice(0, 10) : "";
}

export function inferSourceDate(text, fileName, healthSummaryRow) {
  return (
    healthSummaryRow?.encounter_date ||
    dateOnlyFromValue(metadataValue(text, "Encounter date")) ||
    dateOnlyFromValue(metadataValue(text, "Document effective time")) ||
    dateOnlyFromValue(metadataValue(text, "Today's Date")) ||
    dateOnlyFromValue(fileName) ||
    dateOnlyFromValue(text.slice(0, 5000))
  );
}

export function inferSourceDateTime(text, fileName, healthSummaryRow) {
  return (
    healthSummaryRow?.encounter_datetime ||
    normalizeDateTime(metadataValue(text, "Encounter date")) ||
    normalizeDateTime(metadataValue(text, "Document effective time")) ||
    normalizeDateTime(metadataValue(text, "Today's Date")) ||
    normalizeDateTime(fileName) ||
    normalizeDateTime(text.slice(0, 5000))
  );
}

export function inferProvider(text, healthSummaryRow) {
  if (healthSummaryRow?.provider) return healthSummaryRow.provider;

  const metadataProvider = metadataValue(text, "Provider");
  if (metadataProvider) return truncate(metadataProvider, 240);

  const stanfordProvider = text.match(
    /^([A-Z][A-Za-z .'-]+,\s*(?:MD|DO|PA-C|PA|PT|PhD|MD, PhD)[^,\n]*)\s+at\s+/m,
  );
  if (stanfordProvider?.[1]) return truncate(stanfordProvider[1], 240);

  const signedBy = text.match(
    /^([A-Z][A-Za-z .'-]+,\s*(?:MD|DO|PA-C|PA|PT|PhD|MD, PhD)[^\n]*)\s+\d{1,2}:\d{2}\s*(?:AM|PM)?/m,
  );
  if (signedBy?.[1]) return truncate(signedBy[1], 240);

  return "";
}

export function inferSourceType({
  text,
  workspacePath,
  title,
  healthSummaryRow,
}) {
  if (healthSummaryRow) {
    const metadata = [
      title,
      healthSummaryRow.type,
      healthSummaryRow.department,
      healthSummaryRow.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      /\b(mri|mr |ct |x-ray|xray|ultrasound|imaging|radiology|dicom)\b/.test(
        metadata,
      )
    ) {
      return "imaging_report";
    }

    if (/\b(lab|laboratory|cbc|cmp|blood|urine|test result)\b/.test(metadata)) {
      return "lab_report";
    }

    return "visit_note";
  }

  const lower = [
    workspacePath,
    title,
    healthSummaryRow?.type,
    healthSummaryRow?.department,
    healthSummaryRow?.reason,
    text.slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (workspacePath.startsWith("reports_md/")) {
    if (lower.includes("literature")) return "literature";
    return "generated_report";
  }

  const documentHeader = [workspacePath, title, text.slice(0, 1200)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(progress note|clinical note|appointment details|consult|visit|letter|surgery note|evaluation)\b/.test(
      documentHeader,
    )
  ) {
    return "visit_note";
  }

  if (
    /\b(mri|mr |ct |x-ray|xray|ultrasound|imaging|radiology|dicom)\b/.test(
      lower,
    )
  ) {
    return "imaging_report";
  }

  if (/\b(lab|laboratory|cbc|cmp|blood|urine|result)\b/.test(lower)) {
    return "lab_report";
  }

  if (
    /\b(visit|clinical note|progress note|consult|encounter|summary of care|office|emergency|inpatient)\b/.test(
      lower,
    )
  ) {
    return "visit_note";
  }

  if (workspacePath.startsWith("records_md/")) return "other";

  return "upload";
}

export function defaultTags({ workspacePath, sourceType, extraction }) {
  const tags = new Set(["bootstrap_import"]);

  if (workspacePath.startsWith("records_md/")) tags.add("source_record");
  if (workspacePath.startsWith("reports_md/")) tags.add("generated_reasoning");
  if (workspacePath.startsWith("Fw_ Medical Files/"))
    tags.add("raw_pdf_source");
  if (workspacePath.startsWith("HealthSummary_May_07_2026/")) {
    tags.add("healthsummary_raw");
  }
  if (workspacePath.includes("/healthsummary_xml/")) tags.add("healthsummary");
  if (workspacePath.includes("/user_provided/")) tags.add("user_provided");
  if (workspacePath.includes("/stanford_pdfs/")) tags.add("stanford_pdf_text");
  if (workspacePath.startsWith("app/data/import-inbox/"))
    tags.add("import_inbox");
  if (sourceType === "imaging_report") tags.add("imaging");
  if (sourceType === "lab_report") tags.add("labs");
  if (extraction.startsWith("pdf_")) tags.add("binary_pending_text");

  return [...tags].sort();
}

export function sourceSummary({ workspacePath, extraction, healthSummaryRow }) {
  const parts = [`Imported from ${workspacePath}.`];

  if (healthSummaryRow?.department) {
    parts.push(`Department: ${healthSummaryRow.department}.`);
  }

  if (healthSummaryRow?.reason) {
    parts.push(`Reason: ${truncate(healthSummaryRow.reason, 300)}.`);
  }

  parts.push(
    `Extraction: ${extraction}. Review the original source before using clinically.`,
  );

  return parts.join(" ");
}

export function inferEventType(source) {
  const parts = [
    source.title,
    source.source_type,
    source.department,
    source.encounter_type,
    source.reason,
  ];

  if (!source.tags?.includes("healthsummary")) {
    parts.push(source.excerpt);
  }

  const lower = parts.filter(Boolean).join(" ").toLowerCase();

  if (
    /\b(injection|block|procedure|surgery|operation|operative|scar injection)\b/.test(
      lower,
    )
  ) {
    return "procedure_test";
  }

  if (
    source.source_type === "imaging_report" ||
    /\b(mri|mr |ct |x-ray|xray|ultrasound|imaging|radiology)\b/.test(lower)
  ) {
    return "imaging";
  }

  if (
    source.source_type === "lab_report" ||
    /\b(lab|laboratory|cbc|cmp|blood|urine|test result)\b/.test(lower)
  ) {
    return "test_lab";
  }

  return "consult";
}

export function eventTitle(source, eventType) {
  const subject = source.department || source.reason || source.title;

  if (eventType === "procedure_test")
    return truncate(`Procedure/test: ${subject}`, 240);
  if (eventType === "imaging") return truncate(`Imaging: ${subject}`, 240);
  if (eventType === "test_lab") return truncate(`Lab/test: ${subject}`, 240);

  return truncate(`Visit: ${subject}`, 240);
}

export function extractProcedureImpact(text) {
  const preNrs = text.match(/Pre-procedure NRS:\s*([0-9]+\/10)/i)?.[1];
  const postNrs = text.match(/Post-procedure NRS:\s*([0-9]+\/10)/i)?.[1];
  const didNotHelp = /did not help (?:her |the )?pain/i.test(text);
  const flareConcern = /post procedure pain flare/i.test(text);

  return {
    baseline_before: preNrs ? `Pre-procedure NRS: ${preNrs}.` : "",
    immediate_effect: [
      postNrs ? `Post-procedure NRS: ${postNrs}.` : "",
      didNotHelp
        ? "Source note states the procedure did not help pain yet."
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    new_symptoms: flareConcern
      ? "Source note documents concern for possible post-procedure pain flare."
      : "",
    answered_question:
      didNotHelp || preNrs || postNrs ? "partially" : "unclear",
  };
}

export function sqlLiteral(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sqlArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "'{}'::text[]";
  return `array[${values.map((value) => sqlLiteral(value)).join(", ")}]::text[]`;
}
