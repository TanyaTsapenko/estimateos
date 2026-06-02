import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get('contractId')
  if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

  try {
    const admin = createAdminClient()
    const cleanContractId = contractId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    console.log('Looking for contract:', cleanContractId)

    const { data: con, error: conError } = await admin.from('contracts').select('id, profile_id').eq('id', cleanContractId).single()
    console.log('Contract result:', con ? 'found' : 'null', 'error:', conError?.message)

    if (!con) return NextResponse.json({ error: 'Contract not found', id: cleanContractId, dbError: conError?.message }, { status: 404 })

    const chromium = await import('@sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const executablePath = await chromium.default.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
    )

    const browser = await puppeteer.default.launch({
      args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 600, height: 900, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://useapexscale.com'
    await page.goto(`${baseUrl}/sign/contract/${contractId}?pdf=true`, {
      waitUntil: 'networkidle0',
      timeout: 45000,
    })

    await new Promise(r => setTimeout(r, 4000))
    await page.evaluate(() => document.fonts.ready)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const clientName = 'Client'

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${con.id.slice(0,6).toUpperCase()}-${clientName}.pdf"`,
      },
    })

  } catch (err: any) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
