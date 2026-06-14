-- Fix team-aware INSERT policy for invoices.
-- Previously: auth.uid() = user_id (blocks owner inserting invoice for a team member's estimate)
-- Now: owner/manager of the same team can insert invoices on behalf of any team member.

drop policy if exists "Users insert own invoices" on public.invoices;
create policy "Users insert own invoices"
  on public.invoices for insert with check (
    auth.uid() = user_id
    OR auth.uid() = (SELECT team_owner_id FROM public.profiles WHERE id = invoices.user_id)
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = (SELECT team_owner_id FROM public.profiles WHERE id = invoices.user_id)
  );
