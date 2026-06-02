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

    const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', con.estimate_id).single(),
      admin.from('estimate_openings').select('id, type, qty, total_cost').eq('estimate_id', con.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, city, province, phone, website, licence, insurance, logo_url, warranty_period, payment_terms, cancellation_policy, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager').eq('id', con.profile_id).single(),
    ])

    const p = prof as any
    const companyName = p?.company_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Your Contractor'
    const clientName = est?.client_name || '—'
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

    const paymentMethodsArr: string[] = Array.isArray(p?.payment_methods) ? p.payment_methods : []

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
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;padding:40px 48px;max-width:720px;margin:0 auto;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #E0E0E0;margin-bottom:24px}
  .logo-text{font-size:18px;font-weight:800;color:#1A1A1A}
  .logo-text span{color:#2563EB}
  .company-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px}
  .doc-title{font-size:20px;font-weight:800;color:#1A1A1A;text-align:right}
  .doc-sub{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6;text-align:right}
  .signed-badge{display:inline-block;background:#DCFCE7;color:#16A34A;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;margin-top:6px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px;margin-top:20px}
  .card{background:#fff;border:1px solid #E8E8E8;border-radius:8px;padding:14px;margin-bottom:14px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
  .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94A3B8;margin-bottom:4px}
  .info-val{font-size:13px;font-weight:600;color:#0A1628}
  .info-sub{font-size:11px;color:#6b7280;margin-top:2px}
  .totals-row{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:3px}
  .totals-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#0A1628;margin-top:8px;padding-top:8px;border-top:1px solid #E0E0E0}
  .deposit-row{display:flex;justify-content:space-between;font-size:12px;color:#2563EB;margin-top:4px;font-weight:600}
  .clause{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F0F0F0}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:4px}
  .clause p{font-size:12px;color:#353A3E;line-height:1.6}
  .check-row{display:flex;gap:8px;margin-bottom:6px;font-size:12px;color:#353A3E;line-height:1.5}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:20px;padding-top:16px;border-top:2px solid #E0E0E0}
  .sig-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin-bottom:6px}
  .sig-img{height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:4px}
  .sig-line{border-bottom:1.5px solid #0A0E1A;margin-bottom:4px;height:56px}
  .sig-name{font-size:11px;color:#6b7280}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between}
  .payment-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .payment-pill{background:#EEF2FF;color:#2045B8;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600}
</style>
</head>
<body>
<div style="background:#0A1628;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;margin:-40px -48px 32px">
  <div>
    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">CONTRACT</div>
    <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.3px">CON-${con.id.slice(0,6).toUpperCase()}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">${con.signed_at ? 'SIGNED' : 'DATE'}</div>
    <div style="font-size:18px;font-weight:700;color:#ffffff">${signedDate}</div>
  </div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="info-label">Contractor</div>
    <div class="info-val">${companyName}</div>
    <div class="info-sub">${p?.phone || ''}</div>
  </div>
  <div class="card">
    <div class="info-label">Client</div>
    <div class="info-val">${clientName}</div>
    <div class="info-sub">${con.client_email || ''}</div>
    <div class="info-sub">${con.client_phone || ''}</div>
    <div class="info-sub">${con.client_address || ''}</div>
  </div>
</div>

<div class="section-title">Scope of Work</div>
<div class="card">
  <table width="100%" cellpadding="0" cellspacing="0">${openingsRows}</table>
  <div style="margin-top:10px">
    <div class="totals-row"><span>Subtotal</span><span>${fmtCAD(subtotal)}</span></div>
    <div class="totals-row"><span>Tax</span><span>${fmtCAD(tax)}</span></div>
    <div class="totals-total"><span>Total</span><span style="color:#2563EB">${fmtCAD(total)}</span></div>
    ${depositPct > 0 ? `<div class="deposit-row"><span>Deposit on signing (${depositPct}%)</span><span>${fmtCAD(depositAmt)}</span></div><div class="totals-row"><span>Balance on completion</span><span>${fmtCAD(balanceAmt)}</span></div>` : ''}
  </div>
</div>

<div class="section-title">Terms & Conditions</div>
<div class="card">
  <div class="check-row"><span>✓</span><span>Warranty: All materials and labour are warranted for ${p?.warranty_period || '1 year'} from installation date.</span></div>
  <div class="check-row"><span>✓</span><span>Payment: ${p?.payment_terms || 'Upon completion'}</span></div>
  <div class="check-row"><span>✓</span><span>Cancellation: ${p?.cancellation_policy || 'Either party may cancel with 72 hours written notice prior to the scheduled start date.'}</span></div>
  <div class="check-row"><span>✓</span><span>Access: Client agrees to provide reasonable access to the property on scheduled installation day.</span></div>
</div>

<div class="section-title">Contract Details</div>
<div class="card">
  ${clauseBlock('Completion Timeframe', p?.completion_timeframe)}
  ${paymentMethodsArr.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${paymentMethodsArr.map((m: string) => `<span class="payment-pill">${m.trim()}</span>`).join('')}</div></div>` : ''}
  ${clauseBlock('Customer Responsibilities', p?.customer_responsibilities)}
  ${clauseBlock("Buyer's Right to Cancel", p?.buyer_right_to_cancel)}
  ${clauseBlock('Damage Disclaimer', p?.damage_disclaimer)}
  ${clauseBlock('Permits Responsibility', p?.permits_responsibility)}
  ${p?.project_manager ? `<div class="clause"><div class="clause-title">Project Manager</div><p style="font-weight:600;color:#0A1628">${p.project_manager}</p></div>` : ''}
</div>

<div class="section-title">Signatures</div>
<div class="card">
  <div class="sig-grid">
    <div>
      <div class="sig-label">Contractor</div>
      ${con.contractor_signature_url ? `<img src="${con.contractor_signature_url}" class="sig-img" crossorigin="anonymous" />` : '<div class="sig-line"></div>'}
      <div style="border-bottom:1.5px solid #0A0E1A;margin-bottom:4px"></div>
      <div class="sig-name">${companyName}</div>
      <div class="sig-name">${signedDate}</div>
    </div>
    <div>
      <div class="sig-label">Client</div>
      ${con.client_signature_url ? `<img src="${con.client_signature_url}" class="sig-img" crossorigin="anonymous" />` : '<div class="sig-line"></div>'}
      <div style="border-bottom:1.5px solid #0A0E1A;margin-bottom:4px"></div>
      <div class="sig-name">${clientName}</div>
      <div class="sig-name">${signedDate}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>${companyName}</span>
  <span>Powered by ApexScale · useapexscale.com</span>
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
