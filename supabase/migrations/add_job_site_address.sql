ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS job_site_address text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS job_site_city text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS job_site_province text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS job_site_postal_code text;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS job_site_same_as_client boolean DEFAULT true;
NOTIFY pgrst, 'reload schema';
