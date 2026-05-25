import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const payload = await req.json()

  if (payload?.type !== 'email.opened') {
    return NextResponse.json({ received: true })
  }

  // Tags come as either { estimate_id: 'value' } or [{ name, value }]
  const tags = payload?.data?.tags
  let estimateId: string | null = null

  if (Array.isArray(tags)) {
    estimateId = tags.find((t: { name: string; value: string }) => t.name === 'estimate_id')?.value ?? null
  } else if (tags && typeof tags === 'object') {
    estimateId = tags['estimate_id'] ?? null
  }

  if (!estimateId) {
    return NextResponse.json({ received: true, skipped: 'no estimate_id tag' })
  }

  const supabase = createServiceClient()
  await supabase
    .from('estimates')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('id', estimateId)
    .eq('status', 'sent') // only update if still 'sent', don't overwrite signed/declined

  return NextResponse.json({ received: true, estimateId })
}
