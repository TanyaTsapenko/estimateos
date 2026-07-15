import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })

  const wh = new Webhook(secret)
  const body = await req.text()

  let event: any
  try {
    event = wh.verify(body, {
      'svix-id':        req.headers.get('svix-id')        ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (event?.type !== 'email.opened') {
    return NextResponse.json({ received: true })
  }

  // Tags come as either { estimate_id: 'value' } or [{ name, value }]
  const tags = event?.data?.tags
  let estimateId: string | null = null
  let contractId: string | null = null

  if (Array.isArray(tags)) {
    estimateId = tags.find((t: { name: string; value: string }) => t.name === 'estimate_id')?.value ?? null
    contractId = tags.find((t: { name: string; value: string }) => t.name === 'contract_id')?.value ?? null
  } else if (tags && typeof tags === 'object') {
    estimateId = tags['estimate_id'] ?? null
    contractId = tags['contract_id'] ?? null
  }

  if (!estimateId && !contractId) {
    return NextResponse.json({ received: true, skipped: 'no estimate_id or contract_id tag' })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  if (estimateId) {
    await supabase
      .from('estimates')
      .update({ status: 'opened', opened_at: now })
      .eq('id', estimateId)
      .eq('status', 'sent') // only update if still 'sent', don't overwrite signed/declined
  }

  if (contractId) {
    await supabase
      .from('contracts')
      .update({ opened_at: now })
      .eq('id', contractId)
      .neq('status', 'signed') // don't overwrite signed contracts
  }

  return NextResponse.json({ received: true, estimateId, contractId })
}
