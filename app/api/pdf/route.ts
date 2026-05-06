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
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1A1A1A;background:#E8E9EC}
  .top-bar{background:#fff;border-bottom:1px solid #E0E0E0;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
  .back-btn{background:#F4F5F7;border:1px solid #E0E0E0;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:#1A1A1A;cursor:pointer;font-family:inherit}
  .print-btn{background:#3B6CFF;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;font-family:inherit}
  .wrap{max-width:600px;margin:0 auto;padding:10px 12px 16px}
  .header{background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:14px;padding:18px 16px;margin-bottom:8px}
  .header-inner{display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:18px;font-weight:800;color:#fff;margin-bottom:8px}
  .logo span{color:#3B6CFF}
  .company{font-size:11px;color:rgba(255,255,255,.5);line-height:1.6}
  .est-meta{text-align:right}
  .est-num{font-size:20px;font-weight:800;color:#3B6CFF;line-height:1}
  .est-date{font-size:10px;color:rgba(255,255,255,.5);margin-top:4px;line-height:1.6}
  .badge{display:inline-block;background:rgba(59,108,255,.2);color:#9BB4FF;font-size:8px;font-weight:700;padding:3px 8px;border-radius:5px;margin-top:5px;letter-spacing:.06em}
  .card{background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid #E8E9EC}
  .party-row{display:flex;gap:8px;margin-bottom:8px}
  .party-box{flex:1;background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:12px}
  .party-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:5px}
  .party-name{font-size:13px;font-weight:700;color:#1A1A1A;margin-bottom:2px}
  .party-detail{font-size:10px;color:#6b7280;line-height:1.5}
  .sl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#BFBFBF;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}
  th{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#BFBFBF;text-align:left;padding:5px 0;border-bottom:1.5px solid #E0E0E0}
  td{font-size:12px;padding:8px 0;border-bottom:1px solid #F0F0F0;vertical-align:top}
  td:last-child{text-align:right}
  .icon-pill{display:inline-block;background:#EEF2FF;color:#2045B8;font-size:10px;padding:1px 6px;border-radius:4px;margin-right:4px}
  .totals{background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:14px;margin-top:8px}
  .t-row{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px}
  .t-total{display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #1A2744;padding-top:10px;margin-top:8px}
  .t-total-label{font-size:13px;font-weight:700;color:#1A1A1A}
  .t-total-val{font-size:22px;font-weight:800;color:#2045B8}
  .scope-box{background:#F4F5F7;border:1px solid #E0E0E0;border-radius:8px;padding:11px;font-size:12px;color:#6b7280;line-height:1.6}
  .sig-row{display:flex;gap:12px;margin-top:4px}
  .sig-box{flex:1;border-top:2px solid #1A2744;padding-top:8px}
  .sig-lbl{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2045B8;margin-bottom:3px}
  .sig-name{font-size:12px;color:#1A1A1A}
  .sig-date{font-size:10px;color:#9ca3af;margin-top:2px}
  .footer{text-align:center;font-size:10px;color:#BFBFBF;padding:10px 0 4px}
  @media print{
    .top-bar{display:none}
    body{background:#fff}
    .wrap{padding:0}
    .header{border-radius:0;margin-bottom:16px}
    .card{border:none;padding:12px 0;margin-bottom:8px}
  }
</style>
</head>
<body>

<div class="top-bar">
  <button class="back-btn" onclick="window.location.href='/dashboard/estimates/${id}'">← Back</button>
  <button class="print-btn" onclick="window.print()">Save PDF</button>
</div>

<div class="wrap">
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="logo">Estimate<span>OS</span></div>
        <div class="company">${prof?.company_name || 'Contractor'}${[prof?.city, prof?.province].filter(Boolean).length ? '<br>' + [prof?.city, prof?.province].filter(Boolean).join(', ') : ''}${prof?.phone ? '<br>' + prof.phone : ''}</div>
      </div>
      <div class="est-meta">
        <div class="est-num">${est.estimate_number}</div>
        <div class="est-date">${new Date(est.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}<br>Valid: ${est.valid_until || '30 days'}</div>
        <div><span class="badge">${(est.tier || 'better').toUpperCase()}</span></div>
      </div>
    </div>
  </div>

  <div class="party-row">
    <div class="party-box">
      <div class="party-label">From</div>
      <div class="party-name">${prof?.company_name || 'Contractor'}</div>
      <div class="party-detail">${prof?.phone || ''}${prof?.website ? '<br>' + prof.website : ''}${prof?.licence ? '<br>Lic. ' + prof.licence : ''}</div>
    </div>
    <div class="party-box">
      <div class="party-label">For</div>
      <div class="party-name">${est.client_name || 'Client'}</div>
      <div class="party-detail">${est.client_email || ''}${est.client_phone ? '<br>' + est.client_phone : ''}${est.client_address ? '<br>' + est.client_address + (est.client_city ? ', ' + est.client_city : '') : ''}</div>
    </div>
  </div>

  ${est.scope_notes ? `
  <div class="card">
    <div class="sl">Scope of work</div>
    <div class="scope-box">${est.scope_notes}</div>
  </div>` : ''}

  <div class="card">
    <div class="sl">Line items</div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(ops || []).map(op => `
        <tr>
          <td><span class="icon-pill">${OPENING_TYPES[op.type]?.icon || ''}</span>${OPENING_TYPES[op.type]?.name || op.type}${op.room ? `<br><span style="font-size:10px;color:#9ca3af">${op.room}</span>` : ''}</td>
          <td style="text-align:center;color:#6b7280">${op.qty}</td>
          <td style="font-weight:700;color:#1A1A1A">${fmtCAD(op.total_cost)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="t-row"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
      <div class="t-row"><span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span></div>
      <div class="t-total">
        <span class="t-total-label">Total</span>
        <span class="t-total-val">${fmtCAD(est.total)}</span>
      </div>
    </div>
  </div>

  ${est.status === 'signed' ? `
  <div class="card">
    <div class="sl">Signatures</div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-lbl">Client</div>
        <div class="sig-name">${est.client_name || ''}</div>
        <div class="sig-date">${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
        ${est.client_signature_url && !est.client_signature_url.startsWith('data:') ? `<img src="${est.client_signature_url}" style="max-height:44px;margin-top:6px;display:block" />` : ''}
      </div>
      <div class="sig-box">
        <div class="sig-lbl">Contractor</div>
        <div class="sig-name">${prof?.company_name || ''}</div>
        <div class="sig-date">${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
      </div>
    </div>
  </div>` : ''}

  <div class="footer">
    EstimateOS · ${prof?.company_name || ''}${prof?.licence ? ` · Lic. ${prof.licence}` : ''}${prof?.insurance ? ` · Ins. ${prof.insurance}` : ''}
  </div>
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
