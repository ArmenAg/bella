-- Idempotent local diagnostic tree seed/import scaffold.
-- This intentionally seeds only planning-level branch names, summaries, and
-- open questions already present in DESIGN.md/TICKETS.md. It does not import
-- sensitive record details.

do $$
declare
  demo_family_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:family');
  primary_user_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:user:primary');
  root_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:mixed-mechanism');
begin
  if not exists (select 1 from public.profiles where id = primary_user_id) then
    raise notice 'Skipping diagnostic tree seed because demo profile is missing. Run 002_demo.sql first.';
    return;
  end if;

  insert into public.diagnoses (
    id,
    family_id,
    user_id,
    parent_diagnosis_id,
    title,
    status,
    confidence,
    summary,
    why_considered,
    evidence_for,
    evidence_against,
    tests_needed,
    treatment_implications,
    open_questions,
    last_reviewed_at
  )
  values
    (
      root_id,
      demo_family_id,
      primary_user_id,
      null,
      'Mixed-mechanism post-traumatic left lateral-thigh pain',
      'supported',
      'moderate',
      'Planning-level root branch for organizing focal, vasomotor, neuropathic, and movement-overlay hypotheses.',
      'Seeded from the project planning documents as an editable reasoning scaffold.',
      'Existing app fixture links demonstrate how flare, procedure, source, and measurement evidence can attach to branches.',
      'The scaffold does not by itself establish a diagnosis or treatment recommendation.',
      'Clarify which mechanism best explains time-locked flares, functional impact, and procedure responses.',
      'Use this root to keep visit-packet language calibrated and avoid premature certainty.',
      array[
        'Which branch best explains the captured flare pattern?',
        'Which finding would move a branch from suspected to supported?',
        'Which branch should be retired if evidence remains absent?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:focal-scar'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Focal scar / terminal branch / vastus-lateralis generator',
      'suspected',
      'moderate',
      'Tracks the possibility of a focal post-traumatic generator around the scar or terminal branch territory.',
      'Included because the app needs a branch for localized scar-region evidence and procedure-impact review.',
      'Procedure/event and source links can support or weaken this branch over time.',
      'No seeded fixture detail should be treated as clinical proof.',
      'Identify what localization evidence would be decisive enough to change planning.',
      'May guide focused questions for procedures, imaging, or conservative care.',
      array[
        'What test would localize or falsify a focal generator?',
        'Does flare capture show local onset before spread?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold'),
      demo_family_id,
      primary_user_id,
      root_id,
      'CRPS / chronic cold-phase phenotype',
      'suspected',
      'low',
      'Tracks vasomotor, temperature, color, pain, and functional signs without asserting diagnostic certainty.',
      'Included because episodic signs may be absent during interictal clinic exams and need timestamped capture.',
      'Flare checkpoints and vasomotor measurements can support this branch when clinician-reviewed.',
      'A label without linked criteria should not confirm this branch.',
      'Capture objective signs and clinician-observable criteria when possible.',
      'Supports careful visit-packet framing and avoids overclaiming.',
      array[
        'Do objective signs appear during active flares?',
        'Which Budapest criteria are actually linked and clinician-reviewed?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-type'),
      demo_family_id,
      primary_user_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold'),
      'CRPS Type I vs Type II subtype question',
      'unreviewed',
      'unknown',
      'Tracks whether subtype language matters after objective signs and nerve-injury localization are reviewed.',
      'Included as an explicit uncertainty branch so the app does not collapse subtype questions too early.',
      'Subtype evidence should be linked only after clinician or testing review.',
      'The seed does not assume nerve injury status.',
      'Clarify whether subtype changes management or communication.',
      'May later merge into the CRPS branch if the distinction stops helping.',
      array[
        'Does subtype change treatment, referrals, or documentation?',
        'What evidence would justify Type II language?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:motor-injury'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Branch-to-vastus-lateralis motor injury',
      'unreviewed',
      'unknown',
      'Tracks possible motor-branch involvement separately from pain-generator hypotheses.',
      'Included so motor findings and procedure questions can be documented without being lost in pain notes.',
      null,
      'No objective motor finding is imported by this scaffold.',
      'Clarify whether there is reproducible objective motor involvement.',
      'Could influence PT, procedure, and referral questions.',
      array[
        'Is there objective motor involvement?',
        'Are episodes pain-limited, motor, or both?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:l5-peroneal'),
      demo_family_id,
      primary_user_id,
      root_id,
      'L5 / peroneal / plexus localization for foot and big toe symptoms',
      'monitoring',
      'low',
      'Keeps distal foot/toe symptoms available for localization review without blending them into the scar branch.',
      'Included because body-region-specific entries may later show whether distal symptoms track with flares.',
      null,
      'The scaffold does not claim a radicular, peroneal, or plexus diagnosis.',
      'Track timing, distribution, and procedure/test relationships.',
      'May guide focused localization questions.',
      array[
        'Do foot symptoms occur independently or only during broader flares?',
        'What localization evidence would distinguish these possibilities?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:central-sensitization'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Central sensitization / nociplastic pain',
      'monitoring',
      'low',
      'Tracks widespread or disproportionate symptom patterns as a monitored branch rather than a catch-all answer.',
      'Included so diffuse patterns can be noted while preserving local and vasomotor branches.',
      null,
      'This scaffold should not be used to dismiss objective localized findings.',
      'Look for patterns across body regions, triggers, and response windows.',
      'Can help frame uncertainty without replacing clinician judgment.',
      array[
        'What would strengthen or weaken this branch?',
        'Are there objective signs that point elsewhere?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:fmd-overlay'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Functional movement disorder or CRPS motor overlay',
      'unreviewed',
      'unknown',
      'Keeps movement episodes and possible motor overlay visible without deciding their cause.',
      'Included because the app needs neutral language for movement findings and clinician observation.',
      null,
      'No seeded row establishes functional movement disorder.',
      'Capture clinician-observed signs and time relationship to pain/vasomotor changes.',
      'May inform movement-specific questions and referrals.',
      array[
        'Which signs are observed by a clinician?',
        'Do movement episodes track with pain, temperature, or stressors?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:autoimmune-sfn'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Autoimmune small-fiber neuropathy',
      'unreviewed',
      'unknown',
      'Tracks whether a systemic small-fiber process should remain in the differential.',
      'Included as a planning branch for future source/test links.',
      null,
      'The scaffold imports no antibody or biopsy result.',
      'Document whether testing or referral is clinically appropriate.',
      'May inform source-library and visit-packet questions.',
      array[
        'Is testing appropriate?',
        'Which symptoms would make this branch more relevant?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:sjogren-sfn'),
      demo_family_id,
      primary_user_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:autoimmune-sfn'),
      'Sjogren-related SFN / ganglionitis',
      'unreviewed',
      'unknown',
      'Child branch for a more specific autoimmune-SFN framing if evidence later supports it.',
      'Included as an editable placeholder because the planning docs list it separately.',
      null,
      'No Sjogren diagnosis or test result is imported by this scaffold.',
      'Link only clinician-reviewed autoimmune evidence.',
      'May later merge into autoimmune SFN if the distinction stops helping.',
      array[
        'What evidence would make this branch relevant?',
        'Does it change management compared with the parent branch?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:mcas'),
      demo_family_id,
      primary_user_id,
      root_id,
      'MCAS',
      'unreviewed',
      'unknown',
      'Tracks possible multisystem trigger patterns without asserting a mast-cell diagnosis.',
      'Included so systemic episodes, if entered, can be linked deliberately.',
      null,
      'The scaffold imports no mediator testing or diagnosis.',
      'Track whether episodes are multisystem and reproducible.',
      'May inform symptom diary structure and clinician questions.',
      array[
        'Are episodes multisystem?',
        'Which objective findings would support this branch?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:channelopathy'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Sodium channelopathy',
      'unreviewed',
      'unknown',
      'Tracks a rare-channelopathy branch as a low-certainty, source-driven hypothesis.',
      'Included because the planning docs list it as an open branch, not as a conclusion.',
      null,
      'No genetic or family-history evidence is imported.',
      'Review whether genetics discussion is clinically warranted.',
      'May inform future source/test tasks.',
      array[
        'Is a genetics discussion warranted?',
        'What feature would make this branch more plausible?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:autonomic-ganglionopathy'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Autoimmune autonomic ganglionopathy',
      'unreviewed',
      'unknown',
      'Tracks generalized autonomic concerns separately from local vasomotor flare evidence.',
      'Included as a planning branch for future autonomic source/test links.',
      null,
      'The scaffold imports no autonomic testing or antibody result.',
      'Review whether autonomic symptoms are persistent, objective, and clinically relevant.',
      'May inform referral questions if evidence accumulates.',
      array[
        'Are autonomic symptoms persistent?',
        'Which objective data would support this branch?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:vascular-lesion'),
      demo_family_id,
      primary_user_id,
      root_id,
      'Occult vascular / lymphatic scar lesion',
      'suspected',
      'low',
      'Tracks the possibility of a local vascular or lymphatic lesion around the scar region.',
      'Included because color, swelling, temperature, imaging, and procedure-impact evidence may become relevant.',
      null,
      'No imaging finding is imported by this scaffold.',
      'Clarify what imaging or exam finding would be decisive.',
      'May inform imaging questions and flare photo capture.',
      array[
        'What imaging would be decisive?',
        'Do color or swelling changes localize to the scar territory?'
      ],
      '2026-05-08 12:00:00+00'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:tbi-track'),
      demo_family_id,
      primary_user_id,
      null,
      'Post-TBI cognitive / visual / gait track',
      'monitoring',
      'low',
      'Separate monitoring track for cognitive, visual, and gait items so they do not get conflated with pain-generator branches.',
      'Included because the planning docs keep this as a distinct organizational track.',
      null,
      'The scaffold does not import or assert TBI details.',
      'Keep timeline items organized by track and source.',
      'Supports visit-packet organization and clinician questions.',
      array[
        'Which episodes belong on this track?',
        'Which source records should be linked here?'
      ],
      '2026-05-08 12:00:00+00'
    )
  on conflict (id) do update
  set
    parent_diagnosis_id = excluded.parent_diagnosis_id,
    title = excluded.title,
    status = excluded.status,
    confidence = excluded.confidence,
    summary = excluded.summary,
    why_considered = excluded.why_considered,
    evidence_for = excluded.evidence_for,
    evidence_against = excluded.evidence_against,
    tests_needed = excluded.tests_needed,
    treatment_implications = excluded.treatment_implications,
    open_questions = excluded.open_questions,
    last_reviewed_at = excluded.last_reviewed_at,
    deleted_at = null,
    updated_at = now();
end;
$$;
