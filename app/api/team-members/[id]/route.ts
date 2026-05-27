import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify the target member actually belongs to this owner
  const { data: member, error: fetchErr } = await admin
    .from('profiles')
    .select('id, team_owner_id')
    .eq('id', params.id)
    .single()

  if (fetchErr || !member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.team_owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('profiles')
    .update({ team_owner_id: null, member_role: null, role: null, permissions: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
