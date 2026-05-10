-- Idempotent historical import scaffold for workspace reports/records.
-- This seed represents source files and selected procedure/test events
-- conservatively. It imports paths, dates, titles, and generic summaries only;
-- it does not modify or parse the source medical records.

do $$
declare
  demo_family_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:family');
  primary_user_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:user:primary');
  focal_scar_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:focal-scar');
  crps_cold_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:crps-cold');
  l5_peroneal_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:l5-peroneal');
  tbi_track_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-demo:diagnosis:tbi-track');
  final_plan_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md');
  diagnosis_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:reports_md/MOST_LIKELY_DIAGNOSIS_2026-05-08.md');
  literature_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:reports_md/NEXT_STEPS_LITERATURE_2026-05-08.md');
  deeper_research_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:reports_md/NEXT_STEPS_DEEPER_RESEARCH_2026-05-08.md');
  addendum_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:reports_md/record_synthesis/NEW_DATA_ADDENDUM_2026-05-08.md');
  records_generated_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:records_md/generated');
  anesthesia_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:records_md/generated/user_provided/Stanford_MyHealth_Anesthesia_Preprocedure_2026_04_09.md');
  scar_injection_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:records_md/generated/user_provided/Stanford_MyHealth_Qian_Scar_Injection_2025_10_17.md');
  tawfik_visit_source_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:source:records_md/generated/user_provided/Stanford_Tawfik_2025_10_06_User_Provided.md');
  anesthesia_event_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:event:2026-04-09-anesthesia-preprocedure');
  scar_injection_event_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:event:2025-10-17-scar-injection');
  tawfik_visit_event_id uuid := uuid_generate_v5(uuid_ns_url(), 'bella-import:event:2025-10-06-pain-consult');
