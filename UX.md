# Bella Care Tracker — UX

> Notes from first principles.

The Bella Care Tracker is a small app for an unsmall problem. This document explains what it should feel like to use, why those choices, and what the app refuses to do. It is paired with `DESIGN.md` and `TICKETS.md`, but it is the document that should govern when the other two disagree with each other.

The voice the rest of this document carries is deliberate. The case it serves has been worked on for seven years across many providers, with the patient herself often left as the archivist of her own illness. The app's job is not to add another opinion. It is to make the record honest, the capture fast, and the next conversation shorter.

---

## Part I — The Problem

### I. The Patient as Historian

The chronic patient becomes her own archivist. She must remember what triggered yesterday's flare, what the orthopedist said in March, which medication did and did not help, when the foot numbness began, and which clinician suggested which test. She does this while in pain, often while sedated, and while attending to a body that is not cooperating with memory. The clinical record is fragmentary, scattered across portals, and almost never reflects what happened between visits. The patient is left to be both subject and historian, often while the disease is actively eroding the historian's tools.

This app exists to take the structured part of that historical labor off the patient's hands. Not all of it. The patient's experience is irreducible. But timestamps, durations, pairings, and trends should not require her to be a scribe.

### II. The Forgotten Hour

A flare cannot be summoned in clinic. By the time the patient arrives at her appointment, the redness has faded, the temperature has equalized, the limb that was frozen has thawed. The clinical exam captures the interictal state. In a chronic cold-phase syndrome, the interictal state is exactly the state where the diagnosis is least visible. A record consisting of fifteen interictal exams says less than one well-photographed flare.

The app's central conviction is that the forgotten hour — the flare at 2am, the bilateral knee redness that resolves before the appointment — must become recoverable. The mechanism is fast capture in the moment, with timestamps and photos and measured temperatures. The app's first-order job is to be present during the hour the clinic cannot see.

### III. The Distinction We Will Hold

We will say what this is not. It is not a medical device. It is not a clinician portal. It is not a diagnostic engine. It does not compute treatment recommendations and it does not assert diagnoses. It is a tracker, a witness, a memory.

The distinction shapes every interaction. A medical device must be accurate; this app must be honest. A clinician portal must be efficient; this app must be patient. A diagnostic engine must commit; this app must hold uncertainty without letting it dissolve into noise.

The clinician retains diagnostic authority. The patient retains her experience. The app sits between them, and its job is fidelity — to capture what the patient lived without distorting it, and to deliver it to the clinician without overclaiming.

---

## Part II — Principles

### IV. Capture Before Recall

The longer it takes to log a flare, the less is logged. Memory degrades; the flare itself often impairs the cognition needed to write about it. Every capture interaction must assume the user is in pain, distracted, possibly sedated, and on a phone with one hand free.

The rule: if a primary capture action takes longer than ten seconds, it has failed. If a secondary action takes longer than thirty, it has failed. The flare-mode start button is globally reachable from anywhere in the app. Whatever cannot be captured in seconds will not be captured at all. We design for the worst minute, not the best.

### V. Witness, Not Verdict

The app describes; it does not pronounce. Pain scores are recorded as the patient reports them. Triggers are tagged but not weighted. Vasomotor measurements are stored as numeric pairs with timestamps; the app does not infer "this is a CRPS sign." The diagnostic tree shows status and evidence direction, but the app itself does not move evidence between buckets. That is the work of the patient and her clinicians.

This restraint is not weakness. The app's value is precisely that it does not contaminate the record with its own opinions. A clinician opening the export packet should see the patient's data, not the app's interpretation of it.

### VI. The Timeline Is the Spine

Every meaningful event in this case has a time. The injury, the flare, the procedure, the medication change, the photo, the lab result, the cognitive episode, the decision to skip a procedure. Every entity in the app must contribute to a single chronological view. The timeline is not a feature; it is the spine the rest of the app hangs from. A flare with no timeline entry is not a flare; a procedure with no impact entry is not a procedure.

Filtering is how the timeline becomes usable. The default view is overwhelming on purpose — it is the unfiltered chronology of an illness — and filters are how the patient or clinician asks a specific question of it: only flares, only procedures with their impact, only events tagged "arm episode," only the last 90 days.

### VII. No Fake Certainty

