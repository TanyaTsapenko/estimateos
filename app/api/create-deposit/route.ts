import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

// Public proxy: sign pages call this; secret never touches the client bundle.
// Retries once on failure. If both attempts fail, logs a 'deposit_invoice_failed'
// activity event so the contractor can see it in the dashboard audit trail.
export async function POST(request: NextRequest) {
  const { estimateId } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const secret = process.env.INTERNAL_API_SECRET || ''
  const base = request.nextUrl.origin
  const targetUrl = `${base}/api/deposit-invoice`
  console.log('[DEBUG create-deposit] targetUrl:', targetUrl, '| secret length:', secret.length)

  async function attempt() {
    return fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ estimateId }),
    })
  }

  let res = await attempt()
  if (!res.ok) {
    res = await attempt()
    if (!res.ok) {
      const admin = createAdminClient()
      const { data: est } = await admin
        .from('estimates')
        .select('user_id, estimate_number, client_name')
        .eq('id', estimateId)
        .single()
      if (est) {
        logActivity(admin, {
          user_id: est.user_id,
          event_type: 'deposit_invoice_failed',
          actor_type: 'contractor',
          entity_type: 'estimate',
          entity_id: estimateId,
          entity_number: est.estimate_number,
          client_name: est.client_name,
        }).catch((e: any) => console.error('[create-deposit] logActivity error:', e))
      }
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ error: 'deposit invoice failed after retry', ...data }, { status: 500 })
    }
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
