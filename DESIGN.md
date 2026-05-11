# Bella Care Tracker - Design Plan

## Purpose

Build a private family-facing web app that centralizes Bella's pain history, daily symptom tracking, appointments, decisions, evidence, and diagnostic reasoning.

The app is not a medical device, not a clinician portal, and not a compliance-heavy healthcare product. It is a practical tracking and decision-support tool for Bella and family, designed to turn scattered daily events into a clear timeline and clinician-ready summaries.

The core product question:

> What happened, what changed, what helped or worsened things, what decisions were made, and what evidence supports each next step?

## Product Principles

1. **Fast capture first.** Logging a flare, symptom, medication response, or photo must take seconds.
2. **Timeline is the spine.** Every entry, upload, appointment, procedure, medication change, and decision should be visible in one unified chronology.
3. **Evidence must stay linked.** A diagnostic claim should link back to records, photos, logs, procedures, or literature.
4. **Clinician export matters.** The app should create concise visit packets from messy daily data.
5. **No fake certainty.** Diagnostic branches should show status, evidence for, evidence against, and what would change the conclusion.
6. **Private by default.** Login required, uploads private, no public links unless explicitly created.
7. **Family owns the data.** The app must support bulk export of records, logs, uploads, and structured data so the family can leave the platform at any time.
8. **Medical history is append-only by default.** Destructive deletion should be rare; use soft-delete and audit/version history for records, decisions, and diagnostic reasoning.

## Stack

- **Framework:** Next.js App Router
- **UI:** shadcn/ui + Tailwind CSS
- **Icons:** lucide-react
- **Database/Auth/Storage:** Supabase
- **Hosting:** Vercel
- **Charts:** Recharts or Tremor-style chart primitives
- **Dates:** date-fns
- **Forms:** react-hook-form + zod

This should be a normal authenticated web app, not a static site, because it needs uploads, logs, scheduling, and editable decision records.

## Information Architecture

Primary navigation:

- Dashboard
- Flare Mode
- Pain Book
- Log Book
- Timeline
- Diagnostic Tree
- Decisions
- Schedule
- Medications
- Procedures & Tests
- Source Library
- Safety & Care Team
- Export Packets
- Settings

## Visual Direction

This is an operational health tracker, not a marketing site.

Visual thesis: quiet, clinical, dense, and trustworthy, with a calm neutral surface, restrained accent color, and strong timeline/data hierarchy.

Design rules:

- No landing-page hero.
- No decorative card mosaics.
- Use a compact app shell with left navigation and a main workspace.
- Cards are allowed for repeated entries, upload previews, and focused tools, but avoid cards inside cards.
- Prioritize scanning: dates, status labels, body regions, severity, and next actions should be obvious.
- Use icons for actions: add, upload, calendar, filter, export, image, edit, link, alert.
- Mobile must support quick flare logging and photo upload.

## Core Workflows

### 1. Flare Mode

The highest-value workflow.

User taps **Start flare** and the app opens a live flare session.

Capture:

- Start time
- Suspected trigger
- Body regions
- Pain score now / peak / end
- Symptoms
- Color or temperature changes
- Weakness, freezing, buckling, numbness
- Photos/videos
- Medications or interventions tried
- Response at 30 / 60 / 120 minutes
- Extended checkpoints at 6h / 12h / 24h / 48h for severe or prolonged flares
- Left/right photo pairs and temperature readings when color or temperature asymmetry is present
- Recovery time
- Notes

End state:

- Active flare becomes a timeline event.
- Attached images are linked to the flare.
- Vasomotor measurements become plottable data.
- Summary can be used in appointment packets.

### 1A. Photo Comparison And Vasomotor Capture

This is part of MVP, not a later enhancement, because the case repeatedly needs objective documentation of episodic color/temperature changes that are absent from clinic exams.

Workflow:

- Select body site pair: knees, thighs, shins, feet, wrists, hands, arms, or custom.
- Capture or upload left/right photos under the same lighting.
- Record optional infrared thermometer readings for each side.
- Store exact site labels: scar, lateral thigh, knee, shin, dorsal foot, big toe, wrist, hand, forearm.
- Compute temperature delta automatically.
- Mark context: baseline, active flare, recovery, after pressure trigger, after medication, after procedure.
- Attach to flare, log entry, diagnostic node, and export packet.

The UI should make side-by-side comparison easy for clinicians: same timestamp, same lighting note, left/right labels, numeric delta, and symptom notes.

