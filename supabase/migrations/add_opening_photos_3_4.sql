ALTER TABLE public.estimate_openings ADD COLUMN IF NOT EXISTS photo_3_url text;
ALTER TABLE public.estimate_openings ADD COLUMN IF NOT EXISTS photo_4_url text;
NOTIFY pgrst, 'reload schema';
