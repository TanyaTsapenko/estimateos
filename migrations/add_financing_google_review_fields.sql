ALTER TABLE profiles ADD COLUMN IF NOT EXISTS financing_info    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_review_link text;
NOTIFY pgrst, 'reload schema';