A diagnostic node may be unreviewed, suspected, supported, weakened, ruled out, monitoring, or confirmed. It has a confidence band. It carries evidence in both directions and an explicit "what would change this." The app does not show a diagnosis as confirmed unless the underlying criteria — Budapest signs, Arnold neuroma criteria, an antibody result, an imaging finding — are present and linked.

This is the principle the patient most needs the app to hold. A chart label of "CRPS/RSD" applied during an inpatient stay, without a Budapest exam, is a label, not a diagnosis. The app shows it in the timeline as a diagnostic update. It does not promote it to "confirmed" until the evidence is in.

### VIII. Privacy by Architecture

Private by default is not a posture; it is an architectural commitment. Login is required. Storage is private. File URLs are signed and short-lived. Encryption at rest. MFA available for primary and caregiver. No third-party analytics or trackers anywhere in the medical-text path. Soft delete with audit trail by default; destructive deletion requires explicit confirmation and a reason.

These are not features in Settings. They are the substrate on which every other interaction sits. A UI choice that compromises any of them — a public preview link, an embedded analytics widget, an export field that leaks identifiers — is rejected at design review, not patched later.

### IX. The Family Owns the Data

The patient and her family, not the app, are the custodians. Every record is exportable as a structured archive. Every upload can be downloaded in original form. Every diagnostic node and decision-journal entry exports as plain markdown. The app is a place the data lives; it is not a place the data is held hostage.

This principle has a practical consequence. Every screen that creates data has a corresponding export pathway. Bulk export is not a Settings nicety; it is a load-bearing feature. The family must be able to leave the platform with everything, at any time, without help.

---

## Part III — The Patterns

The patterns below describe specific surfaces. Where they conflict with `DESIGN.md`, the pattern here is canonical for UX intent; the design doc is canonical for data shape.

### X. Flare Mode — The Emergency Liturgy

A flare is not a calm event. The user is in pain, distracted, possibly sedated. The flow must be a liturgy: small, fixed, repeatable, performable in any state.

**Start.** One tap, from anywhere. The active flare appears as a persistent banner across the app — there is never a question about whether a flare is being captured.

**Checkpoints.** Default 30m / 60m / 120m. Severe flares add 6h / 12h / 24h / 48h. Each checkpoint captures pain score, optional trigger, body regions, brief notes, optional photo, optional temperature pair. Adding a checkpoint is two taps.

**Photo capture.** Paired left/right with one workflow: choose body site (knee, thigh, foot, wrist, custom), capture affected side, capture unaffected side. The infrared thermometer reading is offered but never required.

**End.** One tap. The summary is generated automatically: start time, peak pain, recovery duration, checkpoints, attached photos, attached vasomotor measurements, suspected trigger, interventions tried, response. The summary is a timeline event and is eligible for inclusion in the next visit packet.

The flare-mode flow is the liturgy. It runs the same way at 2am as at 2pm. Its uniformity is a kindness.

### XI. The Pain Book — A Daily Breviary

The pain book is the regular daily entry. It is structured: type (baseline, flare, recovery, procedure-related, medication-related), pain score (current, peak, average), body regions, qualities (burning, stabbing, freezing, electric, cramping, numbness, pressure), triggers, function impact, interventions tried, response. Entries are short, fast, and frequent.

The case-specific triggers — BP cuff, IV placement, ring, wrist hairband, sleeping on arm, tight clothing, breeze, blanket, vibration, sitting, driving, stairs, PT, procedure, scar touch — are first-class quick-tap options on this screen. They are the case's actual triggers and they should not be buried under "other."

The pain book is the breviary: the regular practice from which the timeline grows. It does not have to be exhaustive. It does have to be regular.

### XII. The Log Book — When Pain Scores Don't Fit

Some events do not reduce to a number. _Arm froze after BP cuff. Knee turned red and cold. New top-of-foot numbness this morning. Bad reaction to scar injection. Speech episode at dinner._ These are log-book entries.

The log book is freeform with structure: title, description, body regions, tags, attachments. It is the place where the patient's experience that does not collapse to a pain score still gets a record. Cognitive and visual episodes belong here, not in the pain book.

### XIII. Photo Comparison — What the Clinic Cannot See

The bilateral knee episode is the case's signature finding and its hardest documentation problem. It happens at home, lasts hours, and resolves before any clinic visit. The photo-comparison view is the answer.

A photo-comparison entry contains: site label, left photo, right photo, optional left and right infrared temperatures, computed delta, lighting note, context tag (baseline, active flare, after pressure trigger, after medication, after procedure), and notes. Side-by-side display is the default. The comparison exports as a single panel, with timestamps, into the visit packet.

