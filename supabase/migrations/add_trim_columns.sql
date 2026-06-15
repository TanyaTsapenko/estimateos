ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS trim_casing text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS trim_casing_size text,
  ADD COLUMN IF NOT EXISTS trim_jamb text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS trim_brickmold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_brickmold_colour_palette_id uuid REFERENCES public.color_palette(id),
  ADD COLUMN IF NOT EXISTS trim_brickmold_colour_name text,
  ADD COLUMN IF NOT EXISTS trim_rosettes text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS trim_caping boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_nail_fin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_drip_cap boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_blue_skin boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
