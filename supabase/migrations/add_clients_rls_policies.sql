-- Add missing RLS policies for the clients table.
-- clients.owner_id is set at insert to COALESCE(profile.team_owner_id, profile.id),
-- so all teammates share owner_id = team_owner.id.
-- Two-arm scope: you can act on clients where you ARE the owner,
-- or where your team_owner_id matches the client's owner_id (you're a teammate).
-- Note: estimates/invoices use a three-arm pattern because they store user_id (the individual
-- inserter); clients store owner_id already coalesced to the team root, so two arms suffice.

drop policy if exists "Users see own clients"    on public.clients;
drop policy if exists "Users insert own clients" on public.clients;
drop policy if exists "Users update own clients" on public.clients;
drop policy if exists "Users delete own clients" on public.clients;

create policy "Users see own clients"
  on public.clients for select using (
    auth.uid() = owner_id
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = owner_id
  );

create policy "Users insert own clients"
  on public.clients for insert with check (
    auth.uid() = owner_id
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = owner_id
  );

create policy "Users update own clients"
  on public.clients for update using (
    auth.uid() = owner_id
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = owner_id
  );

create policy "Users delete own clients"
  on public.clients for delete using (
    auth.uid() = owner_id
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = owner_id
  );
