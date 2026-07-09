ALTER TABLE public.estimate_openings
  ADD COLUMN IF NOT EXISTS active_panel text,
  ADD COLUMN IF NOT EXISTS astragal     text;
