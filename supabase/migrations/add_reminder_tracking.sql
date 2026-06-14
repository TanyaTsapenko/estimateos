ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;
NOTIFY pgrst, 'reload schema';
