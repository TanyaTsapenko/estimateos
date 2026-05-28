import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

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

  return NextResponse.json({ success: true, signatureUrl })
}