### 2. Pain Book

Structured daily pain entries.

Fields:

- Date/time
- Entry type: baseline, flare, recovery, procedure-related, medication-related
- Pain score: current, worst, average
- Body regions
- Pain qualities: burning, stabbing, aching, freezing, electric, cramping, numbness, pressure
- Triggers: pressure, blanket, breeze, activity, stairs, driving, PT, procedure, medication change, sleep, unknown
- Bella-specific triggers should be first-class quick options: BP cuff, IV placement, ring, wrist hairband, sleeping on arm, tight clothing, breeze, blanket, vibration, sitting, driving, stairs, PT, procedure, scar touch/probe pressure.
- Function impact: walking, stairs, sleep, driving, leaving house, eating, bathing, concentration
- Interventions tried
- Response
- Notes
- Attachments

### 3. Log Book

Freeform event capture for things that do not fit cleanly into pain scoring.

Examples:

- Arm froze after BP cuff.
- Knee turned red and cold.
- New top-of-foot numbness.
- Bad reaction after medication.
- Sleep crash.
- ED visit.
- Speech/vision/cognitive episode.

Log entries should support tags, body regions, attachments, and links to diagnostic branches.

### 4. Timeline

The timeline merges historical data and new entries.

Timeline item types:

- Injury
- Procedure
- Imaging
- Test/lab
- Consult
- Medication start/stop/change
- Flare
- Pain entry
- Uploaded image/video
- Decision
- Appointment
- Diagnosis update
- Export packet

Filters:

- Flares only
- Procedures
- Medications
- Imaging/tests
- Appointments
- Left thigh/scar
- Foot/big toe
- Arm episodes
- CRPS evidence
- TBI/cognitive track
- Uploaded media

### 5. Diagnostic Tree

A living decision tree for diagnostic reasoning.

Initial branches:

- Mixed-mechanism post-traumatic left lateral-thigh pain
- Focal scar / terminal branch / vastus-lateralis generator
- CRPS / chronic cold-phase phenotype
- CRPS Type I vs Type II subtype question
- Branch-to-vastus-lateralis motor injury
- L5 / peroneal / plexus localization for foot and big toe symptoms
- Central sensitization / nociplastic pain
- Functional movement disorder or CRPS motor overlay
- Autoimmune small-fiber neuropathy
- Sjogren-related SFN / ganglionitis
- MCAS
- Sodium channelopathy
- Autoimmune autonomic ganglionopathy
- Occult vascular / lymphatic scar lesion
- Post-TBI cognitive / visual / gait track

Each diagnostic node:

- Status: unreviewed, suspected, supported, weakened, ruled out, confirmed, monitoring
- Confidence: low, moderate, high, unknown
- Why considered
- Evidence for
- Evidence against
- Tests needed
- Treatment implications
- Open questions
- Linked timeline events
- Linked uploads
- Linked records/literature
- Last reviewed date
- Merge/split history

Diagnostic nodes must be editable over time. A branch may split when evidence becomes more specific, or merge when a distinction stops mattering. Example: the CRPS Type I vs Type II subtype question may collapse after a clinician-observed flare exam and nerve-injury localization pass.

### 6. Decisions

Structured decision journal.

Examples:

- Should we pursue scar exploration?
- Should we attempt sigma-1 PET/MRI?
- Should we retry EMG/NCS with tolerance plan?
- Should we consider buprenorphine rotation?
- Should we do another ketamine infusion?
- Should we pursue MCAS/SFN/channelopathy testing?

Fields:

- Decision question
- Status: open, waiting on test, waiting on clinician, decided, rejected, revisiting
- Options
- Evidence for each option
- Risks
- What would change the decision
- Responsible clinician/person
- Target date
- Final decision
- Rationale
- Linked evidence

### 7. Schedule

Appointments, tests, reminders, and tasks.

Appointment fields:

- Date/time
- Provider
- Location/link
- Purpose
- Prep instructions
- Questions to ask
- Files/photos to show
- Decisions needed
- After-visit summary
- Follow-up tasks

Task examples:

- Upload brain MRI report.
- Ask Stanford about FTC-146 PET/MRI eligibility.
- Schedule high-resolution peripheral nerve ultrasound.
- Bring flare photos to appointment.
- Clarify why sirolimus was prescribed.

### 8. Medication And Intervention Response