This is the part of the app the clinic record cannot replace. It exists because the most diagnostically valuable observation in this case — measured temperature asymmetry during a flare — has never been captured in seven years of contact with the medical system. The photo-comparison flow is the mechanism for closing that gap.

### XIV. The Diagnostic Tree — Humility in the Face of Complexity

The diagnostic tree is a list of working hypotheses. Each node carries: status, confidence band, why-considered, evidence-for, evidence-against, tests-needed, treatment-implications, open-questions, last-reviewed-at, and merge/split history. Evidence links are typed: supports, weakens, neutral, pending.

The tree is editable. Nodes split when evidence becomes more specific. Nodes merge when the distinction stops mattering. Nodes are retired when ruled out. The audit log preserves history.

The tree is not a diagnosis engine. It is the patient and her clinicians thinking together, in writing, over time. It exists because the case requires honest tracking of what is known, what is suspected, and what would change the answer. It is the app's most explicit refusal of fake certainty.

The visual model should not be a directed graph. A node list with status chips, evidence counts, and a "last reviewed" timestamp is more legible than any graph layout. Graphs are for systems; this is for thinking.

### XV. The Decision Journal — The Discipline of Revisiting Choices

A decision-journal entry is a question, not an answer. _Should we pursue scar exploration? Should we attempt sigma-1 PET/MRI? Should we retry EMG with a tolerance plan? Should we consider buprenorphine rotation?_ Each entry has options, evidence for and against, risks, what-would-change-the-decision, an owner, a target date, and a final decision with rationale.

Decisions are reopened. Status moves from open → waiting → decided → revisiting as new data arrives. The journal preserves the reasoning even when the decision changes.

The decision journal resists the gravitational pull of _we already decided that_. It assumes that decisions in chronic care are revisited and that the rationale for past decisions matters as much as the decisions themselves.

### XVI. The Procedure Impact View — Keeping Faith with the Question

Every procedure asks a question. The 2025-12-23 hydrodissection asked whether a branch-to-vastus-lateralis target would respond to anesthetic and steroid. The 2025-04-09 TFESI asked whether L5–S1 radicular contribution drove the pain. Each was a hypothesis test.

The procedure impact view holds that question alongside the impact: baseline before, immediate effect, 24h, 72h, 1 week, 1 month. New symptoms triggered. Whether it answered the diagnostic question. Whether to repeat.

The view exists because the case has a clear pattern of nondiagnostic procedures, several of which flared symptoms. Without an explicit place to record what each procedure was supposed to answer, that pattern hides. With it, the next procedural conversation begins with the right question — _what is this supposed to tell us, and what is the falsifying outcome?_

### XVII. The Visit Packet — Crossing the Gap

The clinician has fifteen minutes; the patient has had three months since the last visit. The visit packet is the bridge.

A visit packet is generated from a date range, a diagnostic branch, a body region, or "since the last appointment." Its contents are fixed: the current working diagnosis paragraph in its calibrated language, the active decisions, the upcoming appointments and tests, the current medications, the flare frequency and recovery time, the procedure impact summaries, selected photo comparisons with their measured deltas, key timeline items, the open clinician questions for this visit, and the open tests/tasks. Markdown first, PDF later.

The packet is short on purpose. The point is not to dump everything; the point is to hand the clinician what could not be communicated in a portal message. Every section has a reason for being included. The patient brings the packet; the clinician reads it in two minutes and asks the right questions for the remaining thirteen.

### XVII-A. The Emergency Packet — Safety First, Not Visit Prep

The emergency packet is separate from the visit packet. It is not built around a date range or a diagnostic question; it is a one-page, always-current ED-oriented summary for a clinician who has never met Bella and needs the safest context quickly.

Its sections are fixed: calibrated case summary, current medications, allergies and intolerances, avoid/contraindication items, care team contacts and roles, and the last-reviewed timestamp. It exports as Markdown first, with PDF later. It should be readable from a phone and printable without becoming a chart dump.

The safety list is the source of truth for practical do-nots: no BP cuff on the left arm, avoid IV in the left hand if possible, scar probing has flared symptoms, procedure precautions, medication intolerances, and care-context warnings. These are recorded with severity, reaction/description, source, active/inactive status, and last-reviewed date. The app does not decide what is dangerous; the family and clinicians maintain the list, and the app surfaces it faithfully in emergency and pre-procedure contexts.

