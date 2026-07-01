export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { ContractPDF } from '@/components/pdf/ContractPDF'
import { renderDrawingPng } from '@/lib/renderDrawingPng'
import React from 'react'

export async function GET(req: NextRequest) {
  console.log('[contract-pdf-gen] route called')
  try {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

    console.log('[contract-pdf-gen] contractId:', contractId)
    const admin = createServiceClient()

    const { data: contract, error: contractErr } = await admin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .maybeSingle()

    console.log('[contract-pdf-gen] contract fetch:', { found: !!contract, error: contractErr?.message })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const [{ data: estimate, error: estErr }, { data: openings, error: opErr }, { data: company, error: compErr }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', contract.estimate_id).maybeSingle(),
      admin.from('estimate_openings').select('*').eq('estimate_id', contract.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal, website, licence, insurance, logo_url, signature_url, warranty_period, completion_timeframe, project_manager, contract_clauses, interac_email, wsib_number, gst_hst_number, signing_rep_name, signing_rep_title, payment_methods').eq('id', contract.profile_id).maybeSingle(),
      admin.from('price_lists').select('opening_type, custom_label').eq('user_id', contract.profile_id).neq('opening_type', '_sizes'),
      admin.from('window_subtypes').select('type_key, subtype_key, subtype_label').order('sort_order'),
    ])

    const customLabels: Record<string, string> = {}
    priceRows?.forEach((r: any) => { if (r.custom_label) customLabels[r.opening_type] = r.custom_label })
    const subtypesByType: Record<string, { key: string; label: string }[]> = {}
    subtypeRows?.forEach((r: any) => {
      if (!subtypesByType[r.type_key]) subtypesByType[r.type_key] = []
      subtypesByType[r.type_key].push({ key: r.subtype_key, label: r.subtype_label })
    })

    console.log('[contract-pdf-gen] estimate:', { found: !!estimate, error: estErr?.message })
    console.log('[contract-pdf-gen] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[contract-pdf-gen] company:', company?.company_name, 'compErr:', compErr?.message)

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    console.log('[contract-pdf-gen] rendering drawing PNGs...')
    const drawingResults = await Promise.all(
      (openings || []).map(op =>
        renderDrawingPng(op, 600, 720).catch(err => {
          console.error('[contract-pdf-gen] drawing render FAILED for', op.type, err?.message, err?.stack)
          return { png: '', wLabel: '', hLabel: '' }
        })
      )
    )
    const drawingPngs   = drawingResults.map(r => r.png)
    const drawingLabels = drawingResults.map(r => ({ w: r.wLabel, h: r.hLabel }))

    const parsedClauses = (() => {
      try {
        const raw = company?.contract_clauses
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'string') return JSON.parse(raw)
        return []
      } catch { return [] }
    })()

    const contractWithClauses = {
      ...contract,
      contract_clauses: parsedClauses
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .filter((c: any) => c.enabled !== false),
      contract_terms_snapshot: contract.contract_terms_snapshot || '',
    }

    console.log('[contract-pdf-gen] calling renderToBuffer...')
    const pdfBuffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        contract: contractWithClauses,
        estimate,
        openings: openings || [],
        company: company || {},
        customLabels,
        subtypesByType,
        drawingPngs,
        drawingLabels,
      }) as React.ReactElement<DocumentProps>
    )

    console.log('[contract-pdf-gen] renderToBuffer done, size:', pdfBuffer.length)

    const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'Client'
    const filename = `Contract-${estimate.estimate_number}-${clientSlug}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[contract-pdf-gen] FATAL ERROR:', error)
    console.error('[contract-pdf-gen] Stack:', error instanceof Error ? error.stack : 'no stack')
    return NextResponse.json({
      error: 'PDF generation failed',
      details: String(error),
    }, { status: 500 })
  }
}
