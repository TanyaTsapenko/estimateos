ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS expired_reason text;
NOTIFY pgrst, 'reload schema';
