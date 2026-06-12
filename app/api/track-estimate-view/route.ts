import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const { estimateId } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: est } = await supabase
    .from('estimates')
    .select('id, user_id, status, view_count, client_name, estimate_number')
    .eq('id', estimateId)
    .single()

  if (!est) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (est.status === 'signed' || est.status === 'declined') return NextResponse.json({ ok: true })

  const isFirstView = !est.view_count || est.view_count === 0

  await supabase.from('estimates').update({
    viewed_at: new Date().toISOString(),
    view_count: (est.view_count || 0) + 1,
  }).eq('id', estimateId)

  if (isFirstView && est.user_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', est.user_id)
      .single()
    const ns = (prof?.notification_settings as any)
    if (ns?.inapp?.pushNew !== false) {
      await supabase.from('notifications').insert({
        user_id: est.user_id,
        type: 'estimate_viewed',
        title: 'Estimate viewed',
        body: `${est.client_name || 'Client'} viewed estimate ${est.estimate_number}`,
        link: `/dashboard/estimates/${est.id}`,
        read: false,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
