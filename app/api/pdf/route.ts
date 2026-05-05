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
  body{font-family:Arial,sans-serif;color:#1A1A1A;background:#fff}
  .header{background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);padding:32px 40px;margin-bottom:32px}
  .header-inner{display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:22px;font-weight:800;color:#fff}
  .logo span{color:#3B6CFF}
  .company{font-size:11px;color:rgba(255,255,255,.55);margin-top:5px;line-height:1.6}
  .est-no{text-align:right}
  .est-no .num{font-size:22px;font-weight:800;color:#3B6CFF}
  .est-no .date{font-size:11px;color:rgba(255,255,255,.55);margin-top:3px}
  .badge{display:inline-block;background:rgba(59,108,255,.2);color:#9BB4FF;font-size:9px;font-weight:700;padding:3px 9px;border-radius:5px;margin-top:6px;letter-spacing:.06em}
  .body{padding:0 40px 40px}
  .section{margin-bottom:24px}
  .section-title{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#BFBFBF;margin-bottom:8px}
  .party-card{display:flex;gap:16px;margin-bottom:24px}
  .party-box{flex:1;background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:14px}
  .party-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:6px}
  .party-name{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:2px}
  .party-detail{font-size:11px;color:#6b7280;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#BFBFBF;text-align:left;padding:7px 0;border-bottom:1.5px solid #E0E0E0}
  td{font-size:12px;padding:9px 0;border-bottom:1px solid #F0F0F0;vertical-align:top}
  .item-icon{display:inline-block;background:#EEF2FF;color:#2045B8;font-size:11px;padding:2px 7px;border-radius:5px;margin-right:4px}
  .total-section{background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:16px;margin-top:4px}
  .total-row{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px}
  .total-final{display:flex;justify-content:space-between;align-items:center;font-weight:800;margin-top:10px;padding-top:10px;border-top:1.5px solid #1A2744}
  .total-final .label{font-size:13px;color:#1A1A1A}
  .total-final .amount{font-size:22px;color:#2045B8}
  .scope{background:#F4F5F7;border:1px solid #E0E0E0;border-radius:8px;padding:12px;font-size:12px;color:#6b7280;line-height:1.6}
  .sig-section{margin-top:32px;display:flex;gap:24px}
  .sig-box{flex:1;border-top:2px solid #1A2744;padding-top:10px;font-size:10px;color:#6b7280}
  .sig-label{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2045B8;margin-bottom:4px}
  .footer{margin-top:32px;padding:16px 40px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;text-align:center;background:#FAFAFA}
</style>
</head>
<body>
<div class="header">
  <div class="header-inner">
    <div>
      <div class="logo">Estimate<span>OS</span></div>
      <div class="company">${prof?.company_name || 'Contractor'}<br>${[prof?.city, prof?.province].filter(Boolean).join(', ')}<br>${prof?.phone || ''}</div>
    </div>
    <div class="est-no">
      <div class="num">${est.estimate_number}</div>
      <div class="date">Created: ${new Date(est.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="date">Valid until: ${est.valid_until || '30 days'}</div>
      <div><span class="badge">${(est.tier || 'better').toUpperCase()} PACKAGE</span></div>
    </div>
  </div>
</div>

<div class="body">
  <div class="party-card">
    <div class="party-box">
      <div class="party-label">Prepared by</div>
      <div class="party-name">${prof?.company_name || 'Contractor'}</div>
      <div class="party-detail">${prof?.phone || ''}${prof?.website ? '<br>' + prof.website : ''}${prof?.licence ? '<br>Lic. ' + prof.licence : ''}</div>
    </div>
    <div class="party-box">
      <div class="party-label">Prepared for</div>
      <div class="party-name">${est.client_name || 'Client'}</div>
      <div class="party-detail">${est.client_email || ''}${est.client_phone ? '<br>' + est.client_phone : ''}${est.client_address ? '<br>' + est.client_address + (est.client_city ? ', ' + est.client_city : '') : ''}</div>
    </div>
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
          <td><span class="item-icon">${OPENING_TYPES[op.type]?.icon || ''}</span>${OPENING_TYPES[op.type]?.name || op.type}${op.room ? ` <span style="color:#9ca3af">— ${op.room}</span>` : ''}</td>
          <td style="color:#6b7280">${op.qty}</td>
          <td style="text-align:right;font-weight:700;color:#1A1A1A">${fmtCAD(op.total_cost)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="total-section">
      <div class="total-row"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
      <div class="total-row"><span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span></div>
      <div class="total-final"><span class="label">Total</span><span class="amount">${fmtCAD(est.total)}</span></div>
    </div>
  </div>

${est.status === 'signed' ? `
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Client signature</div>
      <div>${est.client_name || ''}</div>
      <div style="margin-top:3px;color:#9ca3af">Date: ${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA') : ''}</div>
      ${est.client_signature_url && !est.client_signature_url.startsWith('data:') ? `<img src="${est.client_signature_url}" style="max-height:50px;margin-top:6px" />` : ''}
    </div>
    <div class="sig-box">
      <div class="sig-label">Contractor</div>
      <div>${prof?.company_name || ''}</div>
      <div style="margin-top:3px;color:#9ca3af">Date: ${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA') : ''}</div>
    </div>
  </div>` : ''}
</div>

<div class="footer">
  Generated by EstimateOS · ${prof?.company_name || ''}${prof?.licence ? ` · Lic. ${prof.licence}` : ''}${prof?.insurance ? ` · Ins. ${prof.insurance}` : ''}
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
