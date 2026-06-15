-- glass_type already exists (values: full/half for storm door glass coverage)
-- Using glass_kind for the new glass clarity/coating field to avoid collision
ALTER TABLE public.estimate_openings
  ADD COLUMN IF NOT EXISTS glass_kind text    DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS low_e      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tempered   boolean DEFAULT false;

UPDATE public.estimate_openings SET
  glass_kind = CASE
    WHEN glass = 'frosted' THEN 'frosted'
    WHEN glass = 'tinted'  THEN 'tinted'
    ELSE 'clear'
  END,
  low_e    = (glass = 'lowe'),
  tempered = (glass = 'tempered');

NOTIFY pgrst, 'reload schema';
