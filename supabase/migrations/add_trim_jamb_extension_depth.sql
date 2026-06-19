ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS trim_jamb_extension_depth text,
  ADD COLUMN IF NOT EXISTS trim_jamb_extension_depth_custom text;

NOTIFY pgrst, 'reload schema';
