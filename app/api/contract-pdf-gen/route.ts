export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { ContractPDF } from '@/components/pdf/ContractPDF'
import { getWindowSvgString } from '@/lib/windowSvgString'
import { svgToPngBase64 } from '@/lib/svgToPng'
import React from 'react'

export async function GET(req: NextRequest) {
  console.log('[contract-pdf] route called')
  try {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('contractId')
    if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

    console.log('[contract-pdf] contractId:', contractId)
    const admin = createServiceClient()

    const { data: contract, error: contractErr } = await admin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .maybeSingle()

    console.log('[contract-pdf] contract fetch:', { found: !!contract, error: contractErr?.message })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const [{ data: estimate, error: estErr }, { data: openings, error: opErr }, { data: company, error: compErr }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', contract.estimate_id).maybeSingle(),
      admin.from('estimate_openings').select('*').eq('estimate_id', contract.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal_code, website, licence_number, insurance_number, logo_url, signature_url, warranty_period, completion_timeframe, project_manager, contract_clauses, interac_email').eq('id', contract.profile_id).maybeSingle(),
    ])

    console.log('[contract-pdf] estimate:', { found: !!estimate, error: estErr?.message })
    console.log('[contract-pdf] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[contract-pdf] company:', company?.company_name, 'compErr:', compErr?.message)

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

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
      contract_clauses: parsedClauses.filter((c: any) => c.enabled !== false),
      contract_terms_snapshot: contract.contract_terms_snapshot || '',
    }

    console.log('[contract-pdf] estimate id:', estimate?.id)
    console.log('[contract-pdf] openings count:', openings?.length)
    console.log('[contract-pdf] company name:', company?.company_name)
    console.log('[contract-pdf] raw client_name:', JSON.stringify(estimate?.client_name))
    console.log('[contract-pdf] client_name:', estimate?.client_name)
    console.log('[contract-pdf] contract_clauses type:', typeof contractWithClauses.contract_clauses)
    console.log('[contract-pdf] contract_clauses value:', JSON.stringify(contractWithClauses.contract_clauses)?.slice(0, 300))
    console.log('[contract-pdf] company contract_clauses:', JSON.stringify(company?.contract_clauses)?.slice(0, 300))
    console.log('[contract-pdf] contract_terms_snapshot:', contractWithClauses.contract_terms_snapshot?.slice(0, 100))
    const openingsWithDiagrams = await Promise.all(
      (openings || []).map(async (op: any) => ({
        ...op,
        diagramPng: await svgToPngBase64(getWindowSvgString(op.type), 160, 160),
      }))
    )

    console.log('[contract-pdf] calling renderToBuffer...')

    const pdfBuffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        contract: contractWithClauses,
        estimate,
        openings: openingsWithDiagrams,
        company: company || {},
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
