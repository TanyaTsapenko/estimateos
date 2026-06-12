import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest) {
  const { contractId, signatureBase64, clientName } = await request.json()
  if (!contractId || !signatureBase64) {
    return NextResponse.json({ error: 'Missing contractId or signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: contract, error: conErr } = await supabase
    .from('contracts').select('*').eq('id', contractId).single()
  if (conErr || !contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (contract.status === 'signed') return NextResponse.json({ error: 'Already signed' }, { status: 400 })

  // Upload PNG blob server-side (bypasses storage RLS)
  const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  const fileName = `contract-signatures/${contractId}-client-${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName)
  const signatureUrl = urlData.publicUrl
  const now = new Date().toISOString()

  await supabase.from('contracts').update({
    status: 'signed',
    client_signature_url: signatureUrl,
    signed_at: now,
  }).eq('id', contractId)

  await supabase.from('estimates').update({
    status: 'signed',
    signed_at: now,
  }).eq('id', contract.estimate_id)

  await supabase.from('notifications').insert({
    user_id: contract.profile_id,
    type: 'estimate_signed',
    title: 'Contract signed',
    body: `${clientName || 'Client'} signed the contract`,
    link: `/dashboard/estimates/${contract.estimate_id}`,
  })

  try {
    const { data: estForLog } = await supabase.from('estimates')
      .select('estimate_number, total, client_name').eq('id', contract.estimate_id).single()
    await logActivity(supabase, {
      user_id: contract.profile_id,
      event_type: 'contract_signed',
      actor_type: 'client',
      actor_name: clientName || estForLog?.client_name || 'Client',
      entity_type: 'estimate',
      entity_id: contract.estimate_id,
      entity_number: estForLog?.estimate_number,
      client_name: clientName || estForLog?.client_name,
      amount: estForLog?.total,
    })
    // Team activity notification for owner when a team member's estimate is signed
    const { data: memberProf } = await supabase
      .from('profiles')
      .select('team_owner_id, first_name, last_name')
      .eq('id', contract.profile_id)
      .single()
    if (memberProf?.team_owner_id) {
      const { data: ownerProf } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', memberProf.team_owner_id)
        .single()
      const ns = (ownerProf?.notification_settings as any)
      if (ns?.inapp?.pushTeam === true) {
        const repName = [memberProf.first_name, memberProf.last_name].filter(Boolean).join(' ') || 'Team member'
        await supabase.from('notifications').insert({
          user_id: memberProf.team_owner_id,
          type: 'team_activity',
          title: 'Team activity',
          body: `${repName}'s estimate ${estForLog?.estimate_number || ''} was signed by ${clientName || estForLog?.client_name || 'Client'}`,
          link: `/dashboard/estimates/${contract.estimate_id}`,
          read: false,
        })
      }
    }
  } catch (logErr) {
    console.error('[sign-contract] logActivity error:', logErr)
  }

  return NextResponse.json({ success: true, signatureUrl })
}
