-- Security: close two critical anonymous-access holes.
-- Corresponding code changes move these flows to service-role API routes.

-- 1. Any anonymous caller could UPDATE any estimate to status='signed' or 'declined'
--    directly via the Supabase client, bypassing /api/sign-contract entirely.
--    Signing and declining estimates is now handled exclusively by /api/sign-estimate
--    which uses createServiceClient() (service role).
drop policy if exists "Public sign estimate" on public.estimates;

-- 2. Any anonymous caller could SELECT all pending team invitations, exposing
--    every active invite token, invitee email, and owner ID in a single query.
--    Invite metadata is now served via /api/public/invite/[token] which uses
--    createServiceClient() and returns only: companyName, inviteeName, inviteeEmail, role.
drop policy if exists "Public read pending invitation" on public.team_invitations;