### XVIII. Settings — The Family as Steward

The family administers the account. The primary user can do everything. The caregiver can do almost everything. The viewer is read-only. A future clinician role is read-only with narrower scope.

Settings exposes role status, MFA toggle, session-timeout configuration, audit-log access, bulk export, and account export. It does not expose third-party integrations because there are none. It does not expose analytics because the app does not collect any.

The settings page is short on purpose. The fewer surface controls there are, the fewer ways the family can be asked to grant access they should not grant.

---

## Part IV — Visual And Interaction Direction

### XIX. Quiet, Clinical, Dense

The visual thesis is quiet, clinical, dense, and trustworthy. A neutral surface; a single restrained accent color; strong type hierarchy for date, status label, body region, severity, and next action; no decorative cards; no marketing-style hero on any view; no emoji in the UI itself.

The default information density is high. This is an operational tool used by people who have read more medical records than the average user reads in a lifetime. They do not need empty space; they need legibility under load.

### XX. Mobile Is Not the Lite Version

Mobile is where flares are captured. Therefore mobile is the canonical capture surface, not the trimmed-down version. The desktop is where the family reviews, exports, and prepares for visits. Both surfaces deserve full design care.

Bottom navigation on mobile, left navigation on desktop. The flare-mode start button is reachable in one tap on both. Photo capture is camera-first on mobile, drag-drop on desktop. Forms collapse cleanly to vertical stacks on mobile and reflow into two columns on desktop without changing field order.

### XXI. Empty States, Loading, And Error

Every major view has an empty state that says what to do next. Loading states use skeletons that match the final layout, not spinners; the user should never wonder whether a list is empty or still arriving. Errors say what failed and what action to take, in plain language; they never expose stack traces or technical identifiers. A failed upload says _the photo did not save — try again_ and offers retry; it does not say _400 Bad Request_.

### XXII. Destructive Actions

Deletion is soft by default; the audit log records the deletion. The UI confirms with the noun and a reason field. _Delete this flare entry? (optional reason)_. The reason is preserved in the audit log. Hard delete exists only as a privileged action initiated from Settings → Account → Erase Data, after a typed confirmation. Medical records do not vanish silently.

### XXIII. Time and Timezone

All times are stored UTC and displayed in the user's local timezone. Times are shown in absolute form near the entry (_May 8, 2026, 2:14 AM_) and relative form when scanning a list (_4 hours ago_). Both are present in dense list views. Daylight-savings transitions do not silently shift entries.

---

## Part V — What the App Cannot Do

### XXIV. The Limits

The app does not heal. It does not diagnose. It does not treat. It does not replace a clinician. It does not tell the family when to go to the emergency room or when to refuse a procedure. It does not predict trajectories. It does not adjust medications. Its privacy guarantees are technical — auth, RLS, signed URLs, encryption at rest, audit, soft delete, bulk export — and they are real, but they are not metaphysical.

The app is a tool. The work of getting better remains the work of the patient, her family, and her clinicians. The app's only contribution is that the work has a place to live.

### XXV. What It Might Clear

What the app might do is clear ground. If a flare is captured, it can be remembered. If a temperature asymmetry is measured, it can be shown. If a diagnostic node is held with evidence on both sides, it can be revisited honestly. If a decision is recorded with its rationale, it can be reopened without confusion. If a visit packet contains the questions the patient would otherwise forget, the visit becomes shorter and better.

The clinician then has more space to do the clinician's work; the patient has less of the historian's burden; the family has fewer arguments about what was tried and what worked. The app does not heal, but it removes obstacles that have made healing harder. That is its only and entire purpose.

---

## Part VI — Definition Of Done For UX

The UX is right when:

1. A flare can be started, captured at 30m, and ended in under one minute on a phone, by a user in pain.
2. A bilateral photo-comparison entry with measured temperature delta can be created in under ninety seconds.
3. A pain-book entry takes under fifteen seconds from open to save.
4. A new clinician opening the visit packet can read the full case in two minutes.
5. A diagnostic node shows status, confidence, evidence on both sides, and "what would change this" without scrolling.
6. The bulk export returns a zip the family can open without help.
7. No screen states a diagnosis as confirmed unless the linked criteria are present.
8. Nothing in the medical-text path beacons to a third-party domain.

The app is finished — for now — when those eight statements are true and the family has logged a real flare with photos and exported a real visit packet from real data. After that, the work is iteration on what the patient and clinicians actually do with it.
