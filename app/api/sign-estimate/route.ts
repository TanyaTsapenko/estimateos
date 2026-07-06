import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest) {
  const { estimateId, action, signatureBase64, clientName } = await request.json()

  if (!estimateId || !action) {
    return NextResponse.json({ error: 'Missing estimateId or action' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: estimate, error: estErr } = await supabase
    .from('estimates')
    .select('id, status, user_id, estimate_number, client_name, total')
    .eq('id', estimateId)
    .single()

  if (estErr || !estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  if (!['draft', 'sent'].includes(estimate.status)) {
    return NextResponse.json({ error: 'Estimate cannot be signed or declined in its current state' }, { status: 400 })
  }

  const actor = clientName || estimate.client_name || 'Client'

  if (action === 'decline') {
    await supabase.from('estimates').update({ status: 'declined' }).eq('id', estimateId)
    await supabase.from('notifications').insert({
      user_id: estimate.user_id,
      type: 'estimate_declined',
      title: 'Estimate declined',
      body: `${actor} declined ${estimate.estimate_number}`,
      read: false,
      link: `/dashboard/estimates/${estimateId}`,
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'sign') {
    if (!signatureBase64) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

    const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${estimateId}/sig-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'Signature upload failed: ' + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName)
    const sigUrl = urlData.publicUrl
    const now = new Date().toISOString()

    await supabase.from('estimates').update({
      status: 'signed',
      signed_at: now,
      client_signature_url: sigUrl,
    }).eq('id', estimateId)

    await supabase.from('notifications').insert({
      user_id: estimate.user_id,
      type: 'estimate_signed',
      title: 'Estimate signed',
      body: `${actor} signed ${estimate.estimate_number}`,
      read: false,
      link: `/dashboard/estimates/${estimateId}`,
    })

    try {
      await logActivity(supabase, {
        user_id: estimate.user_id,
        event_type: 'estimate_signed',
        actor_type: 'client',
        actor_name: actor,
        entity_type: 'estimate',
        entity_id: estimateId,
        entity_number: estimate.estimate_number,
        client_name: actor,
        amount: estimate.total,
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, signatureUrl: sigUrl })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
