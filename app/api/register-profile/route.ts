import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, firstName, lastName } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const sanitizedId = userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
  const sessionId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
  if (sanitizedId !== sessionId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()

  const { error } = await admin.from('profiles').upsert({
    id: sanitizedId,
    first_name: firstName || null,
    last_name: lastName || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
