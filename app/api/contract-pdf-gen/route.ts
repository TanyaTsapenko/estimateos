export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { ContractPDF } from '@/components/pdf/ContractPDF'
import { getEffectiveClauses } from '@/lib/contractClauses'
import React from 'react'
import { renderDrawingPng } from '@/lib/renderDrawingPng'

const SECTION_TYPE_MAP: Record<string, string> = {
  'Casement': 'casement', 'Fixed': 'picture', 'Picture': 'picture',
  'Slider': 'slider', 'Awning': 'awning', 'Single Hung': 'singleHung',
}
function parseSec(raw: any): { type: string; width: number }[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

export async function GET(req: NextRequest) {
  console.log('[contract-pdf] route called')
  try {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

    const admin = createServiceClient()

    const { data: contract, error: contractErr } = await admin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .maybeSingle()

    console.log('[contract-pdf] contract fetch:', { found: !!contract, error: contractErr?.message })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const [{ data: estimate, error: estErr }, { data: openings, error: opErr }, { data: company, error: compErr }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', contract.estimate_id).maybeSingle(),
      admin.from('estimate_openings').select('*').eq('estimate_id', contract.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal, website, licence, insurance, logo_url, signature_url, warranty_period, completion_timeframe, project_manager, contract_clauses, interac_email, wsib_number, gst_hst_number, signing_rep_name, signing_rep_title').eq('id', contract.profile_id).maybeSingle(),
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

    console.log('[contract-pdf] estimate:', { found: !!estimate, error: estErr?.message })
    console.log('[contract-pdf] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[contract-pdf] company:', company?.company_name, 'compErr:', compErr?.message)

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const contractWithClauses = {
      ...contract,
      contract_clauses: getEffectiveClauses(company?.contract_clauses)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .filter((c) => c.enabled !== false),
      contract_terms_snapshot: contract.contract_terms_snapshot || '',
    }

    console.log('[contract-pdf] openings count:', openings?.length)
    console.log('[contract-pdf] company name:', company?.company_name)
    console.log('[contract-pdf] contract_clauses type:', typeof contractWithClauses.contract_clauses)
    // Pre-render each opening to PNG using the same shape-aware pipeline as the estimate PDF
    const openingPngs: Record<string, string> = {}
    const isComboOp = (op: any) => op.type === 'combination' || op.type === 'window_combo'
    const [, sectionDrawingPngs] = await Promise.all([
      Promise.allSettled(
        (openings || []).map(async (op: any) => {
          const [w, h] = isComboOp(op) ? [600, 200] : [400, 480]
          try {
            const { png } = await renderDrawingPng(op, w, h)
            openingPngs[op.id] = png
          } catch (e) {
            console.error('[contract-pdf] drawing render failed for opening', op.id, e)
          }
        })
      ),
      Promise.all(
        (openings || []).map(async (op: any) => {
          if (!isComboOp(op)) return []
          const secs = parseSec(op.sections)
          if (!secs.length) return []
          return Promise.all(
            secs.map((sec: { type: string; width: number }) => {
              const typeKey = SECTION_TYPE_MAP[sec.type] || 'picture'
              return renderDrawingPng({ type: typeKey }, 120, 144)
                .then(r => r.png)
                .catch(() => '')
            })
          )
        })
      ),
    ])

    console.log('[contract-pdf] calling renderToBuffer...')

    const pdfBuffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        contract: contractWithClauses,
        estimate,
        openings: openings || [],
        company: company || {},
        customLabels,
        subtypesByType,
        openingPngs,
        sectionDrawingPngs,
      }) as React.ReactElement<DocumentProps>
    )

    console.log('[contract-pdf] renderToBuffer done, size:', pdfBuffer.length)

    const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'Client'
    const filename = `Contract-${estimate.estimate_number}-${clientSlug}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[contract-pdf] FATAL ERROR:', error)
    console.error('[contract-pdf] Stack:', error instanceof Error ? error.stack : 'no stack')
    return NextResponse.json({
      error: 'PDF generation failed',
      details: String(error),
    }, { status: 500 })
  }
}
