import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const estimateId = request.nextUrl.searchParams.get('id')
  if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
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
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'Client'

    const chromium = await import('@sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const executablePath = await chromium.default.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
    )

    const browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', (req) => {
      if (req.url().includes('sw.js')) { req.abort() } else { req.continue() }
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://useapexscale.com'
    await page.goto(`${baseUrl}/estimate/${estimateId}?pdf=true`, { waitUntil: 'networkidle2', timeout: 30000 })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Estimate-${est.estimate_number}-${clientSlug}.pdf"`,
      },
    })

  } catch (err: any) {
    console.error('Estimate PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
