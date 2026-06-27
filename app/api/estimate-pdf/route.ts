export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateEstimateHtml } from '@/lib/generateEstimateHtml'

async function htmlToPdf(html: string): Promise<Buffer> {
  // Dynamic import so chromium is not bundled in the edge runtime
  const puppeteer = (await import('puppeteer-core')).default
  const chromium  = (await import('@sparticuz/chromium')).default

  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
    || (process.env.NODE_ENV === 'production'
      ? await chromium.executablePath()
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

  const browser = await puppeteer.launch({
    args: process.env.NODE_ENV === 'production'
      ? chromium.args
      : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
    defaultViewport: { width: 1200, height: 900 },
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 })
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

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

    const [{ data: openings, error: opErr }, { data: company, error: compErr }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimate_openings').select('*').eq('estimate_id', estimateId).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, company_contact_email, phone, address, city, province, postal, website, licence, gst_hst_number, wsib_number, logo_url, warranty_summary').eq('id', estimate.user_id).maybeSingle(),
      admin.from('price_lists').select('opening_type, custom_label').eq('user_id', estimate.user_id).neq('opening_type', '_sizes'),
      admin.from('window_subtypes').select('type_key, subtype_key, subtype_label').order('sort_order'),
    ])

    console.log('[estimate-pdf] openings:', openings?.length, 'opErr:', opErr?.message)
    console.log('[estimate-pdf] company:', company?.company_name, 'compErr:', compErr?.message)

    const customLabels: Record<string, string> = {}
    priceRows?.forEach((r: any) => { if (r.custom_label) customLabels[r.opening_type] = r.custom_label })

    const subtypesByType: Record<string, { key: string; label: string }[]> = {}
    subtypeRows?.forEach((r: any) => {
      if (!subtypesByType[r.type_key]) subtypesByType[r.type_key] = []
      subtypesByType[r.type_key].push({ key: r.subtype_key, label: r.subtype_label })
    })

    console.log('[estimate-pdf] generating HTML...')
    const html = generateEstimateHtml({
      estimate,
      openings: openings || [],
      company: company || {},
      customLabels,
      subtypesByType,
    })

    console.log('[estimate-pdf] launching puppeteer...')
    const pdfBuffer = await htmlToPdf(html)
    console.log('[estimate-pdf] PDF done, size:', pdfBuffer.length)

    const clientSlug = (estimate.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '-')
    const filename   = `Estimate-${estimate.estimate_number}-${clientSlug}.pdf`

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
