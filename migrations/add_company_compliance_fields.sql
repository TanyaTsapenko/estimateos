-- Add tax, compliance, credentials, and signature fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gst_hst_number           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_contact_email    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS licence_expiry_date      date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS licence_issuing_province text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_provider       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_policy_number  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_expiry_date    date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wsib_number              text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signing_rep_name         text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signing_rep_title        text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warranty_summary         text;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
