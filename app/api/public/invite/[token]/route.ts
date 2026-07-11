import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || typeof token !== 'string' || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const svc = createServiceClient()

  const { data: invite } = await svc
    .from('team_invitations')
    .select('invitee_email, invitee_name, role, owner_id, expires_at, status')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  const { data: prof } = await svc
    .from('profiles')
    .select('company_name, first_name, last_name')
    .eq('id', invite.owner_id)
    .maybeSingle()

  const companyName = prof?.company_name
    || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim()
    || 'the team'

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Already a member', companyName }, { status: 409 })
  }

  // Return only what the page needs — no token, no owner_id, no invitation id
  return NextResponse.json({
    companyName,
    inviteeName: invite.invitee_name ?? null,
    inviteeEmail: invite.invitee_email,
    role: invite.role,
    expiresAt: invite.expires_at,
  })
}
