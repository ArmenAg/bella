#!/usr/bin/env node
import path from "node:path";
import {
  appRoot,
  argValue,
  parseArgs,
  readJsonl,
  stableUuid,
  writeJsonl,
} from "./lib.mjs";

const args = parseArgs();
const manifestPath = path.resolve(
  appRoot,
  String(argValue(args, "manifest", "data/bootstrap/source_manifest.jsonl")),
);
const eventsPath = path.resolve(
  appRoot,
  String(argValue(args, "events", "data/bootstrap/events.review.jsonl")),
);
const outputPath = path.resolve(
  appRoot,
  String(argValue(args, "output", "data/bootstrap/events.final.review.jsonl")),
);

const duplicateOrSourceOnly = new Map([
  [
    "records_md/generated/user_provided/Stanford_Tawfik_2025_10_06_User_Provided.md",
    "Source is a pasted excerpt from the initial Stanford pain consultation; keep as source-only to avoid duplicating the 2025-09-29 visit.",
  ],
  [
    "records_md/generated/user_provided/Stanford_MyHealth_Tawfik_2026_01_26.md",
    "Letter duplicates the same 2026-01-26 Tawfik clinical note event; keep as source-only.",
  ],
  [
    "records_md/generated/stanford_pdfs/Tawfik_1_26.md",
    "PDF duplicates the same 2026-01-26 Tawfik clinical note event; keep as source-only.",
  ],
  [
    "records_md/generated/stanford_pdfs/Bella_Letter_2_9_Tawfik.md",
    "Letter/PDF duplicates the Stanford pain follow-up material; keep as source-only.",
  ],
  [
    "records_md/generated/stanford_pdfs/Bella_Stanford_Surgery_Consult_29.md",
    "PDF duplicates the 2026-02-09 Fox surgery consult captured from MyHealth; keep as source-only.",
  ],
  [
    "records_md/generated/user_provided/Pain_Log_User_Provided.md",
    "Narrative pain log has ambiguous years and should be split into structured pain entries manually.",
  ],
  [
    "records_md/generated/user_provided/Unknown_Date_Scar_Injection_Response_Log.md",
    "Post-injection response log has unknown procedure date; keep as source-only until linked to the correct injection.",
  ],
]);

