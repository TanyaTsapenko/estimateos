alter table public.contracts add column if not exists deposit_percent numeric;
alter table public.contracts add column if not exists payment_method  text;
alter table public.estimates  add column if not exists deposit_percent numeric;
