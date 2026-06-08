import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const estimateId = request.nextUrl.searchParams.get('id')
  if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createServiceClient()

  const { data: est, error: estError } = await admin
    .from('estimates')
    .select('id, estimate_number, client_name')
    .eq('id', estimateId)
    .single()

  if (!est) return NextResponse.json({ error: 'Estimate not found', dbError: estError?.message }, { status: 404 })

  const clientSlug = (est.client_name || 'Client')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'Client'

  let browser: any
  try {
    const chromium = await import('@sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const executablePath = await chromium.default.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
    )
    console.log('[estimate-pdf] executablePath:', executablePath)

    browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    })
    console.log('[estimate-pdf] browser launched')

    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', (req: any) => {
      if (req.url().includes('sw.js')) { req.abort() } else { req.continue() }
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://useapexscale.com'
    const targetUrl = `${baseUrl}/estimate/${estimateId}?pdf=true`
    console.log('[estimate-pdf] navigating to:', targetUrl)

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    console.log('[estimate-pdf] page loaded')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    console.log('[estimate-pdf] pdf generated, size:', pdf.length)

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Estimate-${est.estimate_number}-${clientSlug}.pdf"`,
      },
    })

  } catch (err: any) {
    console.error('[estimate-pdf] error:', err?.message, err?.stack)
    return NextResponse.json({ error: 'PDF generation failed', details: String(err) }, { status: 500 })
  } finally {
    if (browser) {
      await browser.close().catch((e: any) => console.error('[estimate-pdf] browser.close error:', e))
    }
  }
}