const eventOverrides = {
  "records_md/generated/healthsummary_xml/DOC0050.md": {
    title: "Original left thigh stab wound - Overlake ED",
    summary:
      "Original 2018 left lateral/proximal thigh stab wound/laceration encounter. Extracted digest notes no fracture/foreign body on X-ray and no documented acute vascular or motor deficit, while preserving that small cutaneous nerve injury was not excluded.",
  },
  "records_md/generated/healthsummary_xml/DOC0045.md": {
    title:
      "Initial Overlake musculoskeletal evaluation for worsening left thigh pain",
    summary:
      "Initial Overlake musculoskeletal evaluation documented lateral/anterior left thigh pain with calf cramping, possible L4/L5 concern, reported colder left leg, IT band/patellofemoral considerations, and no allodynia; clinician was not ready to suspect CRPS.",
  },
  "records_md/generated/healthsummary_xml/DOC0038.md": {
    type: "procedure_test",
    title: "Left lateral femoral cutaneous nerve block - anesthetic only",
    diagnostic_question:
      "Would anesthetizing the left lateral femoral cutaneous nerve reduce the usual left lateral thigh/scar pain?",
    baseline_before:
      "Procedure was performed for left thigh pain after prior discussions of meralgia paresthetica/LFCN contribution.",
    immediate_effect:
      "Procedure note documents ultrasound-guided left LFCN perineural injection with 2 mL ropivacaine and no immediate complication; later records describe response as nondiagnostic.",
    answered_question: "unclear",
    summary:
      "Ultrasound-guided left lateral femoral cutaneous nerve perineural injection using ropivacaine. Later notes describe the block response as nondiagnostic, so exact numb territory, pain percent change, and duration remain unresolved.",
  },
  "records_md/generated/healthsummary_xml/DOC0026.md": {
    title: "Bladder ultrasound - normal postvoid residual",
    summary:
      "Bladder ultrasound ordered for difficulty emptying bladder. New Data Addendum reports prevoid 388 mL, postvoid 18 mL, and normal sonographic bladder appearance, weakening major urinary retention as support for tethered cord.",
  },
  "records_md/generated/healthsummary_xml/DOC0024.md": {
    title:
      "Lumbar MRI with thin filum terminale lipoma and no high-grade stenosis",
    summary:
      "Lumbar MRI showed thin filum terminale lipoma and minimal degenerative changes without high-grade stenosis; this did not strongly support a compressive radiculopathy explanation.",
  },
  "records_md/generated/healthsummary_xml/DOC0018.md": {
    title: "Overlake follow-up: blocks/epidural not diagnostically helpful",
    summary:
      "Overlake musculoskeletal follow-up noted EMG/NCS limitations, sympathetic ganglion blocks and L5 transforaminal epidural injection not diagnostically helpful, presentation not classic CRPS, and recommendation for corticosteroid-based LFCN block.",
  },
  "records_md/generated/healthsummary_xml/DOC0016.md": {
    title: "Left LFCN steroid block - lidocaine plus Kenalog",
    diagnostic_question:
      "Would left lateral femoral cutaneous nerve steroid/anesthetic injection produce a clinically meaningful diagnostic or therapeutic response?",
    baseline_before:
      "Repeat LFCN block was recommended after prior anesthetic-only block was nondiagnostic.",
    immediate_effect:
      "Procedure note reports ultrasound-guided left LFCN perineural injection with 1 mL 1% lidocaine plus 1 mL/40 mg Kenalog and no paresthesias or pain elicited during injection.",
    answered_question: "partially",
    summary:
      "Second LFCN perineural injection with lidocaine and Kenalog. Later notes report initial nocturnal pain increase and intermittent partial relief, but not a clean diagnostic response.",
  },
  "records_md/generated/healthsummary_xml/DOC0013.md": {
    title:
      "Overlake follow-up: LFCN block not diagnostic, ketamine partial/temporary",
    summary:
      "Follow-up after LFCN steroid block and ketamine infusions. New Data Addendum reports LFCN block initially increased nocturnal pain, then gave intermittent about 30% relief; clinician wrote LFCN block had not produced a diagnostic response.",
  },
  "records_md/generated/healthsummary_xml/DOC0006.md": {
    title: "Overlake follow-up after Stanford scar hydrodissection",
    summary:
      "Overlake musculoskeletal follow-up documented that hydrodissection of sensory nerves around scar tissue reportedly did not improve symptoms; pain remained severe and radicular-sounding but prior epidural approach had worsened symptoms.",
  },
  "records_md/generated/healthsummary_xml/DOC0005.md": {
    title: "Overlake ED / brief admission for worsening bilateral leg pain",
    summary:
      "Presented with worsening left leg pain and new right leg pain. ED used Stanford-style flare medications including IV hydromorphone, lorazepam, and ketamine with minimal improvement; admission was planned but patient left against medical advice before inpatient reassessment.",
  },
  "records_md/generated/healthsummary_xml/DOC0004.md": {
    title: "Overlake inpatient pain admission labeled CRPS/RSD",
    summary:
      "Admitted for acute-on-chronic pain labeled CRPS/reflex sympathetic dystrophy. Pain reportedly progressed to right leg and right arm; inpatient plan transitioned from oxycodone to oral hydromorphone and used short courses of prednisone/clonazepam on discharge.",
  },
  "records_md/generated/healthsummary_xml/DOC0003.md": {
    title: "Overlake neurology follow-up for weakness, vision, memory, gait",
    summary:
      "Neurology follow-up for worsening weakness, visual disturbance, memory loss, hesitant speech, and slow unsteady gait in the setting of pain flare and prior trauma; brain MRI and speech therapy were ordered.",
  },
  "records_md/generated/stanford_pdfs/Bella_Stanford_Tawfik_First_Visit_92925.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2025-09-29T12:00:00.000Z",
      title: "Stanford initial pain consultation - Tawfik",
      provider: "Vivianne Lily Tawfik, MD",
      location: "Stanford Pain Management Center",
      summary:
        "Initial Stanford pain consultation. Impression included left thigh pain after stab wound, possible scar neuroma versus lateral femoral cutaneous nerve injury. Exam documented well-healed scar, intact pinprick/light touch, no allodynia, and 5/5 strength. Recommended MR neurography, scar injection, possible later LFCN block, pain psychology/PT, and medication risk mitigation.",
    },
  "records_md/generated/user_provided/Stanford_MyHealth_Qian_Scar_Injection_2025_10_17.md":
    {
      review_status: "accepted",
      type: "procedure_test",
      occurred_at: "2025-10-17T22:45:00.000Z",
      title: "Stanford left thigh scar injection - Qian",
      provider: "Xiang Qian, MD, PhD",
      location: "Stanford Pain Management",
      diagnostic_question:
        "Would superficial left thigh scar injection reduce the usual scar/thigh pain and help localize a scar-mediated pain generator?",
      baseline_before: "Pre-procedure NRS: 8/10.",
      immediate_effect:
        "Post-procedure NRS: 8/10. Source note states the procedure did not help pain yet.",
      new_symptoms:
        "Patient voiced concern for possible post-procedure pain flare; later Stanford follow-up describes significant delayed flare, bulge/red circle concern, leg shaking, buckling sensation, and later reduction in pain intensity.",
      answered_question: "partially",
      summary:
        "Scar injection into left thigh scar using 0.5% ropivacaine, 2 mL. Immediate pain score did not improve; later notes describe a significant delayed flare and eventual partial change in pain intensity/localization.",
    },
  "records_md/generated/user_provided/Stanford_MyHealth_Tawfik_2025_11_17.md": {
    review_status: "accepted",
    type: "consult",
    occurred_at: "2025-11-17T12:00:00.000Z",
    title: "Stanford pain follow-up / peripheral nerve team review",
    provider: "Vivianne Lily Tawfik, MD",
    location: "Stanford Pain Management Center",
    summary:
      "Follow-up after 2025-10-17 scar injection. Patient reported significant delayed pain flare, LFCN blocks caused numbness without pain relief, and peripheral nerve team reviewed MR neurogram with no MRN findings; recommendations included scar injection as scheduled, possible LFCN block, and scar exploration if appropriate.",
  },
  "records_md/generated/user_provided/Stanford_MyHealth_Tawfik_Clinical_Note_2026_01_26.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2026-01-26T22:30:00.000Z",
      title: "Stanford pain follow-up after 2025-12-23 hydrodissection",
      provider: "Vivianne Lily Tawfik, MD",
      location: "Stanford Pain Management Center",
      summary:
        "Stanford pain follow-up documented 2025-12-23 deep scar injection/hydrodissection with no recalled numbness or pain improvement, new left foot numbness, possible pain localization toward scar, medication trials, prior blocks, and continued concern for scar neuroma/LFCN/anterior femoral cutaneous/vastus lateralis scar mechanisms.",
    },
  "records_md/generated/user_provided/Stanford_MyHealth_Pain_Psychology_Evaluation_2026_02_02.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2026-02-02T12:00:00.000Z",
      title: "Stanford pain psychology evaluation",
      provider: "Stanford Pain Psychology",
      location: "Stanford Pain Management Center",
      summary:
        "Pain psychology consultation for neuropathic left thigh pain and psychosocial contributors/treatment recommendations. Source should be used as behavioral-health context rather than an anatomic localization event.",
    },
  "records_md/generated/user_provided/Stanford_MyHealth_Fox_Hand_Surgery_2026_02_09.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2026-02-09T20:00:00.000Z",
      title:
        "Stanford hand/plastic surgery consult - scar exploration/RPNI discussed",
      provider: "Paige McCarthy Fox, MD, PhD",
      location: "Stanford Hand Surgery Clinic",
      diagnostic_question:
        "Was there a sufficiently targetable scar/nerve lesion to justify scar exploration and possible RPNI?",
      baseline_before:
        "Persistent 8-9/10 pain centralized to left thigh scar with radiation through the leg; no clearly identified large target nerve on imaging/injection.",
      immediate_effect:
        "Surgery risks/benefits discussed; patient elected to move forward at that time, but surgeon emphasized uncertainty and possible worsening.",
      answered_question: "partially",
      summary:
        "Surgical consult for painful left leg scar. Scar exploration and possible RPNI were discussed if an eligible nerve was identified; note emphasized no clear large nerve target and risk that surgery might not help or might worsen pain.",
    },
  "records_md/generated/stanford_pdfs/Bella_Stanford_Tawfik_visit_29.md": {
    review_status: "accepted",
    type: "consult",
    occurred_at: "2026-02-09T12:00:00.000Z",
    title:
      "Stanford pain follow-up - hold further procedures pending better localization",
    provider:
      "Samantha Chevel O'Connor Campbell, MD / Vivianne Lily Tawfik, MD",
    location: "Stanford Pain Management Center",
    summary:
      "Stanford pain follow-up expanded differential to scar neuroma, LFCN injury, anterior femoral cutaneous nerve injury, or vastus lateralis muscle scarring. Recommended holding off further procedures, considering sigma-1 PET study before exploratory surgery, pain psychology/PT, and cautious medication management.",
  },
  "records_md/generated/user_provided/Stanford_MyHealth_Anesthesia_Preprocedure_2026_04_09.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2026-04-09T19:29:00.000Z",
      title:
        "Stanford anesthesia preprocedure evaluation for planned left leg scar surgery",
      provider: "Richard D Muico, NP",
      location: "Stanford Anesthesia Preprocedure Evaluation",
      summary:
        "Pre-anesthesia evaluation for planned 2026-04-16 lower extremity wound closure for painful scar. Note listed chronic pain/CRPS diagnoses, medication list, and procedure-flare considerations. Later patient update says the procedure did not happen.",
    },
  "records_md/generated/user_provided/Stanford_MyHealth_Fox_Hand_Surgery_2026_04_13.md":
    {
      review_status: "accepted",
      type: "consult",
      occurred_at: "2026-04-13T17:30:00.000Z",
      title:
        "Stanford surgery follow-up - scar surgery deferred/canceled during flare",
      provider: "Paige McCarthy Fox, MD, PhD",
      location: "Stanford Hand Surgery Clinic",
      summary:
        "Surgery follow-up documented worsening CRPS symptoms with spread to other leg and hand. Patient was not amenable to proceeding with surgery; plan was to cancel the scheduled surgery and follow up by video.",
    },
};

