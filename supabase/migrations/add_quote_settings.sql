ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quote_settings JSONB DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
