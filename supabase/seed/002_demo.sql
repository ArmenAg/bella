-- Fake local/demo fixture seed. Idempotent and intentionally not production data.
-- Demo login hint for local Supabase: bella.demo@example.test / local-demo-password

do $$
declare
  demo_family_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:family');
  primary_user_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:user:primary');
  caregiver_user_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:user:caregiver');
  primary_identity_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:identity:primary');
  caregiver_identity_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:identity:caregiver');
  primary_role_id uuid;
  caregiver_role_id uuid;
  baseline_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:baseline');
  active_flare_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:active-flare');
  ended_flare_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:ended-flare');
  recovery_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:recovery');
  procedure_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:procedure');
  medication_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:medication');
  log_entry_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:entry:freeform');
  left_photo_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment:left-photo');
  right_photo_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment:right-photo');
  source_note_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:source:visit-note');
  source_literature_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:source:literature');
  procedure_event_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:event:procedure-impact');
  vasomotor_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:vasomotor:knee-pair');
  appointment_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:appointment:upcoming');
  task_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:task:upload');
  decision_open_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:decision:open');
  decision_waiting_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:decision:waiting');
  decision_done_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:decision:done');
  medication_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:medication:demo-a');
  medication_response_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:medication-response:demo-a');
begin
  select id into primary_role_id from public.roles where slug = 'primary';
  select id into caregiver_role_id from public.roles where slug = 'caregiver';

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      primary_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bella.demo@example.test',
      crypt('local-demo-password', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Bella Demo', 'role', 'primary', 'family_id', demo_family_id::text),
      now(),
      now()
    ),
    (
      caregiver_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'caregiver.demo@example.test',
      crypt('local-demo-password', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Caregiver Demo', 'role', 'caregiver', 'family_id', demo_family_id::text),
      now(),
      now()
    )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change_token_new = excluded.email_change_token_new,
    email_change = excluded.email_change,
    email_change_token_current = excluded.email_change_token_current,
    reauthentication_token = excluded.reauthentication_token,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  if to_regclass('auth.identities') is not null then
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values
      (
        primary_identity_id,
        primary_user_id::text,
        primary_user_id,
        jsonb_build_object(
          'sub',
          primary_user_id::text,
          'email',
          'bella.demo@example.test',
          'email_verified',
          true
        ),
        'email',
        now(),
        now(),
        now()
      ),
      (
        caregiver_identity_id,
        caregiver_user_id::text,
        caregiver_user_id,
        jsonb_build_object(
          'sub',
          caregiver_user_id::text,
          'email',
          'caregiver.demo@example.test',
          'email_verified',
          true
        ),
        'email',
        now(),
        now(),
        now()
      )
    on conflict (provider_id, provider) do update
    set
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = now();
  end if;

  insert into public.profiles (
    id,
    family_id,
    email,
    display_name,
    role_id,
    mfa_enabled,
    privacy_ack_at
  )
  values
    (
      primary_user_id,
      demo_family_id,
      'bella.demo@example.test',
      'Bella Demo',
      primary_role_id,
      true,
      now()
    ),
    (
      caregiver_user_id,
      demo_family_id,
      'caregiver.demo@example.test',
      'Caregiver Demo',
      caregiver_role_id,
      false,
      now()
    )
  on conflict (id) do update
  set
    family_id = excluded.family_id,
    email = excluded.email,
    display_name = excluded.display_name,
    role_id = excluded.role_id,
    mfa_enabled = excluded.mfa_enabled,
    privacy_ack_at = excluded.privacy_ack_at,
    updated_at = now(),
    deleted_at = null;

  insert into public.attachments (
    id,
    family_id,
    user_id,
    file_path,
    file_name,
    mime_type,
    size_bytes,
    captured_at,
    capture_timezone,
    description,
    gps_stripped,
    metadata
  )
  values
    (
      left_photo_id,
      demo_family_id,
      primary_user_id,
      demo_family_id::text || '/demo/left-knee-placeholder.jpg',
      'left-knee-placeholder.jpg',
      'image/jpeg',
      143212,
      '2026-05-01 18:05:00+00',
      'America/Los_Angeles',
      'Fake left-side comparison placeholder.',
      true,
      '{"fixture":true,"side":"left"}'::jsonb
    ),
    (
      right_photo_id,
      demo_family_id,
      primary_user_id,
      demo_family_id::text || '/demo/right-knee-placeholder.jpg',
      'right-knee-placeholder.jpg',
      'image/jpeg',
      141904,
      '2026-05-01 18:05:00+00',
      'America/Los_Angeles',
      'Fake right-side comparison placeholder.',
      true,
      '{"fixture":true,"side":"right"}'::jsonb
    )
  on conflict (id) do update
  set
    file_path = excluded.file_path,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    captured_at = excluded.captured_at,
    capture_timezone = excluded.capture_timezone,
    description = excluded.description,
    gps_stripped = excluded.gps_stripped,
    metadata = excluded.metadata,
    updated_at = now(),
    deleted_at = null;

  insert into public.sources (
    id,
    family_id,
    user_id,
    title,
    source_type,
    source_date,
    provider,
    citation,
    summary,
    tags
  )
  values
    (
      source_note_id,
      demo_family_id,
      primary_user_id,
      'Demo visit note',
      'visit_note',
      '2026-05-02',
      'Demo Pain Clinic',
      'Demo local fixture, not a real medical record.',
      'Fake visit note used to populate linked evidence and source-library states.',
      array['demo', 'visit']
    ),
    (
      source_literature_id,
      demo_family_id,
      primary_user_id,
      'Demo literature source',
      'literature',
      '2026-05-03',
      'Demo Library',
      'Demo citation for UI fixture only.',
      'Fake literature summary for diagnostic-evidence UI states.',
      array['demo', 'literature']
    )
  on conflict (id) do update
  set
    title = excluded.title,
    source_type = excluded.source_type,
    source_date = excluded.source_date,
    provider = excluded.provider,
    citation = excluded.citation,
    summary = excluded.summary,
    tags = excluded.tags,
    updated_at = now(),
    deleted_at = null;

  insert into public.entries (
    id,
    family_id,
    user_id,
    created_by,
    type,
    occurred_at,
    ended_at,
    title,
    pain_current,
    pain_peak,
    pain_average,
    primary_trigger_id,
    notes,
    function_impact,
    interventions_tried,
    response,
    is_flare,
    flare_status,
    recovery_minutes,
    client_recorded_at
  )
  values
    (
      baseline_entry_id,
      demo_family_id,
      primary_user_id,
      primary_user_id,
      'baseline',
      '2026-05-01 15:00:00+00',
      null,
      'Demo baseline check-in',
      3,
      4,
      3,
      null,
      'Fake baseline entry for normal Pain Book state.',
      array['walking'],
      array['rest'],
      'stable',
      false,
      null,
      null,
      '2026-05-01 15:00:00+00'
    ),
    (
      active_flare_entry_id,
      demo_family_id,
      primary_user_id,
      caregiver_user_id,
      'flare',
      '2026-05-09 23:30:00+00',
      null,
      'Demo active pressure-triggered flare',
      7,
      8,
      7,
      (select id from public.triggers where slug = 'blanket'),
      'Fake active flare with checkpoints and photo placeholders.',
      array['sleep', 'walking'],
      array['heat pack', 'demo rescue medication'],
      'partial',
      true,
      'active',
      null,
      '2026-05-09 23:30:00+00'
    ),
    (
      ended_flare_entry_id,
      demo_family_id,
      primary_user_id,
      primary_user_id,
      'flare',
      '2026-05-04 02:00:00+00',
      '2026-05-04 07:15:00+00',
      'Demo ended flare',
      2,
      9,
      6,
      (select id from public.triggers where slug = 'stairs'),
      'Fake ended flare for recovery-duration UI states.',
      array['stairs', 'leaving house'],
      array['rest', 'hydration'],
      'slow recovery',
      true,
      'ended',
      315,
      '2026-05-04 02:00:00+00'
    ),
    (
      recovery_entry_id,
      demo_family_id,
      primary_user_id,
      primary_user_id,
      'recovery',
      '2026-05-04 17:00:00+00',
      null,
      'Demo recovery follow-up',
      4,
      5,
      4,
      null,
      'Fake recovery entry after ended flare.',
      array['walking'],
      array['quiet afternoon'],
      'improving',
      false,
      null,
      null,
      '2026-05-04 17:00:00+00'
    ),
    (
      procedure_entry_id,
      demo_family_id,
      primary_user_id,
      caregiver_user_id,
      'procedure_related',
      '2026-05-06 19:00:00+00',
      null,
      'Demo procedure-related entry',
      6,
      7,
      6,
      (select id from public.triggers where slug = 'procedure'),
      'Fake procedure impact entry that can appear in timeline and export packet states.',
      array['walking', 'concentration'],
      array['ice', 'rest'],
      'unclear',
      false,
      null,
      null,
      '2026-05-06 19:00:00+00'
    ),
    (
      medication_entry_id,
      demo_family_id,
      primary_user_id,
      primary_user_id,
      'medication_related',
      '2026-05-07 03:00:00+00',
      null,
      'Demo medication response entry',
      5,
      6,
      5,
      (select id from public.triggers where slug = 'medication_change'),
      'Fake medication response entry.',
      array['sleep'],
      array['demo medication A'],
      'helped sleep, unclear pain response',
      false,
      null,
      null,
      '2026-05-07 03:00:00+00'
    ),
    (
      log_entry_id,
      demo_family_id,
      primary_user_id,
      caregiver_user_id,
      'freeform',
      '2026-05-08 21:30:00+00',
      null,
      'Demo freeform log entry',
      null,
      null,
      null,
      (select id from public.triggers where slug = 'bp_cuff'),
      'Fake log-book item for a brief arm episode.',
      array['bathing'],
      array[]::text[],
      null,
      false,
      null,
      null,
      '2026-05-08 21:30:00+00'
    )
  on conflict (id) do update
  set
    type = excluded.type,
    occurred_at = excluded.occurred_at,
    ended_at = excluded.ended_at,
    title = excluded.title,
    pain_current = excluded.pain_current,
    pain_peak = excluded.pain_peak,
    pain_average = excluded.pain_average,
    primary_trigger_id = excluded.primary_trigger_id,
    notes = excluded.notes,
    function_impact = excluded.function_impact,
    interventions_tried = excluded.interventions_tried,
    response = excluded.response,
    is_flare = excluded.is_flare,
    flare_status = excluded.flare_status,
    recovery_minutes = excluded.recovery_minutes,
    client_recorded_at = excluded.client_recorded_at,
    updated_at = now(),
    deleted_at = null;

  insert into public.entry_regions (family_id, entry_id, body_region_id)
  values
    (demo_family_id, baseline_entry_id, (select id from public.body_regions where slug = 'left_lateral_thigh_scar')),
    (demo_family_id, active_flare_entry_id, (select id from public.body_regions where slug = 'left_knee')),
    (demo_family_id, active_flare_entry_id, (select id from public.body_regions where slug = 'left_dorsal_foot')),
    (demo_family_id, ended_flare_entry_id, (select id from public.body_regions where slug = 'left_lateral_thigh')),
    (demo_family_id, recovery_entry_id, (select id from public.body_regions where slug = 'left_lateral_thigh')),
    (demo_family_id, procedure_entry_id, (select id from public.body_regions where slug = 'left_lateral_thigh_scar')),
    (demo_family_id, medication_entry_id, (select id from public.body_regions where slug = 'whole_body')),
    (demo_family_id, log_entry_id, (select id from public.body_regions where slug = 'right_arm'))
  on conflict (entry_id, body_region_id) do update
  set deleted_at = null, updated_at = now();

  insert into public.entry_symptoms (family_id, entry_id, symptom_id, severity, notes)
  values
    (demo_family_id, active_flare_entry_id, (select id from public.symptoms where slug = 'burning_pain'), 8, 'Fake symptom severity.'),
    (demo_family_id, active_flare_entry_id, (select id from public.symptoms where slug = 'temperature_asymmetry'), 6, 'Fake comparison state.'),
    (demo_family_id, ended_flare_entry_id, (select id from public.symptoms where slug = 'gait_change'), 7, 'Fake functional impact.'),
    (demo_family_id, procedure_entry_id, (select id from public.symptoms where slug = 'pressure_sensitivity'), 7, 'Fake procedure-related sensitivity.'),
    (demo_family_id, log_entry_id, (select id from public.symptoms where slug = 'freezing_or_buckling'), 5, 'Fake freeform symptom.')
  on conflict (entry_id, symptom_id) do update
  set severity = excluded.severity, notes = excluded.notes, deleted_at = null, updated_at = now();

  insert into public.entry_triggers (family_id, entry_id, trigger_id, notes)
  values
    (demo_family_id, active_flare_entry_id, (select id from public.triggers where slug = 'blanket'), 'Fake suspected trigger.'),
    (demo_family_id, ended_flare_entry_id, (select id from public.triggers where slug = 'stairs'), 'Fake suspected trigger.'),
    (demo_family_id, procedure_entry_id, (select id from public.triggers where slug = 'procedure'), 'Fake procedure trigger.'),
    (demo_family_id, log_entry_id, (select id from public.triggers where slug = 'bp_cuff'), 'Fake arm episode trigger.')
  on conflict (entry_id, trigger_id) do update
  set notes = excluded.notes, deleted_at = null, updated_at = now();

  insert into public.flare_checkpoints (
    id,
    family_id,
    user_id,
    entry_id,
    checkpoint_type,
    checkpoint_at,
    pain_score,
    symptoms,
    notes
  )
  values
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:active:start'), demo_family_id, primary_user_id, active_flare_entry_id, 'start', '2026-05-09 23:30:00+00', 7, '[{"slug":"burning_pain","severity":7}]'::jsonb, 'Fake start checkpoint.'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:active:30m'), demo_family_id, primary_user_id, active_flare_entry_id, '30m', '2026-05-10 00:00:00+00', 8, '[{"slug":"temperature_asymmetry","severity":6}]'::jsonb, 'Fake 30 minute checkpoint.'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:active:60m'), demo_family_id, primary_user_id, active_flare_entry_id, '60m', '2026-05-10 00:30:00+00', 7, '[]'::jsonb, 'Fake 60 minute checkpoint.'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:ended:start'), demo_family_id, primary_user_id, ended_flare_entry_id, 'start', '2026-05-04 02:00:00+00', 6, '[]'::jsonb, 'Fake ended flare start.'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:ended:120m'), demo_family_id, primary_user_id, ended_flare_entry_id, '120m', '2026-05-04 04:00:00+00', 9, '[]'::jsonb, 'Fake ended flare peak.'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:checkpoint:ended:custom'), demo_family_id, primary_user_id, ended_flare_entry_id, 'custom', '2026-05-04 07:15:00+00', 2, '[]'::jsonb, 'Fake ended flare recovery.')
  on conflict (id) do update
  set
    checkpoint_at = excluded.checkpoint_at,
    pain_score = excluded.pain_score,
    symptoms = excluded.symptoms,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = now();

  insert into public.vasomotor_measurements (
    id,
    family_id,
    user_id,
    entry_id,
    measured_at,
    site,
    left_temp_c,
    right_temp_c,
    left_color,
    right_color,
    lighting_notes,
    context,
    notes,
    left_attachment_id,
    right_attachment_id
  )
  values (
    vasomotor_id,
    demo_family_id,
    primary_user_id,
    active_flare_entry_id,
    '2026-05-10 00:05:00+00',
    'knees',
    30.4,
    33.1,
    'pale',
    'pink',
    'Same room, overhead light, fake fixture.',
    'active_flare',
    'Fake L/R temperature and color comparison.',
    left_photo_id,
    right_photo_id
  )
  on conflict (id) do update
  set
    measured_at = excluded.measured_at,
    site = excluded.site,
    left_temp_c = excluded.left_temp_c,
    right_temp_c = excluded.right_temp_c,
    left_color = excluded.left_color,
    right_color = excluded.right_color,
    lighting_notes = excluded.lighting_notes,
    context = excluded.context,
    notes = excluded.notes,
    left_attachment_id = excluded.left_attachment_id,
    right_attachment_id = excluded.right_attachment_id,
    deleted_at = null,
    updated_at = now();

  insert into public.events (
    id,
    family_id,
    user_id,
    type,
    occurred_at,
    title,
    summary,
    provider,
    location,
    source_id,
    diagnostic_question,
    baseline_before,
    immediate_effect,
    effect_24h,
    effect_72h,
    effect_1w,
    effect_1m,
    new_symptoms,
    answered_question,
    repeat_recommendation
  )
  values (
    procedure_event_id,
    demo_family_id,
    primary_user_id,
    'procedure_test',
    '2026-05-06 17:00:00+00',
    'Demo procedure impact event',
    'Fake procedure/test event for impact tracking UI.',
    'Demo Procedure Clinic',
    'Demo outpatient suite',
    source_note_id,
    'Did the fake procedure change the target pain pattern?',
    'Fake baseline pain 4/10 before procedure.',
    'Fake immediate flare to 7/10.',
    'Fake partial improvement at 24h.',
    'Fake unclear effect at 72h.',
    'Fake return to baseline at one week.',
    'Fake no durable change at one month.',
    'No real symptoms. Demo data only.',
    'partially',
    'Discuss repeat only if clinician agrees.'
  )
  on conflict (id) do update
  set
    occurred_at = excluded.occurred_at,
    title = excluded.title,
    summary = excluded.summary,
    provider = excluded.provider,
    location = excluded.location,
    source_id = excluded.source_id,
    diagnostic_question = excluded.diagnostic_question,
    baseline_before = excluded.baseline_before,
    immediate_effect = excluded.immediate_effect,
    effect_24h = excluded.effect_24h,
    effect_72h = excluded.effect_72h,
    effect_1w = excluded.effect_1w,
    effect_1m = excluded.effect_1m,
    new_symptoms = excluded.new_symptoms,
    answered_question = excluded.answered_question,
    repeat_recommendation = excluded.repeat_recommendation,
    deleted_at = null,
    updated_at = now();

  insert into public.diagnoses (
    id,
    family_id,
    user_id,
    title,
    status,
    confidence,
    summary,
    why_considered,
    tests_needed,
    treatment_implications,
    open_questions,
    last_reviewed_at
  )
  values
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:mixed-mechanism'), demo_family_id, primary_user_id, 'Mixed-mechanism post-traumatic left lateral-thigh pain', 'supported', 'moderate', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Clarify generator overlap.', 'Track response by intervention.', array['Which mechanism best explains flares?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:focal-scar'), demo_family_id, primary_user_id, 'Focal scar / terminal branch / vastus-lateralis generator', 'suspected', 'moderate', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Consider localization evidence.', 'Guide focused procedure decisions.', array['What test would localize the generator?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold'), demo_family_id, primary_user_id, 'CRPS / chronic cold-phase phenotype', 'suspected', 'low', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Capture clinician-observable signs.', 'Use flare documentation in packets.', array['Do objective signs appear during flares?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-type'), demo_family_id, primary_user_id, 'CRPS Type I vs Type II subtype question', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Needs nerve injury localization review.', 'May collapse into parent branch later.', array['Does subtype change management?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:motor-injury'), demo_family_id, primary_user_id, 'Branch-to-vastus-lateralis motor injury', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Clarify motor findings.', 'Could affect PT/procedure planning.', array['Is there objective motor involvement?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:l5-peroneal'), demo_family_id, primary_user_id, 'L5 / peroneal / plexus localization for foot and big toe symptoms', 'monitoring', 'low', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Track foot and big toe events.', 'Guide localization questions.', array['Are foot symptoms linked to flares?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:central-sensitization'), demo_family_id, primary_user_id, 'Central sensitization / nociplastic pain', 'monitoring', 'low', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Look for pattern across body regions.', 'Avoid over-certainty.', array['What would strengthen or weaken this branch?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:fmd-overlay'), demo_family_id, primary_user_id, 'Functional movement disorder or CRPS motor overlay', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Needs clinician review.', 'Track movement episodes neutrally.', array['Which signs are observed by clinician?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:autoimmune-sfn'), demo_family_id, primary_user_id, 'Autoimmune small-fiber neuropathy', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Review objective testing path.', 'May inform referrals.', array['Is testing appropriate?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:sjogren-sfn'), demo_family_id, primary_user_id, 'Sjogren-related SFN / ganglionitis', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Review autoimmune evidence.', 'May inform specialty referral.', array['What evidence would make this relevant?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:mcas'), demo_family_id, primary_user_id, 'MCAS', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Track triggers and systemic symptoms.', 'May inform symptom diary.', array['Are episodes multisystem?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:channelopathy'), demo_family_id, primary_user_id, 'Sodium channelopathy', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Review family/history and clinician advice.', 'May inform test questions.', array['Is genetics discussion warranted?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:autonomic-ganglionopathy'), demo_family_id, primary_user_id, 'Autoimmune autonomic ganglionopathy', 'unreviewed', 'unknown', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Review autonomic signs.', 'May inform referral questions.', array['Are autonomic symptoms persistent?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:vascular-lesion'), demo_family_id, primary_user_id, 'Occult vascular / lymphatic scar lesion', 'suspected', 'low', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Review imaging/procedure evidence.', 'May inform imaging question.', array['What imaging would be decisive?'], '2026-05-08 12:00:00+00'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:tbi-track'), demo_family_id, primary_user_id, 'Post-TBI cognitive / visual / gait track', 'monitoring', 'low', 'Demo branch summary only.', 'Initial diagnostic branch from planning docs.', 'Keep timeline separate from pain generators.', 'Supports clinician packet organization.', array['Which episodes belong on this track?'], '2026-05-08 12:00:00+00')
  on conflict (id) do update
  set
    title = excluded.title,
    status = excluded.status,
    confidence = excluded.confidence,
    summary = excluded.summary,
    why_considered = excluded.why_considered,
    tests_needed = excluded.tests_needed,
    treatment_implications = excluded.treatment_implications,
    open_questions = excluded.open_questions,
    last_reviewed_at = excluded.last_reviewed_at,
    deleted_at = null,
    updated_at = now();

  insert into public.evidence_links (
    id,
    family_id,
    diagnosis_id,
    linked_type,
    linked_id,
    direction,
    note
  )
  values
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:evidence:flare-crps'),
      demo_family_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold'),
      'entry',
      active_flare_entry_id,
      'pending',
      'Fake flare evidence pending clinician interpretation.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:evidence:vasomotor-crps'),
      demo_family_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold'),
      'vasomotor_measurement',
      vasomotor_id,
      'supports',
      'Fake temperature delta for UI state only.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:evidence:procedure-scar'),
      demo_family_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:focal-scar'),
      'event',
      procedure_event_id,
      'neutral',
      'Fake procedure impact remained unclear.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:evidence:source-mixed'),
      demo_family_id,
      uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:mixed-mechanism'),
      'source',
      source_note_id,
      'supports',
      'Fake source link for source-library state.'
    )
  on conflict (id) do update
  set
    direction = excluded.direction,
    note = excluded.note,
    deleted_at = null,
    updated_at = now();

  insert into public.decisions (
    id,
    family_id,
    user_id,
    title,
    status,
    question,
    options,
    evidence_for,
    evidence_against,
    risks,
    what_would_change,
    owner,
    target_date,
    final_decision,
    rationale
  )
  values
    (
      decision_open_id,
      demo_family_id,
      primary_user_id,
      'Demo open diagnostic decision',
      'open',
      'Which fake diagnostic branch should be prioritized at the next visit?',
      '[{"label":"Prepare flare packet"},{"label":"Ask about localization testing"}]'::jsonb,
      'Fake linked flare data.',
      'No clinician interpretation in demo data.',
      'Overfitting fixture data.',
      'A clinician exam during an active flare.',
      'Family',
      '2026-05-20',
      null,
      null
    ),
    (
      decision_waiting_id,
      demo_family_id,
      primary_user_id,
      'Demo waiting-on-clinician decision',
      'waiting_on_clinician',
      'Should the fake procedure be repeated?',
      '[{"label":"Repeat"},{"label":"Do not repeat"}]'::jsonb,
      'Fake partial response.',
      'Fake flare after procedure.',
      'Procedure could worsen symptoms.',
      'Clear clinician recommendation.',
      'Caregiver',
      '2026-05-28',
      null,
      null
    ),
    (
      decision_done_id,
      demo_family_id,
      primary_user_id,
      'Demo decided item',
      'decided',
      'Should we bring photos to the next appointment?',
      '[{"label":"Bring selected comparisons"}]'::jsonb,
      'Photos make episodic changes easier to explain.',
      null,
      null,
      null,
      'Family',
      '2026-05-12',
      'Bring selected comparison photos.',
      'Fake rationale for decided-state UI.'
    )
  on conflict (id) do update
  set
    title = excluded.title,
    status = excluded.status,
    question = excluded.question,
    options = excluded.options,
    evidence_for = excluded.evidence_for,
    evidence_against = excluded.evidence_against,
    risks = excluded.risks,
    what_would_change = excluded.what_would_change,
    owner = excluded.owner,
    target_date = excluded.target_date,
    final_decision = excluded.final_decision,
    rationale = excluded.rationale,
    deleted_at = null,
    updated_at = now();

  insert into public.appointments (
    id,
    family_id,
    user_id,
    date_time,
    provider,
    specialty,
    location,
    purpose,
    prep_notes,
    questions,
    files_to_show,
    decisions_needed,
    status
  )
  values (
    appointment_id,
    demo_family_id,
    primary_user_id,
    '2026-05-21 17:00:00+00',
    'Demo Pain Specialist',
    'Pain medicine',
    'Demo clinic',
    'Review fake flare packet and procedure impact.',
    'Bring demo export packet, photos, and timeline highlights.',
    array['What would confirm or weaken the CRPS branch?', 'What should be tracked before the next visit?'],
    array['left-knee-placeholder.jpg', 'right-knee-placeholder.jpg'],
    array['Demo open diagnostic decision'],
    'scheduled'
  )
  on conflict (id) do update
  set
    date_time = excluded.date_time,
    provider = excluded.provider,
    specialty = excluded.specialty,
    location = excluded.location,
    purpose = excluded.purpose,
    prep_notes = excluded.prep_notes,
    questions = excluded.questions,
    files_to_show = excluded.files_to_show,
    decisions_needed = excluded.decisions_needed,
    status = excluded.status,
    deleted_at = null,
    updated_at = now();

  insert into public.tasks (
    id,
    family_id,
    user_id,
    title,
    status,
    priority,
    due_at,
    notes,
    appointment_id,
    decision_id,
    source_id
  )
  values (
    task_id,
    demo_family_id,
    caregiver_user_id,
    'Upload fake comparison photos to appointment packet',
    'open',
    'high',
    '2026-05-19 16:00:00+00',
    'Demo task linked to appointment, decision, and source.',
    appointment_id,
    decision_open_id,
    source_note_id
  )
  on conflict (id) do update
  set
    title = excluded.title,
    status = excluded.status,
    priority = excluded.priority,
    due_at = excluded.due_at,
    notes = excluded.notes,
    appointment_id = excluded.appointment_id,
    decision_id = excluded.decision_id,
    source_id = excluded.source_id,
    deleted_at = null,
    updated_at = now();

  insert into public.medications (
    id,
    family_id,
    user_id,
    name,
    dose,
    route,
    frequency,
    start_date,
    prescriber,
    reason,
    status,
    helped_pain,
    helped_sleep,
    helped_anxiety,
    helped_function,
    side_effects,
    notes
  )
  values (
    medication_id,
    demo_family_id,
    primary_user_id,
    'Demo medication A',
    'demo dose',
    'oral',
    'as directed in fixture',
    '2026-05-01',
    'Demo clinician',
    'Fixture for medication-response UI.',
    'active',
    null,
    true,
    null,
    null,
    'Fake mild drowsiness.',
    'Demo medication, not medical advice.'
  )
  on conflict (id) do update
  set
    name = excluded.name,
    dose = excluded.dose,
    route = excluded.route,
    frequency = excluded.frequency,
    start_date = excluded.start_date,
    prescriber = excluded.prescriber,
    reason = excluded.reason,
    status = excluded.status,
    helped_pain = excluded.helped_pain,
    helped_sleep = excluded.helped_sleep,
    helped_anxiety = excluded.helped_anxiety,
    helped_function = excluded.helped_function,
    side_effects = excluded.side_effects,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = now();

  insert into public.medication_responses (
    id,
    family_id,
    user_id,
    medication_id,
    entry_id,
    taken_at,
    reason,
    pain_before,
    pain_after_30m,
    pain_after_60m,
    pain_after_120m,
    sedation_effect,
    cognition_effect,
    gait_effect,
    side_effects,
    helped,
    notes
  )
  values (
    medication_response_id,
    demo_family_id,
    primary_user_id,
    medication_id,
    medication_entry_id,
    '2026-05-07 03:05:00+00',
    'Demo flare prevention attempt.',
    6,
    5,
    4,
    4,
    'sleepy',
    'slower',
    'unchanged',
    'Fake drowsiness.',
    'helped',
    'Fake response at 30/60/120 minutes.'
  )
  on conflict (id) do update
  set
    taken_at = excluded.taken_at,
    reason = excluded.reason,
    pain_before = excluded.pain_before,
    pain_after_30m = excluded.pain_after_30m,
    pain_after_60m = excluded.pain_after_60m,
    pain_after_120m = excluded.pain_after_120m,
    sedation_effect = excluded.sedation_effect,
    cognition_effect = excluded.cognition_effect,
    gait_effect = excluded.gait_effect,
    side_effects = excluded.side_effects,
    helped = excluded.helped,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = now();

  insert into public.attachment_links (
    id,
    family_id,
    attachment_id,
    linked_type,
    linked_id,
    label
  )
  values
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment-link:left-entry'), demo_family_id, left_photo_id, 'entry', active_flare_entry_id, 'left comparison'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment-link:right-entry'), demo_family_id, right_photo_id, 'entry', active_flare_entry_id, 'right comparison'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment-link:left-vasomotor'), demo_family_id, left_photo_id, 'vasomotor_measurement', vasomotor_id, 'left comparison'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment-link:right-vasomotor'), demo_family_id, right_photo_id, 'vasomotor_measurement', vasomotor_id, 'right comparison'),
    (uuid_generate_v5(uuid_ns_url(), 'bella-demo:attachment-link:source'), demo_family_id, left_photo_id, 'source', source_note_id, 'source placeholder')
  on conflict (attachment_id, linked_type, linked_id) do update
  set label = excluded.label, deleted_at = null, updated_at = now();
end;
$$;
