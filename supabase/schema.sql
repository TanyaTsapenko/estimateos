create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text,
  last_name       text,
  email           text,
  company_name    text,
  phone           text,
  website         text,
  city            text,
  province        text default 'AB',
  trade           text default 'wd',
  licence         text,
  insurance       text,
  logo_url        text,
  contract_terms  text,
  signature_url   text,
  plan            text default 'pro',
  onboarding_done boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.estimates (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  estimate_number      text not null,
  client_name          text,
  client_email         text,
  client_phone         text,
  client_address       text,
  client_city          text,
  client_province      text,
  scope_notes          text,
  status               text default 'draft',
  tier                 text default 'better',
  subtotal             numeric(12,2) default 0,
  tax_rate             numeric(6,4)  default 0,
  tax_amount           numeric(12,2) default 0,
  total                numeric(12,2) default 0,
  signed_at            timestamptz,
  client_signature_url text,
  pdf_url              text,
  notes                text,
  valid_until          date,
  sent_method          text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table public.estimates enable row level security;

drop policy if exists "Users see own estimates"    on public.estimates;
drop policy if exists "Users insert own estimates" on public.estimates;
drop policy if exists "Users update own estimates" on public.estimates;
drop policy if exists "Users delete own estimates" on public.estimates;
drop policy if exists "Public read estimate by id" on public.estimates;
drop policy if exists "Public sign estimate"       on public.estimates;

create policy "Users see own estimates"
  on public.estimates for select using (auth.uid() = user_id);

create policy "Users insert own estimates"
  on public.estimates for insert with check (auth.uid() = user_id);

create policy "Users update own estimates"
  on public.estimates for update using (auth.uid() = user_id);

create policy "Users delete own estimates"
  on public.estimates for delete using (auth.uid() = user_id);

create policy "Public read estimate by id"
  on public.estimates for select using (true);

create policy "Public sign estimate"
  on public.estimates for update
  using (status in ('draft', 'sent'))
  with check (status in ('signed', 'declined'));

create table if not exists public.estimate_openings (
  id           uuid primary key default gen_random_uuid(),
  estimate_id  uuid not null references public.estimates(id) on delete cascade,
  type         text not null default 'window_dh',
  qty          integer default 1,
  width        text default 'md',
  shape        text default 'rect',
  colour       text default 'white',
  glass        text default 'clear',
  frame        text default 'none',
  install      text default 'insert',
  floor        text default 'first',
  room         text,
  sidelight    numeric default 0,
  transom      numeric default 0,
  screen       numeric default 0,
  unit_cost    numeric(12,2) default 0,
  total_cost   numeric(12,2) default 0,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

alter table public.estimate_openings enable row level security;

drop policy if exists "Users see own openings"           on public.estimate_openings;
drop policy if exists "Users insert own openings"        on public.estimate_openings;
drop policy if exists "Users update own openings"        on public.estimate_openings;
drop policy if exists "Users delete own openings"        on public.estimate_openings;
drop policy if exists "Public read openings by estimate" on public.estimate_openings;

create policy "Users see own openings"
  on public.estimate_openings for select
  using (estimate_id in (select id from public.estimates where user_id = auth.uid()));

create policy "Users insert own openings"
  on public.estimate_openings for insert
  with check (estimate_id in (select id from public.estimates where user_id = auth.uid()));

create policy "Users update own openings"
  on public.estimate_openings for update
  using (estimate_id in (select id from public.estimates where user_id = auth.uid()));

create policy "Users delete own openings"
  on public.estimate_openings for delete
  using (estimate_id in (select id from public.estimates where user_id = auth.uid()));

create policy "Public read openings by estimate"
  on public.estimate_openings for select using (true);

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  estimate_id    uuid references public.estimates(id) on delete set null,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  invoice_number text not null,
  status         text default 'pending',
  amount         numeric(12,2) default 0,
  due_date       date,
  paid_at        timestamptz,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.invoices enable row level security;

drop policy if exists "Users see own invoices"    on public.invoices;
drop policy if exists "Users insert own invoices" on public.invoices;
drop policy if exists "Users update own invoices" on public.invoices;
drop policy if exists "Users delete own invoices" on public.invoices;

create policy "Users see own invoices"
  on public.invoices for select using (auth.uid() = user_id);

create policy "Users insert own invoices"
  on public.invoices for insert with check (auth.uid() = user_id);

create policy "Users update own invoices"
  on public.invoices for update using (auth.uid() = user_id);

create policy "Users delete own invoices"
  on public.invoices for delete using (auth.uid() = user_id);

alter table public.profiles
  add column if not exists team_owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists member_role text;

create table if not exists public.team_invitations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  invitee_name  text,
  role          text not null default 'estimator',
  token         text not null unique default gen_random_uuid()::text,
  status        text not null default 'pending',
  created_at    timestamptz default now(),
  expires_at    timestamptz default (now() + interval '7 days')
);

alter table public.team_invitations enable row level security;

drop policy if exists "Owners manage own invitations"      on public.team_invitations;
drop policy if exists "Public read pending invitation"     on public.team_invitations;

create policy "Owners manage own invitations"
  on public.team_invitations for all using (auth.uid() = owner_id);

create policy "Public read pending invitation"
  on public.team_invitations for select using (status = 'pending');

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('signatures', 'signatures', true)
  on conflict (id) do nothing;

drop policy if exists "Users upload own logo"      on storage.objects;
drop policy if exists "Users update own logo"      on storage.objects;
drop policy if exists "Users delete own logo"      on storage.objects;
drop policy if exists "Public read logos"          on storage.objects;
drop policy if exists "Users upload own signature" on storage.objects;
drop policy if exists "Users update own signature" on storage.objects;
drop policy if exists "Users delete own signature" on storage.objects;
drop policy if exists "Public read signatures"     on storage.objects;

create policy "Users upload own logo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own logo"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own logo"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Users upload own signature"
  on storage.objects for insert
  with check (bucket_id = 'signatures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own signature"
  on storage.objects for update
  using (bucket_id = 'signatures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own signature"
  on storage.objects for delete
  using (bucket_id = 'signatures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read signatures"
  on storage.objects for select
  using (bucket_id = 'signatures');
