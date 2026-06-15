-- Phase 1: product_types hierarchy tables (read-only foundation, no logic changes)

CREATE TABLE IF NOT EXISTS public.product_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL,
  type_key    text NOT NULL UNIQUE,
  type_label  text NOT NULL,
  subtype     text,
  sort_order  integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.type_field_visibility (
  type_key    text NOT NULL REFERENCES public.product_types(type_key) ON DELETE CASCADE,
  field_name  text NOT NULL,
  is_visible  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (type_key, field_name)
);

ALTER TABLE public.estimate_openings
  ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES public.product_types(id),
  ADD COLUMN IF NOT EXISTS subtype text;

ALTER TABLE public.price_lists
  ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES public.product_types(id);

-- Seed product_types (order matches OPENING_TYPES in lib/pricing.ts)
INSERT INTO public.product_types (category, type_key, type_label, sort_order) VALUES
  ('Window','window_dh',   'Double-Hung Window',    1),
  ('Window','window_sh',   'Single-Hung Window',    2),
  ('Window','window_cas',  'Casement Window',       3),
  ('Window','window_tilt', 'Tilt & Turn Window',    4),
  ('Window','window_awn',  'Awning Window',         5),
  ('Window','window_sl',   'Sliding Window',        6),
  ('Window','window_fix',  'Fixed / Picture Window',7),
  ('Window','window_bay',  'Bay Window',            8),
  ('Window','window_bow',  'Bow Window',            9),
  ('Window','window_trans','Transom Window',        10),
  ('Window','window_arch', 'Arched Window',         11),
  ('Window','window_egr',  'Egress Window',         12),
  ('Window','window_combo','Combination Window',    13),
  ('Door',  'door_entry',  'Entry Door',            14),
  ('Door',  'door_double', 'Double Entry Door',     15),
  ('Door',  'door_french', 'French Doors',          16),
  ('Door',  'door_patio',  'Patio Sliding Door',    17),
  ('Door',  'door_garden', 'Garden Door',           18),
  ('Door',  'door_storm',  'Storm Door',            19),
  ('Door',  'door_int',    'Interior Door',         20)
ON CONFLICT (type_key) DO NOTHING;

-- Seed type_field_visibility (mirrors current getTypeSpecificOptions() logic)
INSERT INTO public.type_field_visibility (type_key, field_name, is_visible) VALUES
  ('window_dh',   'screen',         true),
  ('window_dh',   'tilt_clean',     true),
  ('window_sh',   'screen',         true),
  ('window_sh',   'tilt_clean',     true),
  ('window_cas',  'screen',         true),
  ('window_cas',  'direction',      true),
  ('window_cas',  'handle_type',    true),
  ('window_awn',  'screen',         true),
  ('window_awn',  'handle_type',    true),
  ('window_sl',   'screen',         true),
  ('window_sl',   'panels_count',   true),
  ('window_bay',  'bay_angle',      true),
  ('window_trans','transom_panes',  true),
  ('window_tilt', 'handle_type',    true),
  ('window_combo','combo_sections', true),
  ('door_entry',  'sidelights',     true),
  ('door_entry',  'transom_above',  true),
  ('door_entry',  'handle_type',    true),
  ('door_french', 'sidelights',     true),
  ('door_french', 'transom_above',  true),
  ('door_double', 'sidelights',     true),
  ('door_double', 'transom_above',  true),
  ('door_patio',  'panels_count',   true),
  ('door_patio',  'handle_type',    true),
  ('door_storm',  'glass_type',     true),
  ('door_int',    'core_type',      true),
  ('door_int',    'handle_type',    true),
  ('door_garden', 'transom_above',  true),
  ('door_garden', 'handle_type',    true)
ON CONFLICT (type_key, field_name) DO NOTHING;

-- Backfill product_type_id for existing records
UPDATE public.estimate_openings eo
SET product_type_id = pt.id
FROM public.product_types pt
WHERE eo.type = pt.type_key AND eo.product_type_id IS NULL;

UPDATE public.price_lists pl
SET product_type_id = pt.id
FROM public.product_types pt
WHERE pl.opening_type = pt.type_key AND pl.product_type_id IS NULL;

NOTIFY pgrst, 'reload schema';
