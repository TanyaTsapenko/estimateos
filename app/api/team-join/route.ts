import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Must be signed in to accept an invite' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invite, error: invErr } = await admin
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (invErr || !invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  if (invite.owner_id === user.id) {
    return NextResponse.json({ error: 'You cannot accept your own invite' }, { status: 400 })
  }

  const appRole = invite.role === 'owner' ? 'owner' : 'estimator'

  // Upsert so the row is created if it doesn't exist yet (e.g. user just registered via invite link)
  const profileData: Record<string, unknown> = {
    id: user.id, team_owner_id: invite.owner_id, member_role: invite.role, role: appRole,
    onboarding_done: true,
  }
  if (invite.permissions) profileData.permissions = invite.permissions

  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })

  if (profileErr) {
    console.error('[team-join] profile upsert error:', profileErr)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await admin
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, role: invite.role })
}
