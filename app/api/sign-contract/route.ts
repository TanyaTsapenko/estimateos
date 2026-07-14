import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest) {
  const { contractId, signatureBase64, clientName, agreedToTerms } = await request.json()
  if (!contractId || !signatureBase64) {
    return NextResponse.json({ error: 'Missing contractId or signature' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? request.headers.get('x-real-ip')
          ?? 'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'

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

  // Compute SHA-256 of the key contract content at the moment of signing
  const [{ data: estForHash }, { data: openingsForHash }] = await Promise.all([
    supabase.from('estimates')
      .select('total, subtotal, tax_amount, discount_amount, deposit_percent, payment_method')
      .eq('id', contract.estimate_id).single(),
    supabase.from('estimate_openings')
      .select('id, type, qty, total_cost, pane, colour, interior_colour, material, lockset, deadbolt, deadbolt_type, brickmould, jamb, threshold_type, door_style, glass_insert, glass_finish')
      .eq('estimate_id', contract.estimate_id).order('sort_order'),
  ])
  const documentHash = createHash('sha256')
    .update(JSON.stringify({
      estimate_id: contract.estimate_id,
      total: estForHash?.total,
      deposit_percent: contract.deposit_percent,
      payment_method: contract.payment_method,
      terms: contract.contract_terms_snapshot,
      openings: openingsForHash,
    }), 'utf8')
    .digest('hex')

  await supabase.from('contracts').update({
    status: 'signed',
    client_signature_url: signatureUrl,
    signed_at: now,
    ip_address: ip,
    user_agent: userAgent,
    document_hash: documentHash,
    agreed_to_terms: agreedToTerms === true,
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
    read: false,
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
