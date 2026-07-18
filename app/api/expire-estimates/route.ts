import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const { data: estimates, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, client_name, user_id')
    .eq('status', 'sent')
    .or(`created_at.lt.${cutoff},valid_until.lt.${today}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!estimates || estimates.length === 0) {
    return NextResponse.json({ expired: 0 })
  }

  const ids = estimates.map(e => e.id)

  const [{ error: updateErr }] = await Promise.all([
    supabase.from('estimates').update({ status: 'expired' }).in('id', ids),
  ])

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const links = estimates.map(e => `/dashboard/estimates/${e.id}`)
  const { data: existing } = await supabase
    .from('notifications')
    .select('link')
    .eq('type', 'estimate_expired')
    .in('link', links)
  const existingLinks = new Set((existing || []).map((n: any) => n.link))

  const notifications = estimates
    .filter(e => !existingLinks.has(`/dashboard/estimates/${e.id}`))
    .map(e => ({
      user_id: e.user_id,
      type:    'estimate_expired',
      title:   'Estimate expired',
      body:    `${e.estimate_number} expired without a response${e.client_name ? ` from ${e.client_name}` : ''}`,
      read:    false,
      link:    `/dashboard/estimates/${e.id}`,
    }))

  if (notifications.length > 0) await supabase.from('notifications').insert(notifications)

  return NextResponse.json({ expired: estimates.length, ids })
}
