-- Fix team-aware RLS for opening-photos Storage bucket.
-- Previously: auth.uid()::text = foldername[1] — only the literal uploader can insert/delete.
-- Now: owner/manager of the same team can insert and delete any team member's photos.
-- Pattern mirrors fix_team_rls_update_policies.sql and fix_invoices_insert_policy.sql.
-- SELECT (public read) is unchanged.

drop policy if exists "Users upload opening photos"  on storage.objects;
drop policy if exists "Users delete opening photos"  on storage.objects;
drop policy if exists "Users manage own opening photos" on storage.objects;

create policy "Users upload opening photos"
  on storage.objects for insert
  with check (
    bucket_id = 'opening-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = (
        SELECT team_owner_id FROM public.profiles
        WHERE id = (storage.foldername(name))[1]::uuid
      )
      OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid())
         = (SELECT team_owner_id FROM public.profiles WHERE id = (storage.foldername(name))[1]::uuid)
    )
  );

create policy "Users delete opening photos"
  on storage.objects for delete
  using (
    bucket_id = 'opening-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = (
        SELECT team_owner_id FROM public.profiles
        WHERE id = (storage.foldername(name))[1]::uuid
      )
      OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid())
         = (SELECT team_owner_id FROM public.profiles WHERE id = (storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists "Users update opening photos" on storage.objects;

create policy "Users update opening photos"
  on storage.objects for update
  using (
    bucket_id = 'opening-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = (
        SELECT team_owner_id FROM public.profiles
        WHERE id = (storage.foldername(name))[1]::uuid
      )
      OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid())
         = (SELECT team_owner_id FROM public.profiles WHERE id = (storage.foldername(name))[1]::uuid)
    )
  )
  with check (
    bucket_id = 'opening-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = (
        SELECT team_owner_id FROM public.profiles
        WHERE id = (storage.foldername(name))[1]::uuid
      )
      OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid())
         = (SELECT team_owner_id FROM public.profiles WHERE id = (storage.foldername(name))[1]::uuid)
    )
  );
