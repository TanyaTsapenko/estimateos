import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get('contractId')
  if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

  const admin = createAdminClient()
  const cleanContractId = contractId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
  console.log('[contract-pdf] looking for contract:', cleanContractId)

  const { data: con, error: conError } = await admin.from('contracts').select('id, profile_id, estimate_id').eq('id', cleanContractId).single()
  console.log('[contract-pdf] contract:', con ? 'found' : 'null', 'error:', conError?.message)

  if (!con) return NextResponse.json({ error: 'Contract not found', id: cleanContractId, dbError: conError?.message }, { status: 404 })

  const { data: est } = await admin.from('estimates').select('client_name, estimate_number').eq('id', con.estimate_id).single()
  const clientName = (est?.client_name || 'Client')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'Client'
  const estimateNumber = est?.estimate_number || con.id.slice(0, 6).toUpperCase()

  let browser: any
  try {
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
    )
    console.log('[contract-pdf] executablePath:', executablePath)

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    })
    console.log('[contract-pdf] browser launched')

    const page = await browser.newPage()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://useapexscale.com'
    const targetUrl = `${baseUrl}/sign/contract/${contractId}?pdf=true`
    console.log('[contract-pdf] navigating to:', targetUrl)

    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 45000 })
    console.log('[contract-pdf] page loaded')

    await new Promise(r => setTimeout(r, 2000))

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    console.log('[contract-pdf] pdf generated, size:', pdf.length)

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${estimateNumber}-${clientName}.pdf"`,
      },
    })

  } catch (err: any) {
    console.error('[contract-pdf] error:', err?.message, err?.stack)
    return NextResponse.json({ error: 'PDF generation failed', details: String(err) }, { status: 500 })
  } finally {
    if (browser) {
      await browser.close().catch((e: any) => console.error('[contract-pdf] browser.close error:', e))
    }
  }
}

export const config = {
  api: {
    responseLimit: '10mb',
  },
}
