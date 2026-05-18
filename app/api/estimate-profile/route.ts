import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const estimateId = request.nextUrl.searchParams.get('estimateId')
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: est } = await supabase
    .from('estimates')
    .select('user_id')
    .eq('id', estimateId)
    .single()

  if (!est) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, city, province, logo_url, deposit_pct, contract_pdf_url, contract_terms')
    .eq('id', est.user_id)
    .single()

  return NextResponse.json(prof ?? {})
}
