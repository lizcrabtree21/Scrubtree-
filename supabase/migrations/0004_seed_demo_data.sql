-- Demo data: two example surgeons, two example procedures with steps, and
-- one example surgeon preference record. Everything here is flagged
-- is_demo = true so it's easy to find and delete later.
--
-- Placeholder step content: the original prototype file this data is meant
-- to mirror wasn't available when this migration was written, so the step
-- lists below are reasonable generic clinical steps, not a copy of the
-- prototype. Replace them via the admin forms once you've built them.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`),
-- after 0003_procedures_surgeons_prefs.sql.

with reyes as (
  insert into public.surgeons (name, specialty, is_demo)
  values ('Dr. A. Reyes', 'Orthopaedic Surgery', true)
  returning id
),
whitfield as (
  insert into public.surgeons (name, specialty, is_demo)
  values ('Dr. S. Whitfield', 'General & Laparoscopic Surgery', true)
  returning id
),
tka as (
  insert into public.procedures (name, category, definition, summary, is_demo)
  values (
    'Total Knee Arthroplasty',
    'Orthopaedic Surgery',
    'Total knee arthroplasty (TKA) is a surgical procedure that resurfaces a knee damaged by arthritis or injury, replacing the joint surfaces with prosthetic components.',
    'Standard approach: medial parapatellar arthrotomy, sequential bone resection, trial reduction, cementation, and closure.',
    true
  )
  returning id
),
lc as (
  insert into public.procedures (name, category, definition, summary, is_demo)
  values (
    'Laparoscopic Cholecystectomy',
    'General & Laparoscopic Surgery',
    'Laparoscopic cholecystectomy is minimally invasive removal of the gallbladder using a laparoscope and small incisions.',
    'Standard approach: pneumoperitoneum, four-port access, Calot''s triangle dissection, clipping and division of the cystic duct/artery, and gallbladder removal.',
    true
  )
  returning id
),
tka_steps as (
  insert into public.procedure_steps (procedure_id, step_order, title, description, is_demo)
  select tka.id, s.step_order, s.title, s.description, true
  from tka, (values
    (1, 'Position and prep', 'Position patient supine with tourniquet applied; prep and drape the limb.'),
    (2, 'Incision and exposure', 'Medial parapatellar incision; arthrotomy to expose the joint.'),
    (3, 'Distal femoral resection', 'Resect distal femur using the intramedullary or extramedullary guide.'),
    (4, 'Proximal tibial resection', 'Resect proximal tibia to the planned depth and slope.'),
    (5, 'Sizing and trialling', 'Size femoral and tibial components; trial reduction and assess balance.'),
    (6, 'Patella preparation', 'Resurface or resect the patella as planned.'),
    (7, 'Cementation', 'Cement and implant final femoral, tibial, and patellar components.'),
    (8, 'Closure', 'Irrigate, achieve haemostasis, and close in layers.')
  ) as s(step_order, title, description)
  returning id, step_order
),
lc_steps as (
  insert into public.procedure_steps (procedure_id, step_order, title, description, is_demo)
  select lc.id, s.step_order, s.title, s.description, true
  from lc, (values
    (1, 'Position and access', 'Supine position; establish pneumoperitoneum and place four ports.'),
    (2, 'Initial inspection', 'Inspect the abdomen and gallbladder for anatomy and pathology.'),
    (3, 'Calot''s triangle dissection', 'Dissect Calot''s triangle to identify the cystic duct and artery.'),
    (4, 'Clip and divide', 'Clip and divide the cystic duct and cystic artery.'),
    (5, 'Gallbladder dissection', 'Dissect the gallbladder free from the liver bed.'),
    (6, 'Extraction', 'Extract the gallbladder through the umbilical port.'),
    (7, 'Closure', 'Deflate pneumoperitoneum, inspect for haemostasis, and close port sites.')
  ) as s(step_order, title, description)
  returning id, step_order
),
reyes_tka_pref as (
  insert into public.surgeon_prefs (
    surgeon_id, procedure_id, instrument_set, equipment, sutures,
    table_orientation, table_angle, consoles, notes, is_demo
  )
  select
    reyes.id,
    tka.id,
    'Standard total knee instrument tray',
    '["Tourniquet", "Pulse lavage", "Cement mixing system", "Image-free navigation (optional)"]'::jsonb,
    '#1 Vicryl for deep layers, staples or subcuticular Monocryl for skin',
    'Table turned 90 degrees from anaesthesia, operative leg toward surgeon',
    90,
    '[{"label":"Surgeon","position":"S"},{"label":"Assistant","position":"SE"},{"label":"Scrub nurse","position":"E"},{"label":"Anaesthesia","position":"N"}]'::jsonb,
    'Tourniquet inflated after limb exsanguination; released before closure to check haemostasis.',
    true
  from reyes, tka
  returning id
)
insert into public.surgeon_pref_steps (surgeon_pref_id, step_id, instrument)
select reyes_tka_pref.id, tka_steps.id, i.instrument
from reyes_tka_pref, tka_steps
join (values
  (1, 'Skin knife (#10 blade)'),
  (2, 'Bovie electrocautery, self-retaining retractor'),
  (3, 'Intramedullary rod, distal cutting guide, oscillating saw'),
  (4, 'Extramedullary tibial guide, oscillating saw'),
  (5, 'Trial femoral/tibial components, spacer blocks'),
  (6, 'Patellar reamer, patellar clamp'),
  (7, 'Cement gun, pulse lavage'),
  (8, 'Needle driver, skin stapler')
) as i(step_order, instrument) on i.step_order = tka_steps.step_order;
