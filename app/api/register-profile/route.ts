import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, firstName, lastName } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const sanitizedId = userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
  const admin = createAdminClient()

  // Verify the userId corresponds to a real auth.users row
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(sanitizedId)
  if (authErr || !authData.user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Skip if profile already has a name set — callback handles confirmed-signup overwrites
  const { data: existing } = await admin.from('profiles').select('first_name').eq('id', sanitizedId).maybeSingle()
  if (existing?.first_name) return NextResponse.json({ success: true })

  const { error } = await admin.from('profiles').upsert({
    id: sanitizedId,
    first_name: firstName || null,
    last_name: lastName || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
