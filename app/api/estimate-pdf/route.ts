import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

const OPENING_NAMES: Record<string, string> = {
  window_dh:   'Double-Hung Window',
  window_cas:  'Casement Window',
  window_bay:  'Bay / Bow Window',
  window_sl:   'Sliding Window',
  window_fix:  'Fixed / Picture',
  door_entry:  'Entry Door',
  door_patio:  'Patio Sliding Door',
  door_french: 'French Doors',
  door_storm:  'Storm Door',
  door_int:    'Interior Door',
}

function fmtCAD(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

function sizeLabel(width_in?: number, height_in?: number) {
  if (!width_in && !height_in) return '—'
  const parts = []
  if (width_in) parts.push(`${width_in}"W`)
  if (height_in) parts.push(`${height_in}"H`)
  return parts.join(' × ')
}

export async function GET(request: NextRequest) {
  const estimateId = request.nextUrl.searchParams.get('id')
  if (!estimateId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const admin = createServiceClient()

    const { data: est, error: estError } = await admin
      .from('estimates')
      .select('id, estimate_number, client_name, client_email, client_phone, client_address, tier, subtotal, tax_rate, tax_amount, total, pricing_mode, user_id, created_at')
      .eq('id', estimateId)
      .single()

    if (!est) return NextResponse.json({ error: 'Estimate not found', dbError: estError?.message }, { status: 404 })

    const [{ data: openings }, { data: prof }] = await Promise.all([
      admin.from('estimate_openings')
        .select('id, type, qty, width_in, height_in, room, total_cost, install')
        .eq('estimate_id', estimateId)
        .order('sort_order'),
      admin.from('profiles')
        .select('company_name, email, phone, signature_url, pricing_mode')
        .eq('id', est.user_id)
        .single(),
    ])

    const clientSlug = (est.client_name || 'Client')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'Client'
    const dateStr = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.created_at))

    const openingRows = (openings || []).map(op => `
      <tr>
        <td>${OPENING_NAMES[op.type] || op.type}</td>
        <td>${op.room || '—'}</td>
        <td style="text-align:center">${op.qty}</td>
        <td>${sizeLabel(op.width_in, op.height_in)}</td>
        <td style="text-align:right">${fmtCAD(op.total_cost)}</td>
      </tr>
    `).join('')

    const tierRow = (prof?.pricing_mode === 'gbb' || est.pricing_mode === 'gbb') && est.tier
      ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#1D4ED8;">
           <strong>Selected Tier:</strong> ${est.tier.charAt(0).toUpperCase() + est.tier.slice(1)}
         </div>`
      : ''

    const taxRow = (est.tax_rate || 0) > 0
      ? `<tr><td style="color:#64748B">Tax (${Math.round((est.tax_rate || 0) * 100)}%)</td><td style="text-align:right;color:#64748B">${fmtCAD(est.tax_amount || 0)}</td></tr>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 13px; color: #0A0E1A; background: #fff; }
  .header { background: linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%); color: #fff; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 2px; }
  .header-left p { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .est-num { font-size: 16px; font-weight: 600; color: #fff; }
  .header-right .est-date { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 4px; }
  .body { padding: 28px 32px; }
  .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94A3B8; margin-bottom: 8px; }
  .client-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; }
  .client-name { font-size: 15px; font-weight: 700; color: #0A0E1A; margin-bottom: 6px; }
  .client-detail { font-size: 12px; color: #64748B; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #0A0E1A; color: #fff; }
  thead th { padding: 9px 12px; font-size: 11px; font-weight: 600; text-align: left; letter-spacing: 0.04em; }
  thead th:last-child { text-align: right; }
  thead th:nth-child(3) { text-align: center; }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  tbody td { padding: 9px 12px; font-size: 12px; color: #374151; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
  .totals-table { width: 280px; margin-left: auto; border-collapse: collapse; margin-bottom: 0; }
  .totals-table td { padding: 6px 0; font-size: 13px; }
  .totals-table td:last-child { text-align: right; }
  .totals-table .total-row td { font-size: 16px; font-weight: 700; color: #2563EB; border-top: 2px solid #E2E8F0; padding-top: 10px; }
  .footer { margin-top: 40px; padding: 16px 32px; border-top: 1px solid #E2E8F0; display: flex; justify-content: center; gap: 24px; font-size: 11px; color: #94A3B8; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${prof?.company_name || 'Company'}</h1>
      <p>Window &amp; Door Estimate</p>
    </div>
    <div class="header-right">
      <div class="est-num">${est.estimate_number}</div>
      <div class="est-date">${dateStr}</div>
    </div>
  </div>

  <div class="body">
    <div class="section-label">Client</div>
    <div class="client-card">
      <div class="client-name">${est.client_name || '—'}</div>
      <div class="client-detail">
        ${est.client_phone ? `<div>${est.client_phone}</div>` : ''}
        ${est.client_email ? `<div>${est.client_email}</div>` : ''}
        ${est.client_address ? `<div>${est.client_address}</div>` : ''}
      </div>
    </div>

    <div class="section-label">Openings</div>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Room</th>
          <th>Qty</th>
          <th>Size</th>
          <th style="text-align:right">Price</th>
        </tr>
      </thead>
      <tbody>
        ${openingRows || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px">No openings</td></tr>'}
      </tbody>
    </table>

    ${tierRow}

    <table class="totals-table">
      <tbody>
        <tr>
          <td style="color:#64748B">Subtotal</td>
          <td style="color:#64748B">${fmtCAD(est.subtotal || 0)}</td>
        </tr>
        ${taxRow}
        <tr class="total-row">
          <td>Total</td>
          <td>${fmtCAD(est.total || 0)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    ${[prof?.company_name, prof?.email, prof?.phone].filter(Boolean).join(' &nbsp;|&nbsp; ')}
  </div>
</body>
</html>`

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

    await page.setContent(html, { waitUntil: 'load' })

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