Track medications and interventions by outcome, not just inventory.

Medication fields:

- Name
- Dose
- Route
- Start/stop dates
- Prescriber
- Reason
- Helped pain? helped sleep? helped anxiety? helped function?
- Side effects
- Notes

Response entries:

- Medication/intervention
- Time taken
- Reason
- Pain before
- Pain after 30 / 60 / 120 minutes
- Sedation/cognition/gait effect
- Side effects
- Helped / unclear / worsened

### 9. Procedure Impact View

Every procedure should answer:

- What question was this supposed to answer?
- What was the baseline before?
- What happened immediately?
- What happened at 24h, 72h, 1 week, 1 month?
- Did it create new symptoms?
- Did it answer the diagnostic question?
- Should it be repeated?

This is important because prior procedures were often nondiagnostic and sometimes flared symptoms.

### 10. Source Library

Store and link:

- PDFs
- Images
- Videos
- Visit notes
- Imaging reports
- Lab reports
- Generated markdown reports
- Literature references

Each source:

- Title
- Date
- Source type
- Provider/source
- File
- Extracted summary
- Tags
- Linked timeline events
- Linked diagnostic nodes
- Linked decisions

### 10A. Safety List, Care Team, And Emergency Packet

Safety and care coordination are first-class records, not notes copied into each packet.

Safety list:

- Allergies
- Medication intolerances
- Procedure precautions
- Physical do-nots
- Care-context warnings

Each safety item stores severity, reaction/description, evidence/source, active/inactive state, and last-reviewed date. Examples include no BP cuff on the left arm, avoid IV in the left hand if possible, and scar probing flare history. These records surface in emergency export and pre-procedure planning; the app does not infer or rank new contraindications on its own.

Care team:

- Name
- Organization
- Specialty/role
- Portal/contact notes
- What they manage
- Last visit
- Next visit

Appointments, decisions, medications, sources, procedures/events, and export packets should be able to link to a care team member while preserving existing free-text provider/prescriber fields for legacy or uncertain records.

Emergency packet:

- Separate from the clinician visit packet
- One-page and ED-oriented
- Always-current rather than date-range scoped
- Markdown first, PDF later
- Includes calibrated case summary, current meds, allergies/intolerances, avoid/contraindications, care team contacts/roles, and last-reviewed timestamp

### 11. Export Packets

Visit packets and emergency packets are distinct products.

Visit packet options:

- Last 7 days
- Last 30 days
- Last 90 days
- Since last appointment
- Specific diagnostic branch
- Specific body region
- Full case summary

Visit packet contents:

- Current working case summary in calibrated language
- Current meds
- Active decisions
- Upcoming appointments/tests
- Flare frequency and recovery time
- Key timeline events
- Procedure impact summaries
- Selected photos
- Questions for clinician
- Open tests/tasks

Output:

- Printable PDF
- Markdown summary
- Shareable read-only view later, if needed

## Data Model Draft

### Record attribution convention

Medical/family records distinguish the subject from the person entering the record:

- `user_id`: current legacy owner/actor field on existing tables
- `subject_user_id`: who the record is about
- `entered_by_user_id`: who entered or imported the record

For existing records, `subject_user_id` backfills from `user_id`, and `entered_by_user_id` backfills from `created_by` where available or `user_id`. New caregiver-entered records should preserve Bella as the subject while showing the caregiver as the entering user.

### roles

- id
- name

Initial roles:

- primary: Bella
- caregiver: family member managing logs/schedule
- viewer: family read-only
- clinician_readonly: future limited-access role

### users

- id
- email
- name
- role_id
- mfa_enabled
- last_login_at
- created_at
- updated_at
- deleted_at

### body_regions

- id
- name
- side
- parent_region_id
- display_order

Examples: left lateral thigh scar, left knee, left top of foot, left big toe, right leg, left wrist, right arm, head/vision/cognition.

### symptoms

- id
- name
- category

Categories: sensory, vasomotor, sudomotor/edema, motor/trophic, cognitive, medication side effect, function.

### entries

- id
- user_id
- subject_user_id
- entered_by_user_id
- type
- occurred_at
- ended_at
- title
- pain_current
- pain_peak
- pain_average
- primary_trigger_id
- notes
- is_flare
- recovery_minutes
- created_at
- updated_at
- deleted_at

### entry_regions

- entry_id
- body_region_id

### entry_symptoms

