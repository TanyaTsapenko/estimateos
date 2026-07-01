ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS trim_casing_custom_name text,
  ADD COLUMN IF NOT EXISTS trim_jamb_custom_name text;

NOTIFY pgrst, 'reload schema';
