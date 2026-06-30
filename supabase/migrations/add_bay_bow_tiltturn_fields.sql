ALTER TABLE estimate_openings ADD COLUMN IF NOT EXISTS side_unit          text;
ALTER TABLE estimate_openings ADD COLUMN IF NOT EXISTS center_window_type text;
ALTER TABLE estimate_openings ADD COLUMN IF NOT EXISTS panel_type         text;
ALTER TABLE estimate_openings ADD COLUMN IF NOT EXISTS open_mode          text;
