alter table public.appointments add column if not exists postal_code text;
alter table public.estimates   add column if not exists client_postal_code text;