const manualEvents = [
  {
    source_path: "reports_md/record_synthesis/EXTRACTED_RECORD_DIGEST.md",
    occurred_at: "2024-11-17T12:00:00.000Z",
    type: "consult",
    title: "Major MVC in Hawaii with polytrauma",
    summary:
      "Extracted digest documents high-impact rollover MVC with small subdural hematoma/brain bleed, C1 fracture, pneumothorax, right sacral fracture, left acetabular fracture, and pelvic ring/ramus fracture. Original left-thigh pain predated this crash, but the crash added major pelvic/lumbosacral/cervical and cognitive confounders.",
  },
  {
    source_path: "reports_md/record_synthesis/EXTRACTED_RECORD_DIGEST.md",
    occurred_at: "2025-03-25T12:00:00.000Z",
    type: "procedure_test",
    title: "Lumbar sympathetic block / sympathetic procedure",
    diagnostic_question:
      "Would a lumbar sympathetic block produce objective or sustained pain/autonomic improvement supporting sympathetically maintained pain?",
    immediate_effect:
      "Digest states response was brief/transient at most and not clearly diagnostic; exact injectate, level, temperature change, and pain score remain missing.",
    answered_question: "unclear",
    summary:
      "Lumbar sympathetic block/procedure inferred from pain follow-up notes and Acute Pain Therapies scans. Response was not cleanly diagnostic.",
  },
  {
    source_path: "reports_md/record_synthesis/EXTRACTED_RECORD_DIGEST.md",
    occurred_at: "2025-04-09T12:00:00.000Z",
    type: "procedure_test",
    title: "Left L5-S1 transforaminal epidural steroid injection",
    diagnostic_question:
      "Would left L5-S1 transforaminal epidural steroid injection support a radicular pain generator?",
    immediate_effect:
      "Operative report reportedly documented no immediate complication; later notes indicate pain escalated/worsened rather than diagnostic relief.",
    answered_question: "partially",
    summary:
      "Left L5-S1 transforaminal epidural steroid injection for lumbar radiculopathy/lumbosacral radiculitis. Later notes make dominant L5 radiculopathy less likely because the injection did not produce diagnostic relief.",
  },
  {
    source_path: "reports_md/record_synthesis/EXTRACTED_RECORD_DIGEST.md",
    occurred_at: "2025-05-02T12:00:00.000Z",
    type: "consult",
    title: "Kirkland Spine Care follow-up after epidural injection",
    summary:
      "Kirkland Spine Care follow-up described small left L5-S1 HNP/radiculopathy framing, noted the 2025-04-09 lumbar ESI did not improve pain and seemed to exacerbate it, and planned EMG/NCV.",
  },
  {
    source_path: "reports_md/record_synthesis/EXTRACTED_RECORD_DIGEST.md",
    occurred_at: "2025-06-17T12:00:00.000Z",
    type: "procedure_test",
    title: "EMG/NCV attempt - NCS not tolerated, limited EMG normal",
    diagnostic_question:
      "Was there large-fiber evidence of lumbar radiculopathy, sacral plexopathy, or myopathy?",
    immediate_effect:
      "Nerve conduction study was not tolerated and was terminated; limited EMG portion reportedly showed no denervation and no evidence of lumbar radiculopathy, sacral plexopathy, or myopathy.",
    answered_question: "partially",
    summary:
      "Limited electrodiagnostic testing weakens large-fiber motor radiculopathy/plexopathy/myopathy but does not rule out small cutaneous nerve injury, small-fiber pain, or intermittently symptomatic radiculopathy.",
  },
  {
    source_path:
      "reports_md/imaging_review_2026-05-08/DICOM_FINDINGS_REPORT.md",
    occurred_at: "2025-10-01T12:00:00.000Z",
    type: "imaging",
    title: "Stanford left thigh MR neurography",
    summary:
      "3T left thigh MR neurography. Stanford report and local DICOM review found no discrete neuroma, perineural mass, nerve discontinuity, neural impingement, abscess, hematoma, acute fracture, or convincing major named nerve abnormality; this does not rule out tiny terminal cutaneous branch neuroma or dynamic scar tethering.",
  },
  {
    source_path:
      "records_md/generated/user_provided/Stanford_MyHealth_Fox_Hand_Surgery_2026_02_09.md",
    occurred_at: "2025-10-29T12:00:00.000Z",
    type: "imaging",
    title: "Outside ultrasound after scar injection flare",
    summary:
      "Outside ultrasound reportedly showed heterogeneously echogenic subcutaneous tissue and similar irregular echogenicity in the underlying vastus lateralis near the painful left lateral thigh scar, without drainable collection or hypervascularity; LFCN branches were difficult to visualize.",
  },
  {
    source_path:
      "records_md/generated/user_provided/Stanford_MyHealth_Tawfik_Clinical_Note_2026_01_26.md",
    occurred_at: "2025-12-23T12:00:00.000Z",
    type: "procedure_test",
    title:
      "Deep scar injection / hydrodissection targeting branch to vastus lateralis",
    diagnostic_question:
      "Would deep scar hydrodissection targeting a branch to vastus lateralis improve pain or clarify the local generator?",
    immediate_effect:
      "Patient did not recall numbness or pain improvement; noted left foot numbness. Later Stanford interpretation suggested possible narrowing toward scar area but not a clean diagnostic success.",
    new_symptoms:
      "Top-of-foot/left foot numbness was reported after the procedure and requires separate localization because it does not fit isolated LFCN distribution.",
    answered_question: "partially",
    summary:
      "Deep scar injection/hydrodissection into the left lateral thigh scar, target described as branch of nerve to vastus lateralis. Not a clean diagnostic success and may have changed symptom distribution.",
  },
];

