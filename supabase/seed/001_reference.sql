-- Production-safe reference seed. Idempotent.

insert into public.roles (slug, name, description)
values
  ('primary', 'Primary', 'Bella or the primary account owner. Can create, update, and export records.'),
  ('caregiver', 'Caregiver', 'Family caregiver. Can create, update, and export records.'),
  ('viewer', 'Viewer', 'Family read-only access.'),
  ('clinician_readonly', 'Clinician read-only', 'Future limited clinician read-only access.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now(),
  deleted_at = null;

insert into public.body_regions (slug, name, side, display_order)
values
  ('left_lateral_thigh_scar', 'Left lateral thigh scar', 'left', 10),
  ('left_lateral_thigh', 'Left lateral thigh', 'left', 20),
  ('left_knee', 'Left knee', 'left', 30),
  ('left_shin', 'Left shin', 'left', 40),
  ('left_dorsal_foot', 'Left top of foot', 'left', 50),
  ('left_big_toe', 'Left big toe', 'left', 60),
  ('right_leg', 'Right leg', 'right', 70),
  ('left_wrist', 'Left wrist', 'left', 80),
  ('left_hand', 'Left hand', 'left', 90),
  ('right_arm', 'Right arm', 'right', 100),
  ('head_vision_cognition', 'Head, vision, cognition', 'midline', 110),
  ('whole_body', 'Whole body', 'bilateral', 120)
on conflict (slug) do update
set
  name = excluded.name,
  side = excluded.side,
  display_order = excluded.display_order,
  updated_at = now(),
  deleted_at = null;

update public.body_regions child
set parent_region_id = parent.id, updated_at = now()
from public.body_regions parent
where child.slug in ('left_lateral_thigh_scar')
  and parent.slug = 'left_lateral_thigh';

insert into public.symptoms (slug, name, category, display_order)
values
  ('burning_pain', 'Burning pain', 'sensory', 10),
  ('stabbing_pain', 'Stabbing pain', 'sensory', 20),
  ('aching_pain', 'Aching pain', 'sensory', 30),
  ('freezing_sensation', 'Freezing sensation', 'sensory', 40),
  ('electric_pain', 'Electric pain', 'sensory', 50),
  ('cramping', 'Cramping', 'sensory', 60),
  ('numbness', 'Numbness', 'sensory', 70),
  ('pressure_sensitivity', 'Pressure sensitivity', 'sensory', 80),
  ('color_change', 'Color change', 'vasomotor', 90),
  ('temperature_asymmetry', 'Temperature asymmetry', 'vasomotor', 100),
  ('swelling', 'Swelling', 'sudomotor_edema', 110),
  ('weakness', 'Weakness', 'motor_trophic', 120),
  ('freezing_or_buckling', 'Freezing or buckling', 'motor_trophic', 130),
  ('sleep_disruption', 'Sleep disruption', 'function', 140),
  ('gait_change', 'Gait change', 'function', 150),
  ('cognitive_episode', 'Cognitive episode', 'cognitive', 160),
  ('medication_side_effect', 'Medication side effect', 'medication_side_effect', 170)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  display_order = excluded.display_order,
  updated_at = now(),
  deleted_at = null;

insert into public.triggers (slug, name, category, display_order, is_bella_specific)
values
  ('pressure', 'Pressure', 'mechanical', 10, false),
  ('activity', 'Activity', 'exertion', 20, false),
  ('sleep', 'Sleep', 'daily_living', 30, false),
  ('unknown', 'Unknown', 'unknown', 40, false),
  ('bp_cuff', 'BP cuff', 'bella_specific_pressure', 50, true),
  ('iv_placement', 'IV placement', 'bella_specific_pressure', 60, true),
  ('ring', 'Ring', 'bella_specific_pressure', 70, true),
  ('wrist_hairband', 'Wrist hairband', 'bella_specific_pressure', 80, true),
  ('sleeping_on_arm', 'Sleeping on arm', 'bella_specific_pressure', 90, true),
  ('tight_clothing', 'Tight clothing', 'bella_specific_pressure', 100, true),
  ('breeze', 'Breeze', 'environmental', 110, true),
  ('blanket', 'Blanket', 'environmental', 120, true),
  ('vibration', 'Vibration', 'mechanical', 130, true),
  ('sitting', 'Sitting', 'position', 140, true),
  ('driving', 'Driving', 'activity', 150, true),
  ('stairs', 'Stairs', 'activity', 160, true),
  ('pt', 'PT', 'activity', 170, true),
  ('procedure', 'Procedure', 'medical', 180, true),
  ('scar_touch_probe_pressure', 'Scar touch/probe pressure', 'bella_specific_pressure', 190, true),
  ('medication_change', 'Medication change', 'medical', 200, true)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  display_order = excluded.display_order,
  is_bella_specific = excluded.is_bella_specific,
  updated_at = now(),
  deleted_at = null;
