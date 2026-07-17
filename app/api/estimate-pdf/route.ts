export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import { EstimatePDF } from '@/components/pdf/EstimatePDF'
import { renderDrawingPng } from '@/lib/renderDrawingPng'
import { PDFDocument } from 'pdf-lib'
import React from 'react'

export async function GET(req: NextRequest) {
  console.log('[estimate-pdf] route called')
  try {
    const { searchParams } = new URL(req.url)
    const estimateId = searchParams.get('id')
    if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createServiceClient()

    const { data: estimate, error: estErr } = await admin
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .maybeSingle()

    console.log('[estimate-pdf] estimate fetch:', { found: !!estimate, error: estErr?.message })
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const [{ data: openings, error: opErr }, { data: company, error: compErr }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimate_openings').select('*').eq('estimate_id', estimateId).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, phone, address, city, province, postal, website, licence, wsib_number, logo_url, warranty_summary, warranty_pdf_url').eq('id', estimate.user_id).maybeSingle(),
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

    console.log('[estimate-pdf] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[estimate-pdf] company:', company?.company_name, 'compErr:', compErr?.message)
    console.log('[estimate-pdf] rendering drawing PNGs...')

    const drawingResults = await Promise.all(
      (openings || []).map(op =>
        renderDrawingPng(op, 600, 720).catch(err => {
          console.error('[estimate-pdf] drawing render FAILED for', op.type, err?.message, err?.stack)
          return { png: '', wLabel: '', hLabel: '' }
        })
      )
    )
    const drawingPngs   = drawingResults.map(r => r.png)
    const drawingLabels = drawingResults.map(r => ({ w: r.wLabel, h: r.hLabel }))

    const SECTION_TYPE_MAP: Record<string, string> = {
      'Casement': 'casement', 'Fixed': 'picture', 'Picture': 'picture',
      'Slider': 'slider', 'Awning': 'awning', 'Single Hung': 'singleHung', 'Double Hung': 'doubleHung',
    }
    function parseSec(raw: any): { type: string; width: number }[] {
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
      return []
    }
    const sectionDrawingPngs: string[][] = await Promise.all(
      (openings || []).map(async (op: any) => {
        if (op.type !== 'combination' && op.type !== 'window_combo') return []
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
    )

    console.log('[estimate-pdf] calling renderToBuffer...')
    const pdfBuffer = await renderToBuffer(
      React.createElement(EstimatePDF, {
        estimate,
        openings: openings || [],
        company: company || {},
        customLabels,
        subtypesByType,
        drawingPngs,
        drawingLabels,
        sectionDrawingPngs,
      }) as React.ReactElement<DocumentProps>
    )

    console.log('[estimate-pdf] renderToBuffer done, size:', pdfBuffer.length)

    let finalBuffer: Uint8Array = new Uint8Array(pdfBuffer)

    if (company?.warranty_pdf_url) {
      try {
        const warrantyRes = await fetch(company.warranty_pdf_url)
        if (!warrantyRes.ok) throw new Error(`warranty PDF fetch ${warrantyRes.status}`)
        const warrantyBytes = await warrantyRes.arrayBuffer()
        const estimateDoc  = await PDFDocument.load(finalBuffer)
        const warrantyDoc  = await PDFDocument.load(warrantyBytes)
        const copied = await estimateDoc.copyPages(warrantyDoc, warrantyDoc.getPageIndices())
        copied.forEach(p => estimateDoc.addPage(p))
        finalBuffer = await estimateDoc.save()
        console.log('[estimate-pdf] warranty PDF merged, final size:', finalBuffer.length)
      } catch (mergeErr) {
        console.error('[estimate-pdf] warranty PDF merge skipped:', mergeErr instanceof Error ? mergeErr.message : mergeErr)
      }
    }

    const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `Estimate-${estimate.estimate_number}-${clientSlug}.pdf`

    return new NextResponse(Buffer.from(finalBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
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
