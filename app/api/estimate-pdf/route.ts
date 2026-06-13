export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { EstimatePDF } from '@/components/pdf/EstimatePDF'
import React from 'react'

export async function GET(req: NextRequest) {
  console.log('[estimate-pdf] route called')
  try {
    const { searchParams } = new URL(req.url)
    const estimateId = searchParams.get('id')
    if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    console.log('[estimate-pdf] estimateId:', estimateId)
    const admin = createServiceClient()

    const { data: estimate, error: estErr } = await admin
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .maybeSingle()

    console.log('[estimate-pdf] estimate fetch:', { found: !!estimate, error: estErr?.message })
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const [{ data: openings, error: opErr }, { data: company, error: compErr }] = await Promise.all([
      admin.from('estimate_openings').select('*').eq('estimate_id', estimateId).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal, website, licence, insurance, logo_url, signature_url, warranty_period, warranty_summary, completion_timeframe, project_manager, interac_email').eq('id', estimate.user_id).maybeSingle(),
    ])

    console.log('[estimate-pdf] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[estimate-pdf] company:', company?.company_name, 'compErr:', compErr?.message)
    console.log('[estimate-pdf] estimate:', estimate?.id)
    console.log('[estimate-pdf] openings count:', openings?.length)
    console.log('[estimate-pdf] company:', company?.company_name)
    console.log('[estimate-pdf] calling renderToBuffer...')

    const pdfBuffer = await renderToBuffer(
      React.createElement(EstimatePDF, {
        estimate,
        openings: openings || [],
        company: company || {},
      }) as React.ReactElement<DocumentProps>
    )

    console.log('[estimate-pdf] renderToBuffer done, size:', pdfBuffer.length)

    const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `Estimate-${estimate.estimate_number}-${clientSlug}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[estimate-pdf] FATAL ERROR:', error)
    console.error('[estimate-pdf] Stack:', error instanceof Error ? error.stack : 'no stack')
    return NextResponse.json({
      error: 'PDF generation failed',
      details: String(error),
    }, { status: 500 })
  }
}
