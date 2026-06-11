import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, event_type, actor_type, actor_name, entity_type, entity_id, entity_number, client_name, amount } = await request.json()

  if (user_id && user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!event_type || !actor_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    await logActivity(createAdminClient(), {
      user_id: user.id,
      event_type,
      actor_type,
      actor_name,
      entity_type,
      entity_id,
      entity_number,
      client_name,
      amount,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