begin
  if not exists (select 1 from public.profiles where id = primary_user_id) then
    raise notice 'Skipping historical import scaffold because demo profile is missing. Run 002_demo.sql first.';
    return;
  end if;

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
      final_plan_source_id,
      demo_family_id,
      primary_user_id,
      'Imported final treatment plan scaffold',
      'generated_report',
      '2026-05-08',
      'Workspace report',
      'reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md',
      'Conservative source row for the workspace final treatment plan. Details remain in the source file.',
      array['imported', 'workspace', 'report', 'treatment_plan']
    ),
    (
      diagnosis_source_id,
      demo_family_id,
      primary_user_id,
      'Imported most-likely diagnosis scaffold',
      'generated_report',
      '2026-05-08',
      'Workspace report',
      'reports_md/MOST_LIKELY_DIAGNOSIS_2026-05-08.md',
      'Conservative source row for diagnostic reasoning report. Details remain in the source file.',
      array['imported', 'workspace', 'report', 'diagnosis']
    ),
    (
      literature_source_id,
      demo_family_id,
      primary_user_id,
      'Imported literature next-steps scaffold',
      'literature',
      '2026-05-08',
      'Workspace report',
      'reports_md/NEXT_STEPS_LITERATURE_2026-05-08.md',
      'Conservative source row for literature next steps. Details remain in the source file.',
      array['imported', 'workspace', 'literature']
    ),
    (
      deeper_research_source_id,
      demo_family_id,
      primary_user_id,
      'Imported deeper-research next-steps scaffold',
      'generated_report',
      '2026-05-08',
      'Workspace report',
      'reports_md/NEXT_STEPS_DEEPER_RESEARCH_2026-05-08.md',
      'Conservative source row for deeper research next steps. Details remain in the source file.',
      array['imported', 'workspace', 'research']
    ),
    (
      addendum_source_id,
      demo_family_id,
      primary_user_id,
      'Imported new-data addendum scaffold',
      'generated_report',
      '2026-05-08',
      'Workspace report',
      'reports_md/record_synthesis/NEW_DATA_ADDENDUM_2026-05-08.md',
      'Conservative source row for the record-synthesis addendum. Details remain in the source file.',
      array['imported', 'workspace', 'record_synthesis']
    ),
    (
      records_generated_source_id,
      demo_family_id,
      primary_user_id,
      'Imported records_md/generated collection scaffold',
      'other',
      '2026-05-08',
      'Workspace records',
      'records_md/generated/',
      'Collection source row representing generated markdown records. Individual files remain unchanged in the workspace.',
      array['imported', 'workspace', 'records_collection']
    ),
    (
      anesthesia_source_id,
      demo_family_id,
      primary_user_id,
      'Imported anesthesia preprocedure source scaffold',
      'visit_note',
      '2026-04-09',
      'Workspace records',
      'records_md/generated/user_provided/Stanford_MyHealth_Anesthesia_Preprocedure_2026_04_09.md',
      'Conservative source row for an imported preprocedure record. Details remain in the source file.',
      array['imported', 'workspace', 'procedure_source']
    ),
    (
      scar_injection_source_id,
      demo_family_id,
      primary_user_id,
      'Imported scar injection source scaffold',
      'visit_note',
      '2025-10-17',
      'Workspace records',
      'records_md/generated/user_provided/Stanford_MyHealth_Qian_Scar_Injection_2025_10_17.md',
      'Conservative source row for an imported scar-injection record. Details remain in the source file.',
      array['imported', 'workspace', 'procedure_source']
    ),
    (
      tawfik_visit_source_id,
      demo_family_id,
      primary_user_id,
      'Imported pain consult source scaffold',
      'visit_note',
      '2025-10-06',
      'Workspace records',
      'records_md/generated/user_provided/Stanford_Tawfik_2025_10_06_User_Provided.md',
      'Conservative source row for an imported pain-consult record. Details remain in the source file.',
      array['imported', 'workspace', 'consult_source']
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
  values
    (
      anesthesia_event_id,
      demo_family_id,
      primary_user_id,
      'procedure_test',
      '2026-04-09 12:00:00+00',
      'Imported preprocedure/anesthesia record scaffold',
      'Imported event scaffold from workspace record path; details remain in source file.',
      'Workspace records',
      anesthesia_source_id,
      'What was this procedure or test intended to clarify?',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'unclear',
      'Review original source before deciding repeat value.'
    ),
    (
      scar_injection_event_id,
      demo_family_id,
      primary_user_id,
      'procedure_test',
      '2025-10-17 12:00:00+00',
      'Imported scar injection record scaffold',
      'Imported procedure-impact scaffold from workspace record path; details remain in source file.',
      'Workspace records',
      scar_injection_source_id,
      'Did the scar-region intervention clarify a focal generator?',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'unclear',
      'Review original source before deciding repeat value.'
    ),
    (
      tawfik_visit_event_id,
      demo_family_id,
      primary_user_id,
      'consult',
      '2025-10-06 12:00:00+00',
      'Imported pain consult scaffold',
      'Imported consult scaffold from workspace record path; details remain in source file.',
      'Workspace records',
      tawfik_visit_source_id,
      'What diagnostic or treatment path was being considered at this visit?',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'unclear',
      'Use as a source-linked timeline anchor.'
    )
  on conflict (id) do update
  set
    occurred_at = excluded.occurred_at,
    title = excluded.title,
    summary = excluded.summary,
    provider = excluded.provider,
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
      uuid_generate_v5(uuid_ns_url(), 'bella-import:evidence:diagnosis-crps'),
      demo_family_id,
      crps_cold_id,
      'source',
      diagnosis_source_id,
      'pending',
      'Imported report source pending clinician interpretation.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-import:evidence:plan-focal-scar'),
      demo_family_id,
      focal_scar_id,
      'source',
      final_plan_source_id,
      'pending',
      'Imported treatment-plan source pending clinician interpretation.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-import:evidence:addendum-l5'),
      demo_family_id,
      l5_peroneal_id,
      'source',
      addendum_source_id,
      'pending',
      'Imported addendum source pending clinician interpretation.'
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-import:evidence:records-tbi-track'),
      demo_family_id,
      tbi_track_id,
      'source',
      records_generated_source_id,
      'neutral',
      'Imported records collection linked as an organizational source.'
    )
  on conflict (diagnosis_id, linked_type, linked_id) do update
  set
    direction = excluded.direction,
    note = excluded.note,
    deleted_at = null,
    updated_at = now();
end;
$$;
