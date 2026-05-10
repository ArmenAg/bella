#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  appRoot,
  argValue,
  bootstrapDir,
  cleanTitle,
  defaultTags,
  fileInfo,
  importInboxDir,
  inferProvider,
  inferSourceDate,
  inferSourceDateTime,
  inferSourceType,
  isImportFileName,
  markdownTitle,
  parseArgs,
  parseHealthSummaryIndex,
  readTextForImportFile,
  sourceSummary,
  stableUuid,
  truncate,
  walkImportFiles,
  workspaceRoot,
  writeJsonl,
} from "./lib.mjs";

const args = parseArgs();
const mode = String(argValue(args, "mode", "current"));
const output = path.resolve(
  appRoot,
  String(
    argValue(
      args,
      "output",
      mode === "inbox"
        ? "data/bootstrap/inbox_source_manifest.jsonl"
        : "data/bootstrap/source_manifest.jsonl",
    ),
  ),
);

const rawPdfSourceOverrides = new Map([
  [
    "Bella - [Stanford] Tawfik First Visit 92925.PDF",
    {
      title: "Stanford Tawfik first visit raw PDF",
      source_date: "2025-09-29",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Bella - Stanford Surgery Consult 29.PDF",
    {
      title: "Stanford hand surgery consult raw PDF",
      source_date: "2026-02-09",
      provider: "Stanford Health Care",
    },
  ],
  [
    "Bella Letter 2:9 Tawfik .pdf",
    {
      title: "Stanford Tawfik letter raw PDF",
      source_date: "2026-02-09",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Bella. - [Stanford] Tawfik visit 29.PDF",
    {
      title: "Stanford Tawfik follow-up raw PDF",
      source_date: "2026-02-09",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Progress notes - clinical notes  2.pdf",
    {
      title: "Stanford Tawfik pain follow-up raw PDF",
      source_date: "2026-02-09",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Stanford ED Acute on Chronic Left Leg Pain After MR Neurography 2025-10-01.pdf",
    {
      title: "Stanford ED acute on chronic left leg pain raw PDF",
      source_date: "2025-10-01",
      provider: "Stanford Emergency Department",
    },
  ],
  [
    "Stanford Qatu Left Thigh Deep Scar Injection Hydrodissection 2025-12-23.pdf",
    {
      title: "Stanford Qatu scar hydrodissection raw PDF",
      source_date: "2025-12-23",
      provider: "Stanford Health Care",
    },
  ],
  [
    "Stanford Tawfik Pain Follow-Up 2026-01-26 duplicate.pdf",
    {
      title: "Stanford Tawfik pain follow-up raw PDF duplicate",
      source_date: "2026-01-26",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Stanford Tawfik Pain Follow-Up 2026-01-26.pdf",
    {
      title: "Stanford Tawfik pain follow-up raw PDF",
      source_date: "2026-01-26",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Stanford Tawfik Pain Follow-Up Clinical Note 2025-11-17.pdf",
    {
      title: "Stanford Tawfik pain follow-up clinical note raw PDF",
      source_date: "2025-11-17",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Tawfik 1:26.pdf",
    {
      title: "Stanford Tawfik pain follow-up raw PDF",
      source_date: "2026-01-26",
      provider: "Stanford Pain Management Center",
    },
  ],
  [
    "Uritskiy post 10.17 scar injection.pdf",
    {
      title: "Overlake Uritskiy follow-up after scar injection",
      source_date: "2025-10-24",
      provider: "Igor Uritskiy MD",
    },
  ],
  [
    "HealthSummary_May_07_2026/1 of 1 - My Health Summary.PDF",
    {
      title: "Overlake MyChart health summary export raw PDF",
      source_date: "2026-05-07",
      provider: "Overlake Hospital Medical Center",
    },
  ],
]);

function isTopLevelRawPdf(info) {
  return info.extension === ".pdf" && !info.workspace_path.includes("/");
}

function applySourceOverrides(row, info) {
  const override =
    rawPdfSourceOverrides.get(info.workspace_path) ??
    rawPdfSourceOverrides.get(info.file_name);

  if (isTopLevelRawPdf(info)) {
    row.title = override?.title ?? cleanTitle(info.file_name);
    row.source_date = override?.source_date ?? null;
    row.source_datetime = override?.source_date
      ? `${override.source_date}T12:00:00.000Z`
      : null;
    row.provider = override?.provider ?? null;
    row.tags = [...new Set([...row.tags, "raw_pdf_source"])].sort();
  }

  if (override) {
    row.title = override.title ?? row.title;
    row.source_date = override.source_date ?? row.source_date;
    row.source_datetime = override.source_date
      ? `${override.source_date}T12:00:00.000Z`
      : row.source_datetime;
    row.provider = override.provider ?? row.provider;
  }

  return row;
}

async function topLevelWorkspaceFiles() {
  const entries = await readdir(workspaceRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isImportFileName(entry.name))
    .map((entry) => path.join(workspaceRoot, entry.name));
}

async function rootsForMode() {
  const rawRoots = argValue(args, "roots", "");

  if (rawRoots) {
    return String(rawRoots)
      .split(",")
      .map((root) => path.resolve(appRoot, root.trim()))
      .filter(Boolean);
  }

  if (mode === "inbox") return [importInboxDir];

  return [
    path.join(workspaceRoot, "records_md"),
    path.join(workspaceRoot, "reports_md"),
    path.join(workspaceRoot, "Fw_ Medical Files"),
    path.join(
      workspaceRoot,
      "HealthSummary_May_07_2026/1 of 1 - My Health Summary.PDF",
    ),
    ...(await topLevelWorkspaceFiles()),
  ];
}

function reviewStatusForSource(info) {
  if (
    [".png", ".jpg", ".jpeg", ".heic", ".webp", ".zip"].includes(info.extension)
  ) {
    return "needs_review";
  }

  return "accepted";
}

async function buildManifestRow(filePath, healthSummaryIndex) {
  const info = await fileInfo(filePath);
  const { text, extraction } = await readTextForImportFile(filePath);
  const healthSummaryRow = healthSummaryIndex.get(info.file_name);
  const title = markdownTitle(text, cleanTitle(info.file_name));
  const sourceType = inferSourceType({
    text,
    workspacePath: info.workspace_path,
    title,
    healthSummaryRow,
  });
  const sourceDate = inferSourceDate(text, info.file_name, healthSummaryRow);
  const sourceDateTime = inferSourceDateTime(
    text,
    info.file_name,
    healthSummaryRow,
  );
  const provider = inferProvider(text, healthSummaryRow);
  const sourceId = stableUuid(`source:${info.workspace_path}:${info.sha256}`);
  const isClinicalSource =
    info.workspace_path.startsWith("records_md/") ||
    info.workspace_path.startsWith("reports_md/") ||
    info.workspace_path.startsWith("app/data/import-inbox/");

  const row = {
    id: sourceId,
    review_status: reviewStatusForSource(info),
    workspace_path: info.workspace_path,
    app_path: info.app_path,
    file_name: info.file_name,
    extension: info.extension,
    size_bytes: info.size_bytes,
    modified_at: info.modified_at,
    sha256: info.sha256,
    title,
    source_type: sourceType,
    source_date: sourceDate || null,
    source_datetime: sourceDateTime || null,
    provider: provider || null,
    department: healthSummaryRow?.department || null,
    encounter_type: healthSummaryRow?.type || null,
    reason: healthSummaryRow?.reason || null,
    citation: info.workspace_path,
    summary: sourceSummary({
      workspacePath: info.workspace_path,
      extraction,
      healthSummaryRow,
    }),
    tags: defaultTags({
      workspacePath: info.workspace_path,
      sourceType,
      extraction,
    }),
    extraction,
    clinical_source: isClinicalSource,
    excerpt: text ? truncate(text, 1200) : "",
  };

  return applySourceOverrides(row, info);
}

async function main() {
  const healthSummaryIndex = await parseHealthSummaryIndex();
  const roots = await rootsForMode();
  const filePaths = (
    await Promise.all(roots.map((root) => walkImportFiles(root)))
  ).flat();
  const rows = [];

  for (const filePath of filePaths) {
    rows.push(await buildManifestRow(filePath, healthSummaryIndex));
  }

  rows.sort((a, b) => {
    const byDate = String(a.source_date ?? "").localeCompare(
      String(b.source_date ?? ""),
    );
    if (byDate !== 0) return byDate;
    return a.workspace_path.localeCompare(b.workspace_path);
  });

  await writeJsonl(output, rows);

  const counts = rows.reduce(
    (accumulator, row) => {
      accumulator.total += 1;
      accumulator.by_type[row.source_type] =
        (accumulator.by_type[row.source_type] ?? 0) + 1;
      accumulator.by_extraction[row.extraction] =
        (accumulator.by_extraction[row.extraction] ?? 0) + 1;
      return accumulator;
    },
    { total: 0, by_type: {}, by_extraction: {} },
  );

  console.log(
    `Wrote ${rows.length} source rows to ${path.relative(appRoot, output)}`,
  );
  console.log(JSON.stringify(counts, null, 2));
  console.log(
    mode === "inbox"
      ? "Next: review data/bootstrap/inbox_*.review.jsonl"
      : "Next: npm run bootstrap:extract",
  );
  console.log(
    `Generated files are local bootstrap artifacts under ${bootstrapDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
