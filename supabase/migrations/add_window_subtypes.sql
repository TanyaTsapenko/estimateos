-- Window subtypes table + new attribute columns on estimate_openings

CREATE TABLE IF NOT EXISTS public.window_subtypes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key      text NOT NULL REFERENCES public.product_types(type_key) ON DELETE CASCADE,
  subtype_key   text NOT NULL,
  subtype_label text NOT NULL,
  sort_order    integer DEFAULT 0,
  UNIQUE (type_key, subtype_key)
);

ALTER TABLE public.window_subtypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read window subtypes"
ON public.window_subtypes FOR SELECT TO authenticated USING (true);

ALTER TABLE public.estimate_openings
  ADD COLUMN IF NOT EXISTS window_subtype  text,
  ADD COLUMN IF NOT EXISTS pane            text DEFAULT 'double',
  ADD COLUMN IF NOT EXISTS egress_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shape_position  text;

-- product_types needs enabled column before we can insert with it
ALTER TABLE public.product_types
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- New Hopper type (not in original OPENING_TYPES, added in this migration)
INSERT INTO public.product_types (category, type_key, type_label, sort_order, enabled)
VALUES ('Window', 'window_hopper', 'Hopper Window', 21, true)
ON CONFLICT (type_key) DO NOTHING;

-- Seed all window subtypes
INSERT INTO public.window_subtypes (type_key, subtype_key, subtype_label, sort_order) VALUES
  ('window_dh',    'standard',           'Standard',           1),
  ('window_dh',    'tilt_in',            'Tilt-In',            2),
  ('window_sh',    'standard',           'Standard',           1),
  ('window_sh',    'heavy_duty',         'Heavy Duty',         2),
  ('window_cas',   'left_casement',      'Left Casement',      1),
  ('window_cas',   'right_casement',     'Right Casement',     2),
  ('window_cas',   'double_casement',    'Double Casement',    3),
  ('window_cas',   'fixed_casement',     'Fixed Casement',     4),
  ('window_tilt',  'tilt_only',          'Tilt Only',          1),
  ('window_tilt',  'tilt_and_turn',      'Tilt & Turn',        2),
  ('window_awn',   'standard_awning',    'Standard Awning',    1),
  ('window_awn',   'fixed_plus_awning',  'Fixed + Awning',     2),
  ('window_sl',    'single_slider',      'Single Slider',      1),
  ('window_sl',    'double_slider',      'Double Slider',      2),
  ('window_sl',    'end_vent_slider',    'End Vent Slider',    3),
  ('window_sl',    'lift_out_slider',    'Lift-Out Slider',    4),
  ('window_sl',    'heavy_duty_slider',  'Heavy Duty Slider',  5),
  ('window_fix',   'picture',            'Picture Window',     1),
  ('window_fix',   'transom',            'Transom',            2),
  ('window_fix',   'sidelite',           'Sidelite',           3),
  ('window_fix',   'fixed_casement',     'Fixed Casement',     4),
  ('window_hopper','standard_hopper',    'Standard Hopper',    1),
  ('window_hopper','basement_hopper',    'Basement Hopper',    2),
  ('window_bay',   '3_lite_bay',         '3-Lite Bay',         1),
  ('window_bay',   '4_lite_bay',         '4-Lite Bay',         2),
  ('window_bay',   'custom_bay',         'Custom Bay',         3),
  ('window_bow',   '4_lite_bow',         '4-Lite Bow',         1),
  ('window_bow',   '5_lite_bow',         '5-Lite Bow',         2),
  ('window_bow',   '6_lite_bow',         '6-Lite Bow',         3),
  ('window_bow',   'custom_bow',         'Custom Bow',         4),
  ('window_combo', 'cas_picture',        'Casement + Picture', 1),
  ('window_combo', 'sl_picture',         'Slider + Picture',   2),
  ('window_combo', 'awn_picture',        'Awning + Picture',   3),
  ('window_combo', 'custom_combo',       'Custom Combination', 4)
ON CONFLICT (type_key, subtype_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
