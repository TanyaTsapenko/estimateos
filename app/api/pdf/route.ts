import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
  if (!est) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ops } = await supabase.from('estimate_openings')
    .select('*').eq('estimate_id', id).order('sort_order')

  const { data: prof } = await supabase.from('profiles')
    .select('company_name, city, province, phone, website, licence, insurance')
    .eq('id', est.user_id).single()

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1A1A1A;padding:40px;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #E0E0E0}
  .logo{font-size:22px;font-weight:800;color:#1A1A1A}
  .logo span{color:#D97706}
  .company{font-size:12px;color:#6b7280;margin-top:4px}
  .est-no{text-align:right}
  .est-no .num{font-size:20px;font-weight:700;color:#D97706}
  .est-no .date{font-size:11px;color:#6b7280;margin-top:2px}
  .section{margin-bottom:24px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#BFBFBF;margin-bottom:8px}
  .client-name{font-size:16px;font-weight:700;color:#1A1A1A}
  .client-detail{font-size:12px;color:#6b7280;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#BFBFBF;text-align:left;padding:6px 0;border-bottom:1px solid #E0E0E0}
  td{font-size:12px;padding:8px 0;border-bottom:1px solid #F5F5F5;vertical-align:top}
  .total-section{background:#F5F5F5;border-radius:8px;padding:16px;margin-top:8px}
  .total-row{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px}
  .total-final{display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#1A1A1A;margin-top:8px;padding-top:8px;border-top:1px solid #D0D0D0}
  .total-final span:last-child{color:#D97706}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;text-align:center}
  .scope{background:#F5F5F5;border-radius:8px;padding:12px;font-size:12px;color:#6b7280;line-height:1.6}
  .sig-section{margin-top:32px;display:flex;gap:40px}
  .sig-box{flex:1;border-top:1px solid #1A1A1A;padding-top:8px;font-size:10px;color:#6b7280}
  .badge{display:inline-block;background:#FEF3C7;color:#92400E;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Estimate<span>OS</span></div>
    <div class="company">${prof?.company_name || 'Contractor'}<br>${prof?.city || ''} ${prof?.province || ''}<br>${prof?.phone || ''}</div>
  </div>
  <div class="est-no">
    <div class="num">${est.estimate_number}</div>
    <div class="date">Created: ${new Date(est.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div class="date">Valid until: ${est.valid_until || '30 days'}</div>
    <div style="margin-top:6px"><span class="badge">${(est.tier || 'better').toUpperCase()} PACKAGE</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Prepared for</div>
  <div class="client-name">${est.client_name || 'Client'}</div>
  ${est.client_email ? `<div class="client-detail">${est.client_email}</div>` : ''}
  ${est.client_phone ? `<div class="client-detail">${est.client_phone}</div>` : ''}
  ${est.client_address ? `<div class="client-detail">${est.client_address}${est.client_city ? `, ${est.client_city}` : ''}</div>` : ''}
</div>

${est.scope_notes ? `
<div class="section">
  <div class="section-title">Scope of work</div>
  <div class="scope">${est.scope_notes}</div>
</div>` : ''}

<div class="section">
  <div class="section-title">Line items</div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${(ops || []).map(op => `
      <tr>
        <td>${OPENING_TYPES[op.type]?.name || op.type}${op.room ? ` — ${op.room}` : ''}</td>
        <td>${op.qty}</td>
        <td style="text-align:right;font-weight:600">${fmtCAD(op.total_cost)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="total-section">
    <div class="total-row"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
    <div class="total-row"><span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span></div>
    <div class="total-final"><span>Total</span><span>${fmtCAD(est.total)}</span></div>
  </div>
</div>

${est.status === 'signed' ? `
<div class="sig-section">
  <div class="sig-box">
    <div>Client: ${est.client_name || ''}</div>
    <div style="margin-top:4px">Date: ${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA') : ''}</div>
    ${est.client_signature_url && !est.client_signature_url.startsWith('data:') ? `<img src="${est.client_signature_url}" style="max-height:50px;margin-top:4px" />` : ''}
  </div>
  <div class="sig-box">
    <div>Contractor: ${prof?.company_name || ''}</div>
    <div style="margin-top:4px">Date: ${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA') : ''}</div>
  </div>
</div>` : ''}

<div class="footer">
  Generated by EstimateOS · ${prof?.company_name || ''}
  ${prof?.licence ? ` · Lic. ${prof.licence}` : ''}
  ${prof?.insurance ? ` · Ins. ${prof.insurance}` : ''}
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${est.estimate_number}.html"`,
    },
  })
}
