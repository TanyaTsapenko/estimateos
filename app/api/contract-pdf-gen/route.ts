import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get('contractId')
  if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })

  try {
    const admin = createAdminClient()
    const { data: con } = await admin.from('contracts').select('*').eq('id', contractId).single()
    if (!con) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const profileId = (con.profile_id || '').toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

    const { data: authUser } = await admin.auth.admin.getUserById(profileId)
    const contractorEmail = authUser?.user?.email || ''

    const [{ data: est }, { data: ops }, { data: allProfiles }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', con.estimate_id).single(),
      admin.from('estimate_openings').select('id, type, qty, total_cost').eq('estimate_id', con.estimate_id).order('sort_order'),
      admin.from('profiles').select('id, company_name, first_name, last_name, city, province, phone, website, licence, insurance, logo_url, warranty_period, payment_terms, cancellation_policy, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager, address, postal_code'),
    ])

    const prof = allProfiles?.find((pr: any) => {
      const id = (pr.id || '').toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      return id === profileId
    }) || null

    const p = prof as any
    console.log('DEBUG profile_id:', con.profile_id, 'prof:', prof ? 'found' : 'null', 'company:', p?.company_name)
    const companyName = p?.company_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Your Contractor'
    const clientName = est?.client_name || con.client_name || '—'
    const signedDate = con.signed_at ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(con.signed_at)) : ''
    const total = est?.total || 0
    const tax = est?.tax_amount || 0
    const subtotal = est?.subtotal || (total - tax)
    const depositPct = con.deposit_percent || 0
    const depositAmt = Math.round(total * depositPct / 100)
    const balanceAmt = total - depositAmt

    const openingsRows = (ops || []).map((op: any, i: number) => {
      const typeName = OPENING_TYPES[op.type]?.name || op.type
      return `<tr style="border-bottom:${i < (ops || []).length - 1 ? '1px solid #F0F0F0' : 'none'}">
        <td style="padding:10px 0;font-size:13px;color:#0A0E1A;font-weight:600">${typeName} × ${op.qty}</td>
        <td style="padding:10px 0;font-size:13px;color:#0A0E1A;font-weight:600;text-align:right">${fmtCAD(op.total_cost)}</td>
      </tr>`
    }).join('')

    const selectedPaymentMethod = (con as any).payment_method || null
    const paymentMethodsArr: string[] = selectedPaymentMethod
      ? [selectedPaymentMethod]
      : (Array.isArray(p?.payment_methods) ? p.payment_methods : [])

    function clauseBlock(title: string, body: string | null): string {
      if (!body) return ''
      return `<div class="clause"><div class="clause-title">${title}</div><p>${body.replace(/\n/g, '<br>')}</p></div>`
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;font-size:13px}
  .hdr{background:#0A1628;padding:24px 40px;display:flex;justify-content:space-between;align-items:center}
  .hdr-kicker{font-size:10px;font-weight:600;color:rgba(255,255,255,.4);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
  .hdr-num{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px}
  .hdr-date{font-size:16px;font-weight:700;color:#fff}
  .body{padding:28px 40px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  .card{background:#F8F9FB;border:1px solid #E5E7EB;border-radius:8px;padding:14px}
  .card-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9CA3AF;margin-bottom:6px}
  .card-name{font-size:14px;font-weight:700;color:#0A1628;margin-bottom:3px}
  .card-sub{font-size:11px;color:#6B7280;line-height:1.6}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9CA3AF;margin-bottom:8px;margin-top:20px}
  .scope-card{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:4px}
  .item-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6}
  .item-name{font-size:13px;font-weight:700;color:#0A1628}
  .item-price{font-size:13px;font-weight:700;color:#0A1628}
  .totals{margin-top:12px;padding-top:12px;border-top:1px solid #E5E7EB}
  .tot-row{display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:3px}
  .tot-total{display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#0A1628;margin-top:8px;padding-top:8px;border-top:1.5px solid #0A1628}
  .tot-deposit{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#2563EB;margin-top:6px}
  .tot-balance{display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-top:3px}
  .terms-card{background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:4px}
  .check-row{display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:#374151;line-height:1.5;align-items:flex-start}
  .check-icon{display:inline-block;width:14px;height:14px;background:#EFF6FF;border-radius:3px;text-align:center;line-height:14px;font-size:9px;color:#2563EB;font-weight:700;margin-right:6px;vertical-align:middle}
  .clause{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #F3F4F6}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9CA3AF;margin-bottom:4px}
  .clause-text{font-size:12px;color:#374151;line-height:1.6}
  .payment-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
  .payment-pill{background:#EFF6FF;color:#1D4ED8;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .sig-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9CA3AF;margin-bottom:8px}
  .sig-img{height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:4px}
  .sig-line{height:56px;border-bottom:1.5px solid #0A1628;margin-bottom:4px}
  .sig-name{font-size:11px;color:#6B7280;margin-top:4px}
  .footer-bar{margin-top:24px;padding-top:12px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF}
  .clause{page-break-inside:avoid;break-inside:avoid}
  .card{page-break-inside:avoid;break-inside:avoid}
  .terms-card{page-break-inside:auto;break-inside:auto}
  .scope-card{page-break-inside:avoid;break-inside:avoid}
  .sig-grid{page-break-inside:avoid;break-inside:avoid}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="hdr-kicker">Contract</div>
    <div class="hdr-num">CON-${con.id.slice(0,6).toUpperCase()}</div>
  </div>
  <div style="text-align:right">
    <div class="hdr-kicker">${con.signed_at ? 'Signed' : 'Date'}</div>
    <div class="hdr-date">${signedDate}</div>
  </div>
</div>

<div class="body">

<div class="grid-2">
  <div class="card">
    <div class="card-label">Contractor</div>
    <div class="card-name">${companyName}</div>
    <div class="card-sub">
      ${p?.phone || ''}
      ${contractorEmail ? '<br>' + contractorEmail : ''}
      ${p?.address ? '<br>' + p.address : ''}
      ${(p?.city || p?.province) ? '<br>' + [p?.city, p?.province, p?.postal_code].filter(Boolean).join(', ') : ''}
      ${p?.website && p.website !== 'https://' ? '<br><a href="' + p.website + '" style="color:#2563EB">' + p.website.replace('https://','').replace('http://','') + '</a>' : ''}
    </div>
  </div>
  <div class="card">
    <div class="card-label">Client</div>
    <div class="card-name">${clientName}</div>
    <div class="card-sub">
      ${est?.client_phone || con.client_phone || ''}
      ${(est?.client_email || con.client_email) ? '<br>' + (est?.client_email || con.client_email) : ''}
      ${(est?.client_address || con.client_address) ? '<br>' + (est?.client_address || con.client_address) : ''}
      ${(est?.client_city || con.client_city) ? '<br>' + [est?.client_city || con.client_city, est?.client_province || con.client_province, est?.client_postal || con.client_postal].filter(Boolean).join(', ') : ''}
    </div>
  </div>
</div>

<div class="section-title">Scope of Work</div>
<div class="scope-card">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${openingsRows}
  </table>
  <div class="totals">
    <div class="tot-row"><span>Subtotal</span><span>${fmtCAD(subtotal)}</span></div>
    <div class="tot-row"><span>Tax</span><span>${fmtCAD(tax)}</span></div>
    <div class="tot-total"><span>Total</span><span>${fmtCAD(total)}</span></div>
    ${depositPct > 0 ? `
    <div class="tot-deposit"><span>Deposit on signing (${depositPct}%)</span><span>${fmtCAD(depositAmt)}</span></div>
    <div class="tot-balance"><span>Balance on completion</span><span>${fmtCAD(balanceAmt)}</span></div>
    ` : ''}
  </div>
</div>

<div class="section-title">Terms &amp; Conditions</div>
<div class="terms-card">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%"><tr><td style="width:20px;vertical-align:top;padding-top:1px"><span style="display:inline-block;width:14px;height:14px;background:#EFF6FF;border-radius:3px;text-align:center;vertical-align:middle"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,6 5,9 10,3" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td><td style="font-size:12px;color:#374151;line-height:1.5">Warranty: All materials and labour are warranted for ${p?.warranty_period || '1 year'} from installation date.</td></tr></table>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%"><tr><td style="width:20px;vertical-align:top;padding-top:1px"><span style="display:inline-block;width:14px;height:14px;background:#EFF6FF;border-radius:3px;text-align:center;vertical-align:middle"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,6 5,9 10,3" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td><td style="font-size:12px;color:#374151;line-height:1.5">Payment: ${p?.payment_terms || 'Upon completion'}</td></tr></table>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%"><tr><td style="width:20px;vertical-align:top;padding-top:1px"><span style="display:inline-block;width:14px;height:14px;background:#EFF6FF;border-radius:3px;text-align:center;vertical-align:middle"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,6 5,9 10,3" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td><td style="font-size:12px;color:#374151;line-height:1.5">Cancellation: ${p?.cancellation_policy || 'Either party may cancel with 72 hours written notice prior to the scheduled start date.'}</td></tr></table>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%"><tr><td style="width:20px;vertical-align:top;padding-top:1px"><span style="display:inline-block;width:14px;height:14px;background:#EFF6FF;border-radius:3px;text-align:center;vertical-align:middle"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,6 5,9 10,3" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td><td style="font-size:12px;color:#374151;line-height:1.5">Access: Client agrees to provide reasonable access to the property on scheduled installation day.</td></tr></table>
</div>

${p?.completion_timeframe || p?.customer_responsibilities || p?.buyer_right_to_cancel || p?.damage_disclaimer || p?.permits_responsibility || paymentMethodsArr.length > 0 ? `
<div class="section-title">Contract Details</div>
<div class="terms-card">
  ${clauseBlock('Completion Timeframe', p?.completion_timeframe)}
  ${paymentMethodsArr.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${paymentMethodsArr.map((m: string) => `<span class="payment-pill">${m.trim()}</span>`).join('')}</div></div>` : ''}
  ${clauseBlock('Customer Responsibilities', p?.customer_responsibilities)}
  ${clauseBlock("Buyer's Right to Cancel", p?.buyer_right_to_cancel)}
  ${clauseBlock('Damage Disclaimer', p?.damage_disclaimer)}
  ${clauseBlock('Permits Responsibility', p?.permits_responsibility)}
</div>
` : ''}

<div class="section-title">Signatures</div>
<div class="terms-card">
  <div class="sig-grid">
    <div>
      <div class="sig-label">Contractor</div>
      ${con.contractor_signature_url ? `<img src="${con.contractor_signature_url}" class="sig-img" crossorigin="anonymous" />` : '<div class="sig-line"></div>'}
      <div style="border-bottom:1.5px solid #0A1628;margin-bottom:4px"></div>
      <div class="sig-name">${companyName}</div>
      <div class="sig-name">${signedDate}</div>
    </div>
    <div>
      <div class="sig-label">Client</div>
      ${con.client_signature_url ? `<img src="${con.client_signature_url}" class="sig-img" crossorigin="anonymous" />` : '<div class="sig-line"></div>'}
      <div style="border-bottom:1.5px solid #0A1628;margin-bottom:4px"></div>
      <div class="sig-name">${clientName}</div>
      <div class="sig-name">${signedDate}</div>
    </div>
  </div>
</div>

<div class="footer-bar">
  <span>${companyName}</span>
  <span>Powered by ApexScale · useapexscale.com</span>
</div>

</div>
</body>
</html>`

    const chromium = await import('@sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const executablePath = await chromium.default.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
    )

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' as any })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${con.id.slice(0,6).toUpperCase()}-${clientName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      },
    })

  } catch (err: any) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
