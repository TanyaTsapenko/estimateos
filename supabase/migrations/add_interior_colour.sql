ALTER TABLE public.estimate_openings
  ADD COLUMN IF NOT EXISTS interior_colour_palette_id uuid REFERENCES public.color_palette(id),
  ADD COLUMN IF NOT EXISTS interior_colour_name text,
  ADD COLUMN IF NOT EXISTS interior_colour text DEFAULT 'white';

NOTIFY pgrst, 'reload schema';
