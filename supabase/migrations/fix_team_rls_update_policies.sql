-- Fix team-aware UPDATE policies for estimates and invoices.
-- Previously: auth.uid() = user_id (blocks owner marking team member's invoice/estimate as paid)
-- Now: owner/manager of the same team can update any member's records.

drop policy if exists "Users update own estimates" on public.estimates;
create policy "Users update own estimates"
  on public.estimates for update using (
    auth.uid() = user_id
    OR auth.uid() = (SELECT team_owner_id FROM public.profiles WHERE id = estimates.user_id)
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = (SELECT team_owner_id FROM public.profiles WHERE id = estimates.user_id)
  );

drop policy if exists "Users update own invoices" on public.invoices;
create policy "Users update own invoices"
  on public.invoices for update using (
    auth.uid() = user_id
    OR auth.uid() = (SELECT team_owner_id FROM public.profiles WHERE id = invoices.user_id)
    OR (SELECT team_owner_id FROM public.profiles WHERE id = auth.uid()) = (SELECT team_owner_id FROM public.profiles WHERE id = invoices.user_id)
  );