- entry_id
- symptom_id
- severity
- notes

### triggers

- id
- name
- category
- display_order
- is_bella_specific

Initial Bella-specific triggers: BP cuff, IV placement, ring, wrist hairband, sleeping on arm, tight clothing, breeze, blanket, vibration, sitting, driving, stairs, PT, procedure, scar touch/probe pressure.

### entry_triggers

- entry_id
- trigger_id
- notes

### vasomotor_measurements

- id
- user_id
- subject_user_id
- entered_by_user_id
- entry_id
- measured_at
- site
- left_temp_c
- right_temp_c
- delta_c
- left_color
- right_color
- lighting_notes
- context
- notes
- created_at
- updated_at
- deleted_at

Use this for paired temperature/color documentation. If only one side is relevant, leave the opposite side null but still record the site and context.

### events

- id
- user_id
- subject_user_id
- entered_by_user_id
- type
- occurred_at
- title
- summary
- provider
- care_team_member_id
- location
- source_id
- created_at
- updated_at
- deleted_at

### attachments

- id
- user_id
- file_path
- file_name
- mime_type
- size_bytes
- captured_at
- description
- created_at
- updated_at
- deleted_at

### attachment_links

- attachment_id
- linked_type
- linked_id

Linked types: entry, event, decision, diagnosis, appointment, source.

This polymorphic pattern is convenient but does not provide database-level referential integrity across every target table. Either enforce integrity in application code with tests or replace with per-type join tables before the schema stabilizes.

### diagnoses

- id
- subject_user_id
- entered_by_user_id
- title
- status
- confidence
- summary
- why_considered
- evidence_for
- evidence_against
- tests_needed
- treatment_implications
- last_reviewed_at
- created_at
- updated_at
- deleted_at

### evidence_links

- id
- diagnosis_id
- linked_type
- linked_id
- direction
- note
- created_at
- updated_at
- deleted_at

Direction: supports, weakens, neutral, pending.

### decisions

- id
- subject_user_id
- entered_by_user_id
- title
- status
- question
- options
- evidence_for
- evidence_against
- risks
- what_would_change
- owner
- owner_care_team_member_id
- target_date
- final_decision
- rationale
- created_at
- updated_at
- deleted_at

### appointments

- id
- subject_user_id
- entered_by_user_id
- date_time
- provider
- care_team_member_id
- specialty
- location
- purpose
- prep_notes
- questions
- after_visit_summary
- follow_up_tasks
- created_at
- updated_at
- deleted_at

### medications

- id
- subject_user_id
- entered_by_user_id
- name
- dose
- route
- frequency
- start_date
- stop_date
- prescriber
- prescriber_care_team_member_id
- reason
- status
- notes
- created_at
- updated_at
- deleted_at

### medication_responses

- id
- subject_user_id
- entered_by_user_id
- medication_id
- entry_id
- taken_at
- reason
- pain_before
- pain_30m
- pain_60m
- pain_120m
- side_effects
- function_effect
- overall_response
- created_at
- updated_at
- deleted_at

### sources

- id
- subject_user_id
- entered_by_user_id
- title
- source_type
- source_date
- provider
- care_team_member_id
- file_path
- summary
- citation
- created_at
- updated_at
- deleted_at

### care_team_members

- id
- user_id
- subject_user_id
- entered_by_user_id
- name
- organization
- specialty
- role
- portal_url
- contact_notes
- manages
- manages_tags
- last_visit_at
- next_visit_at
- active
- last_reviewed_at
- notes
- created_at
- updated_at
- deleted_at

Use `care_team_member_id` links from appointments, decisions, medications, sources, and procedure/test events. Keep free-text provider fields where needed; the linked care team member is the structured source.

### avoid_contraindications

- id
- user_id
- subject_user_id
- entered_by_user_id
- category: allergy, medication_intolerance, procedure_precaution, physical_do_not, care_context_warning
- severity: info, low, moderate, high, critical
- title
- reaction_description
- evidence_source
- source_id
- active
- last_reviewed_at
- notes
- created_at
- updated_at
- deleted_at

This is the source of truth for emergency export safety items and pre-procedure planning warnings.

### case_summary_versions

- id
- user_id
- subject_user_id
- entered_by_user_id
- summary_text
- calibration_note
- status: draft, active, superseded, retired
- authored_by_text
- reviewed_by_text
- reviewed_at
- source_note
- created_at
- updated_at
- deleted_at

