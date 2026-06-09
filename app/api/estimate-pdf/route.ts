export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { EstimatePDF } from '@/components/pdf/EstimatePDF'
import React from 'react'

export async function GET(req: NextRequest) {
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

  const [{ data: openings }, { data: company }] = await Promise.all([
    admin.from('estimate_openings').select('*').eq('estimate_id', estimateId).order('sort_order'),
    admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal_code, website, licence_number, insurance_number, logo_url, signature_url, warranty_period, completion_timeframe, project_manager, interac_email').eq('id', estimate.user_id).maybeSingle(),
  ])

  const pdfBuffer = await renderToBuffer(
    React.createElement(EstimatePDF, {
      estimate,
      openings: openings || [],
      company: company || {},
    })
  )

  const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `Estimate-${estimate.estimate_number}-${clientSlug}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