function applyOverride(event) {
  const duplicateReason = duplicateOrSourceOnly.get(event.source_path);
  if (duplicateReason) {
    return {
      ...event,
      review_status: "rejected",
      reviewer_note: duplicateReason,
    };
  }

  const override = eventOverrides[event.source_path];
  if (!override) return event;

  return {
    ...event,
    ...override,
    review_status: override.review_status ?? event.review_status,
    reviewer_note: "Manually curated for current-records seed.",
  };
}

function manualEvent(row, sourcesByPath) {
  const source = sourcesByPath.get(row.source_path);
  if (!source) {
    throw new Error(`Manual event source not found: ${row.source_path}`);
  }

  return {
    id: stableUuid(
      `manual-event:${row.source_path}:${row.occurred_at}:${row.title}`,
    ),
    review_status: "accepted",
    confidence: "manual_digest_review",
    source_id: source.id,
    source_path: row.source_path,
    type: row.type,
    occurred_at: row.occurred_at,
    date_precision: row.date_precision ?? "date",
    title: row.title,
    provider: row.provider ?? null,
    location: row.location ?? null,
    summary: row.summary,
    diagnostic_question: row.diagnostic_question ?? null,
    baseline_before: row.baseline_before ?? null,
    immediate_effect: row.immediate_effect ?? null,
    effect_24h: row.effect_24h ?? null,
    effect_72h: row.effect_72h ?? null,
    effect_1w: row.effect_1w ?? null,
    effect_1m: row.effect_1m ?? null,
    new_symptoms: row.new_symptoms ?? null,
    answered_question: row.answered_question ?? null,
    repeat_recommendation: row.repeat_recommendation ?? null,
    reviewer_note: "Manually added from current-records audit.",
  };
}

async function main() {
  const sources = await readJsonl(manifestPath);
  const sourcesByPath = new Map(
    sources.map((source) => [source.workspace_path, source]),
  );
  const events = (await readJsonl(eventsPath)).map(applyOverride);
  const existingKeys = new Set(
    events.map(
      (event) => `${event.source_path}:${event.occurred_at}:${event.title}`,
    ),
  );

  for (const row of manualEvents) {
    const key = `${row.source_path}:${row.occurred_at}:${row.title}`;
    if (!existingKeys.has(key)) events.push(manualEvent(row, sourcesByPath));
  }

  events.sort((a, b) => {
    const byDate = a.occurred_at.localeCompare(b.occurred_at);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });

  await writeJsonl(outputPath, events);

  const counts = events.reduce((accumulator, event) => {
    accumulator[event.review_status] =
      (accumulator[event.review_status] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(
    `Wrote ${path.relative(appRoot, outputPath)} with ${events.length} events.`,
  );
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