This stores the working case summary paragraph in calibrated language. It is versioned, editable, auditable, and usable by both the visit packet and emergency packet. It is not a diagnosis assertion and should not replace diagnostic-node evidence.

### emergency_packet_reviews

- id
- user_id
- subject_user_id
- entered_by_user_id
- reviewed_by_user_id
- reviewed_at
- notes
- created_at
- updated_at
- deleted_at

This gives the always-current emergency packet a clear last-reviewed timestamp without requiring a generated packet to be persisted.

### tasks

- id
- title
- status
- due_date
- owner
- related_type
- related_id
- notes
- created_at
- updated_at
- deleted_at

### audit_log

- id
- user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at

Use for decisions, diagnostic nodes, source records, medication changes, and deletions.

## MVP Scope

Build the first version in this order:

1. **Authenticated app shell**
   - Login
   - Left navigation
   - Dashboard

2. **Pain Book + Log Book**
   - Create/edit/delete entries
   - Body regions
   - Symptoms
   - Bella-specific triggers
   - Attachments

3. **Flare Mode**
   - Start flare
   - Add snapshots over time
   - Add 30 / 60 / 120 minute and 6h / 12h / 24h / 48h checkpoints
   - Capture left/right photos and temperature pairs
   - End flare
   - Generate flare summary

4. **Photo Comparison + Vasomotor Data**
   - Left/right image pairs
   - IR temperature readings
   - Site labels
   - Delta calculation
   - Export-ready comparison view

5. **Timeline**
   - Merge entries, events, appointments, procedures, medications, attachments
   - Filters

6. **Decisions**
   - Decision records
   - Link evidence

7. **Schedule**
   - Appointments
   - Visit prep
   - Follow-up tasks

8. **Diagnostic Tree**
   - Node list
   - Evidence for/against
   - Linked entries/events/sources
   - Merge/split node history

9. **Safety & Care Coordination**
   - Avoid/contraindication list
   - Care team directory
   - Versioned case summary
   - Emergency packet Markdown

10. **Export Packets**

- Generate markdown first
- PDF later
- Keep visit packet and emergency packet distinct
- Include photo comparison panels and temperature deltas where relevant

11. **Bulk Export**

- Export structured JSON/CSV
- Export uploaded files
- Export generated visit packets
- Package as zip

## Later Enhancements

- Body map visual selector
- Temperature tracking chart
- Medication response charts
- Flare frequency and recovery charts
- Sleep/function correlation
- Import existing markdown reports into structured database rows
- OCR/extraction for uploaded PDFs
- Read-only share links for clinicians
- Calendar integration
- Push reminders

Offline-capable mobile logging should be designed early, even if not shipped in the first implementation. Flare capture should queue locally when connectivity is poor and sync later without losing photos or timestamps.

## Initial Content To Seed

Seed from the existing workspace:

- `reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md`
- `reports_md/MOST_LIKELY_DIAGNOSIS_2026-05-08.md`
- `reports_md/NEXT_STEPS_LITERATURE_2026-05-08.md`
- `reports_md/NEXT_STEPS_DEEPER_RESEARCH_2026-05-08.md`
- `reports_md/record_synthesis/NEW_DATA_ADDENDUM_2026-05-08.md`
- Generated record markdown under `records_md/generated/`

Initial diagnostic tree should be seeded from the final treatment plan, but the app must treat it as editable and evolving.

## Hosting Plan

Initial deployment:

- Vercel for Next.js
- Supabase project for database/auth/storage
- One or two family accounts
- Private storage bucket
- No public file URLs; use signed, short-lived URLs for downloads/previews
- Supabase storage encryption at rest
- MFA enabled for primary/caregiver accounts
- Session timeout configured
- No third-party analytics or trackers for medical text/events
- Soft-delete and audit trail for medical records and diagnostic decisions
- Bulk export as a first-class feature

This is enough for a family tracker. If sharing expands later, add stricter access controls, narrower clinician permissions, and more granular audit views.

## Definition Of Done For MVP

The MVP is useful when Bella/family can:

1. Log a flare with photos in under one minute.
2. Capture left/right color/temperature evidence with photos and numeric readings.
3. See all events in one timeline.
4. Open a diagnostic branch and see evidence for/against it.
5. Prepare for a clinician visit from recent logs and open decisions.
6. Export a concise summary packet.
7. Export all app data and uploaded files as a zip.
