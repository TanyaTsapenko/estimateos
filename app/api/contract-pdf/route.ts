import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get('contractId')

  // ── Signed contract view (public, by contractId) ──────────────────────────
  if (contractId) {
    const admin = createAdminClient()
    const { data: con } = await admin.from('contracts').select('*').eq('id', contractId).single()
    if (!con) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', con.estimate_id).single(),
      admin.from('estimate_openings').select('id, type, qty, total_cost').eq('estimate_id', con.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, city, province, phone, website, licence, insurance, logo_url, warranty_period, payment_terms, cancellation_policy, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager, contract_clauses').eq('id', con.profile_id).single(),
    ])

    if (!est) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const p = prof as any
    const companyName = p?.company_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Contractor'
    const location = [p?.city, p?.province].filter(Boolean).join(', ')
    const conDisplayId = 'CON-' + con.id.slice(0, 6).toUpperCase()

    const createdFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(con.created_at))
    const signedFmt = con.signed_at
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(con.signed_at))
      : '—'

    const openingRows = (ops || []).map((op: any, i: number) =>
      `<tr style="border-bottom:${i < (ops || []).length - 1 ? '1px solid #F0F0F0' : 'none'}">
        <td style="padding:7px 0;font-size:13px;color:#0A0E1A;font-weight:600">${OPENING_TYPES[op.type]?.name || op.type} × ${op.qty}</td>
        <td style="padding:7px 0;font-size:13px;color:#0A0E1A;font-weight:600;text-align:right">${fmtCAD(op.total_cost)}</td>
      </tr>`
    ).join('')

    function clauseBlock(title: string, body: string | null): string {
      if (!body) return ''
      return `<div class="clause"><div class="clause-title">${title}</div><p>${body.replace(/\n/g, '<br>')}</p></div>`
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Signed Contract — ${conDisplayId}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;padding:48px 56px;max-width:780px;margin:0 auto}
  .print-bar{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:8px;padding:10px 16px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#2045B8;font-weight:600}
  .print-bar button{background:#3B6CFF;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #E0E0E0;margin-bottom:28px}
  .logo-img{max-height:64px;max-width:160px;object-fit:contain}
  .logo-text{font-size:20px;font-weight:800;color:#1A1A1A}
  .logo-text span{color:#3B6CFF}
  .company-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px}
  .doc-info{text-align:right}
  .doc-title{font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-.02em}
  .doc-sub{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6}
  .signed-badge{display:inline-block;background:#DCFCE7;color:#16A34A;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;margin-top:6px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px}
  .card{background:#fff;border:1px solid #E8E8E8;border-radius:10px;padding:16px;margin-bottom:16px}
  .summary-row{font-size:13px;color:#6b7280;margin-bottom:4px}
  .total-amount{font-size:22px;font-weight:700;color:#2045B8;margin-top:8px}
  .totals-row{display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px}
  .totals-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#0A0E1A;margin-top:8px;padding-top:8px;border-top:1px solid #E0E0E0}
  .divider{height:1px;background:#E0E0E0;margin:20px 0}
  .clause{margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #F0F0F0}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:6px}
  .clause p{font-size:12px;color:#353A3E;line-height:1.65;margin:0}
  .payment-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .payment-pill{background:#EEF2FF;color:#2045B8;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600}
  .check-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:12px;color:#353A3E;line-height:1.55}
  .check-icon{width:16px;height:16px;background:#EEF2FF;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:1px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px;padding-top:20px;border-top:2px solid #E0E0E0}
  .sig-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin-bottom:8px}
  .sig-img{height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px}
  .sig-line{border-bottom:1.5px solid #0A0E1A;margin-bottom:6px;height:64px}
  .sig-name{font-size:11px;color:#6b7280}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between}
  @media print{.print-bar{display:none}body{padding:32px 40px}}
</style>
</head>
<body>
<div class="print-bar">
  Signed Contract — ${conDisplayId} · ${signedFmt}
  <button onclick="window.print()">🖨️ Print / Save PDF</button>
</div>

<div class="header">
  <div>
    ${p?.logo_url ? `<img src="${p.logo_url}" alt="${companyName}" class="logo-img" />` : `<div class="logo-text">Apex<span>Scale</span></div>`}
    <div class="company-meta">${companyName}${location ? `<br>${location}` : ''}${p?.phone ? `<br>${p.phone}` : ''}${p?.website ? `<br>${p.website}` : ''}${p?.licence ? `<br>Lic. ${p.licence}` : ''}${p?.insurance ? `<br>Ins. ${p.insurance}` : ''}</div>
  </div>
  <div class="doc-info">
    <div class="doc-title">Signed Contract</div>
    <div class="doc-sub">${conDisplayId}<br>${est.estimate_number}</div>
    <div class="signed-badge">✓ Signed ${signedFmt}</div>
  </div>
</div>

<!-- Summary -->
<div class="card">
  <div class="summary-row">From: <strong style="color:#0A0E1A">${con.company_name || companyName}</strong></div>
  <div class="summary-row">To: <strong style="color:#0A0E1A">${est.client_name || '—'}</strong></div>
  ${est.client_email ? `<div class="summary-row" style="margin-top:2px;font-size:12px">${est.client_email}${est.client_phone ? ` · ${est.client_phone}` : ''}</div>` : ''}
  <div class="total-amount">${fmtCAD(est.total)}</div>
</div>

<!-- Scope of Work -->
<div class="section-title">Scope of Work</div>
<div class="card">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${openingRows}
  </table>
  <div class="divider"></div>
  <div class="totals-row"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
  ${est.discount_amount > 0 ? `<div class="totals-row" style="color:#16a34a"><span>Discount</span><span>−${fmtCAD(est.discount_amount)}</span></div>` : ''}
  <div class="totals-row"><span>Tax</span><span>${fmtCAD(est.tax_amount)}</span></div>
  <div class="totals-total"><span>Total</span><span style="color:#2045B8">${fmtCAD(est.total)}</span></div>
</div>

<!-- Terms & Conditions -->
${(() => {
  const clauses: any[] = p?.contract_clauses ? (() => { try { return JSON.parse(p.contract_clauses) } catch { return [] } })() : []
  const enabledClauses = clauses.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
  if (enabledClauses.length === 0) return ''
  return `<div style="margin-bottom: 24px;">
  <h2 style="font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">Terms &amp; Conditions</h2>
  ${enabledClauses.map((c: any) => `<div style="display: flex; gap: 8px; margin-bottom: 8px;">
      <div style="width: 16px; height: 16px; border-radius: 50%; background: #EEF2FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
        <svg width="9" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="#2045B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">${c.title}</div>
        <div style="font-size: 12px; color: #353A3E; line-height: 1.6;">${c.content.replace(/\n/g, '<br>')}</div>
      </div>
    </div>`).join('')}
</div>`
})()}

${(() => {
  if (!p?.warranty_period && !p?.payment_terms && !p?.completion_timeframe && !(p?.payment_methods && p.payment_methods.length > 0) && !p?.project_manager) return ''
  return `<div class="section-title">Contract Details</div>
<div class="card">
  ${p?.warranty_period ? clauseBlock('Warranty Period', p.warranty_period) : ''}
  ${p?.payment_terms ? clauseBlock('Payment Terms', p.payment_terms) : ''}
  ${p?.completion_timeframe ? clauseBlock('Completion Timeframe', p.completion_timeframe) : ''}
  ${p?.payment_methods && p.payment_methods.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${p.payment_methods.map((m: string) => `<span class="payment-pill">${m}</span>`).join('')}</div></div>` : ''}
  ${p?.project_manager ? `<div class="clause"><div class="clause-title">Project Manager</div><p style="font-weight:600;color:#0A1628">${p.project_manager}</p></div>` : ''}
</div>`
})()}

<!-- Signatures -->
<div class="section-title">Signatures</div>
<div class="card">
  <div class="sig-grid">
    <div>
      <div class="sig-label">Contractor</div>
      ${con.contractor_signature_url ? `<img src="${con.contractor_signature_url}" class="sig-img" crossorigin="anonymous" />` : `<div class="sig-line"></div>`}
      <div style="border-bottom:1.5px solid #0A0E1A;margin-bottom:6px"></div>
      <div class="sig-name">${con.company_name || companyName}</div>
      <div class="sig-name">${createdFmt}</div>
    </div>
    <div>
      <div class="sig-label">Client</div>
      ${con.client_signature_url ? `<img src="${con.client_signature_url}" class="sig-img" crossorigin="anonymous" />` : `<div class="sig-line"></div>`}
      <div style="border-bottom:1.5px solid #0A0E1A;margin-bottom:6px"></div>
      <div class="sig-name">${est.client_name || '—'}</div>
      <div class="sig-name">${signedFmt}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>${companyName}${p?.licence ? ` · Lic. ${p.licence}` : ''}</span>
  <span>Powered by ApexScale &middot; useapexscale.com</span>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  // ── Profile contract terms (authenticated) ────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, city, province, phone, website, licence, insurance, logo_url, contract_terms, signature_url, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager, contract_clauses')
    .eq('id', user.id)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const contractText = prof.contract_terms?.trim()
  const companyName = prof.company_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Your Company'
  const location = [prof.city, prof.province].filter(Boolean).join(', ')
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  const paragraphs = contractText
    ? contractText.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean)
    : []

  const p = prof as any
  const completionTimeframe: string | null = p?.completion_timeframe || null
  const paymentMethods: string[] = p?.payment_methods || []
  const customerResponsibilities: string | null = p?.customer_responsibilities || null
  const buyerRightToCancel: string | null = p?.buyer_right_to_cancel || null
  const damageDisclaimer: string | null = p?.damage_disclaimer || null
  const permitsResponsibility: string | null = p?.permits_responsibility || null
  const projectManager: string | null = p?.project_manager || null

  function clauseBlock(title: string, body: string | null): string {
    if (!body) return ''
    return `<div class="clause"><div class="clause-title">${title}</div><p>${body.replace(/\n/g, '<br>')}</p></div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contract Terms — ${companyName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;padding:48px 56px;max-width:780px;margin:0 auto}
  .print-bar{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:8px;padding:10px 16px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#2045B8;font-weight:600}
  .print-bar button{background:#3B6CFF;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #E0E0E0;margin-bottom:32px}
  .logo-img{max-height:64px;max-width:160px;object-fit:contain}
  .logo-text{font-size:20px;font-weight:800;color:#1A1A1A}
  .logo-text span{color:#3B6CFF}
  .company-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px}
  .doc-info{text-align:right}
  .doc-title{font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-.02em}
  .doc-sub{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6}
  .doc-date{font-size:10px;color:#BFBFBF;margin-top:8px}
  .divider{height:1px;background:#E0E0E0;margin:24px 0}
  .body-section{margin-bottom:28px}
  .body-section p{font-size:13px;color:#374151;line-height:1.8;margin-bottom:14px}
  .body-section p:last-child{margin-bottom:0}
  .empty-state{border:2px dashed #E0E0E0;border-radius:10px;padding:40px;text-align:center;color:#BFBFBF;font-size:13px}
  .clause{margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid #F0F0F0}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:6px}
  .payment-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .payment-pill{background:#EEF2FF;color:#2045B8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600}
  .sig-section{display:flex;gap:48px;margin-top:48px;padding-top:24px;border-top:2px solid #E0E0E0}
  .sig-box{flex:1}
  .sig-line{border-bottom:1px solid #1A1A1A;height:48px;margin-bottom:8px}
  .sig-label{font-size:10px;color:#6b7280;line-height:1.5}
  .sig-name{font-size:12px;font-weight:700;color:#1A1A1A}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between}
  @media print{
    .print-bar{display:none}
    body{padding:32px 40px}
  }
</style>
</head>
<body>

<div class="print-bar">
  📄 To save as PDF: click Print below, then choose "Save as PDF"
  <button onclick="window.print()">🖨️ Print / Save PDF</button>
</div>

<div class="header">
  <div>
    ${prof.logo_url
      ? `<img src="${prof.logo_url}" alt="${companyName}" class="logo-img" />`
      : `<div class="logo-text">Apex<span>Scale</span></div>`}
    <div class="company-meta">
      ${companyName}${location ? `<br>${location}` : ''}${prof.phone ? `<br>${prof.phone}` : ''}${prof.website ? `<br>${prof.website}` : ''}${prof.licence ? `<br>Lic. ${prof.licence}` : ''}${prof.insurance ? `<br>Ins. ${prof.insurance}` : ''}
    </div>
  </div>
  <div class="doc-info">
    <div class="doc-title">Contract Terms</div>
    <div class="doc-sub">${companyName}<br>Standard Terms &amp; Conditions</div>
    <div class="doc-date">Generated ${today}</div>
  </div>
</div>

${(() => {
  const clauses2: any[] = p?.contract_clauses ? (() => { try { return JSON.parse(p.contract_clauses) } catch { return [] } })() : []
  const enabledClauses2 = clauses2.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
  if (enabledClauses2.length === 0) return ''
  return `<div style="margin-bottom: 24px;">
  <h2 style="font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">Terms &amp; Conditions</h2>
  ${enabledClauses2.map((c: any) => `<div style="display: flex; gap: 8px; margin-bottom: 8px;">
    <div style="width: 16px; height: 16px; border-radius: 50%; background: #EEF2FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
      <svg width="9" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#2045B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">${c.title}</div>
      <div style="font-size: 12px; color: #353A3E; line-height: 1.6;">${c.content.replace(/\n/g, '<br>')}</div>
    </div>
  </div>`).join('')}
</div>`
})()}

${(() => {
  const warrantyPeriod2: string | null = p?.warranty_period || null
  const paymentTerms2: string | null = p?.payment_terms || null
  if (!warrantyPeriod2 && !paymentTerms2 && !completionTimeframe && paymentMethods.length === 0 && !projectManager) return ''
  return `<div class="divider"></div>
<div class="body-section">
  ${warrantyPeriod2 ? `${clauseBlock('Warranty Period', warrantyPeriod2)}` : ''}
  ${paymentTerms2 ? `${clauseBlock('Payment Terms', paymentTerms2)}` : ''}
  ${completionTimeframe ? `${clauseBlock('Completion Timeframe', completionTimeframe)}` : ''}
  ${paymentMethods.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${paymentMethods.map((m: string) => `<span class="payment-pill">${m}</span>`).join('')}</div></div>` : ''}
  ${projectManager ? `<div class="clause"><div class="clause-title">Project Manager</div><p style="font-weight:600;color:#0A1628">${projectManager}</p></div>` : ''}
</div>`
})()}

<div class="divider"></div>

<div class="sig-section">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${companyName}</div>
    <div class="sig-label">Contractor signature &amp; date</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-label">Client signature, printed name &amp; date</div>
  </div>
</div>

${(prof as any)?.signature_url ? `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0">
  <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Authorized by</div>
  <img src="${(prof as any).signature_url}" style="max-height:50px;max-width:180px;object-fit:contain" alt="Contractor signature" />
  <div style="font-size:12px;color:#475569;margin-top:6px">${companyName || ''}</div>
</div>` : ''}

<div class="footer">
  <span>${companyName}${prof.licence ? ` · Lic. ${prof.licence}` : ''}${prof.insurance ? ` · Ins. ${prof.insurance}` : ''}</span>
  <span style="font-size:10px;color:#CBD5E1">Powered by ApexScale &middot; useapexscale.com</span>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
