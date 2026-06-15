ALTER TABLE public.estimate_openings ADD COLUMN IF NOT EXISTS interior_photo_url text;
ALTER TABLE public.estimate_openings ADD COLUMN IF NOT EXISTS exterior_photo_url text;
NOTIFY pgrst, 'reload schema';

insert into storage.buckets (id, name, public)
  values ('opening-photos', 'opening-photos', true)
  on conflict (id) do nothing;

drop policy if exists "Users upload opening photos" on storage.objects;
drop policy if exists "Users delete opening photos" on storage.objects;
drop policy if exists "Public read opening photos"  on storage.objects;

create policy "Users upload opening photos"
  on storage.objects for insert
  with check (bucket_id = 'opening-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete opening photos"
  on storage.objects for delete
  using (bucket_id = 'opening-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read opening photos"
  on storage.objects for select
  using (bucket_id = 'opening-photos');
