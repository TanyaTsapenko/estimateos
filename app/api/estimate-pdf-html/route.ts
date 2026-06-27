export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateEstimateHtml } from '@/lib/generateEstimateHtml'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const estimateId = searchParams.get('id')
    if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createServiceClient()

    const { data: estimate } = await admin
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .maybeSingle()

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const [{ data: openings }, { data: company }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimate_openings').select('*').eq('estimate_id', estimateId).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, company_contact_email, phone, address, city, province, postal, website, licence, gst_hst_number, wsib_number, logo_url, warranty_summary').eq('id', estimate.user_id).maybeSingle(),
      admin.from('price_lists').select('opening_type, custom_label').eq('user_id', estimate.user_id).neq('opening_type', '_sizes'),
      admin.from('window_subtypes').select('type_key, subtype_key, subtype_label').order('sort_order'),
    ])

    const customLabels: Record<string, string> = {}
    priceRows?.forEach((r: any) => { if (r.custom_label) customLabels[r.opening_type] = r.custom_label })

    const subtypesByType: Record<string, { key: string; label: string }[]> = {}
    subtypeRows?.forEach((r: any) => {
      if (!subtypesByType[r.type_key]) subtypesByType[r.type_key] = []
      subtypesByType[r.type_key].push({ key: r.subtype_key, label: r.subtype_label })
    })

    const html = generateEstimateHtml({
      estimate,
      openings: openings || [],
      company: company || {},
      customLabels,
      subtypesByType,
    })

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('[estimate-pdf-html] error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
