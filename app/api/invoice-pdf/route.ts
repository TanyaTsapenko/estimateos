import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inv } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: est }, { data: prof }] = await Promise.all([
    inv.estimate_id
      ? supabase.from('estimates').select('*').eq('id', inv.estimate_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles')
      .select('company_name, first_name, last_name, email, phone, city, province, website, licence, insurance')
      .eq('id', user.id)
      .single(),
  ])

  const ops = est ? (await supabase
    .from('estimate_openings')
    .select('*')
    .eq('estimate_id', est.id)
    .order('sort_order')).data : []

  // For final invoices, fetch the deposit invoice to show it was paid
  let depositInv: { amount: number; status: string } | null = null
  if (inv.invoice_type === 'final' && inv.estimate_id) {
    const { data } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('estimate_id', inv.estimate_id)
      .eq('invoice_type', 'deposit')
      .single()
    depositInv = data
  }

  const companyName = prof?.company_name
    || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim()
    || 'Contractor'
  const location = [prof?.city, prof?.province].filter(Boolean).join(', ')
  const [, taxLabel] = TAX_RATES[est?.client_province || prof?.province || 'AB'] || [0.05, 'Tax']

  const statusColor: Record<string, string> = {
    pending: '#2563eb', paid: '#16a34a', overdue: '#dc2626',
  }
  const statusBg: Record<string, string> = {
    pending: 'rgba(37,99,235,.12)', paid: 'rgba(22,163,74,.12)', overdue: 'rgba(220,38,38,.12)',
  }

  const issuedDate = new Date(inv.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const dueDate = inv.due_date
    ? new Date(inv.due_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const invoiceTypeLabel = inv.invoice_type === 'deposit' ? 'Deposit Invoice'
    : inv.invoice_type === 'final' ? 'Final Invoice'
    : 'Invoice'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${invoiceTypeLabel} ${inv.invoice_number} — ${companyName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1A1A1A;background:#fff}
  .print-bar{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:8px;padding:10px 16px;margin:20px 40px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#2045B8;font-weight:600}
  .print-bar button{background:#3B6CFF;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  .header{background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);padding:32px 40px}
  .header-inner{display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:20px;font-weight:800;color:#fff;margin-bottom:6px}
  .logo span{color:#3B6CFF}
  .company-meta{font-size:11px;color:rgba(255,255,255,.5);line-height:1.7}
  .inv-meta{text-align:right}
  .inv-type{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px}
  .inv-num{font-size:24px;font-weight:800;color:#3B6CFF;line-height:1}
  .inv-date{font-size:11px;color:rgba(255,255,255,.5);margin-top:5px;line-height:1.6}
  .status-badge{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-top:8px}
  .body{padding:28px 40px 40px}
  .party-card{display:flex;gap:16px;margin-bottom:24px}
  .party-box{flex:1;background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:14px}
  .party-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:6px}
  .party-name{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:3px}
  .party-detail{font-size:11px;color:#6b7280;line-height:1.6}
  .section-title{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#BFBFBF;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#BFBFBF;text-align:left;padding:7px 0;border-bottom:1.5px solid #E0E0E0}
  td{font-size:12px;padding:9px 0;border-bottom:1px solid #F0F0F0;vertical-align:top}
  .item-icon{display:inline-block;background:#EEF2FF;color:#2045B8;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:4px}
  .totals{background:#F4F5F7;border:1.5px solid #1A2744;border-radius:10px;padding:18px;margin-top:4px}
  .total-row{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px}
  .total-row.muted{opacity:.7}
  .divider{border:none;border-top:1.5px solid #1A2744;margin:12px 0}
  .total-final{display:flex;justify-content:space-between;align-items:center}
  .total-final .label{font-size:13px;font-weight:700;color:#1A1A1A}
  .total-final .amount{font-size:26px;font-weight:800;color:#2045B8}
  .deposit-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
  .deposit-row .label{color:#16a34a;font-weight:600}
  .deposit-row .val{color:#16a34a;font-weight:700}
  .payment-box{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin-top:20px}
  .payment-title{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2045B8;margin-bottom:10px}
  .payment-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px}
  .payment-row .key{color:#6b7280}
  .payment-row .val{font-weight:600;color:#1A1A1A}
  .notes-box{background:#F9FAFB;border:1px solid #E0E0E0;border-radius:8px;padding:12px;margin-top:16px;font-size:12px;color:#6b7280;line-height:1.7}
  .footer{margin-top:32px;padding:14px 40px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between;background:#FAFAFA}
  @media print{
    .print-bar{display:none}
    body{background:#fff}
  }
</style>
</head>
<body>

<div class="print-bar">
  🧾 ${invoiceTypeLabel} ${inv.invoice_number}
  <button onclick="window.print()">Print / Save PDF</button>
</div>

<div class="header">
  <div class="header-inner">
    <div>
      <div class="logo">Estimate<span>OS</span></div>
      <div class="company-meta">
        ${companyName}${location ? `<br>${location}` : ''}${prof?.phone ? `<br>${prof.phone}` : ''}${prof?.website ? `<br>${prof.website}` : ''}${prof?.licence ? `<br>Lic. ${prof.licence}` : ''}
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-type">${invoiceTypeLabel}</div>
      <div class="inv-num">${inv.invoice_number}</div>
      <div class="inv-date">
        Issued: ${issuedDate}${dueDate ? `<br>Due: ${dueDate}` : ''}
        ${est ? `<br>Ref: ${est.estimate_number}` : ''}
      </div>
      <div><span class="status-badge" style="background:${statusBg[inv.status] || 'rgba(107,114,128,.12)'};color:${statusColor[inv.status] || '#6b7280'}">${inv.status.toUpperCase()}</span></div>
    </div>
  </div>
</div>

<div class="body">

  <div class="party-card">
    <div class="party-box">
      <div class="party-label">From</div>
      <div class="party-name">${companyName}</div>
      <div class="party-detail">${prof?.phone || ''}${prof?.email ? `<br>${prof.email}` : ''}${location ? `<br>${location}` : ''}${prof?.licence ? `<br>Lic. ${prof.licence}` : ''}</div>
    </div>
    <div class="party-box">
      <div class="party-label">Bill to</div>
      <div class="party-name">${est?.client_name || 'Client'}</div>
      <div class="party-detail">${est?.client_email || ''}${est?.client_phone ? `<br>${est.client_phone}` : ''}${est?.client_address ? `<br>${est.client_address}${est.client_city ? `, ${est.client_city}` : ''}` : ''}</div>
    </div>
  </div>

  ${ops && ops.length > 0 ? `
  <div class="section-title">Line items</div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${ops.map(op => `
      <tr>
        <td><span class="item-icon">${OPENING_TYPES[op.type]?.icon || ''}</span>${OPENING_TYPES[op.type]?.name || op.type}${op.room ? ` <span style="color:#9ca3af">— ${op.room}</span>` : ''}</td>
        <td style="color:#6b7280">${op.qty}</td>
        <td style="text-align:right;font-weight:700;color:#1A1A1A">${fmtCAD(op.total_cost)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="totals">
    ${est ? `
    <div class="total-row muted"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
    <div class="total-row muted"><span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span></div>
    <div class="total-row" style="font-weight:600;color:#1A1A1A;margin-bottom:${depositInv || inv.invoice_type === 'deposit' ? '10' : '0'}px">
      <span>Project total</span><span>${fmtCAD(est.total)}</span>
    </div>` : ''}

    ${inv.invoice_type === 'deposit' ? `
    <hr class="divider">
    <div class="total-final">
      <div>
        <div class="label">Deposit due (${Math.round(inv.amount / (est?.total || inv.amount) * 100)}%)</div>
        ${dueDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">Due by ${dueDate}</div>` : ''}
      </div>
      <div class="amount">${fmtCAD(inv.amount)}</div>
    </div>` : ''}

    ${inv.invoice_type === 'final' && depositInv ? `
    <div class="deposit-row">
      <span class="label">Deposit paid ${depositInv.status === 'paid' ? '✓' : '(pending)'}</span>
      <span class="val">− ${fmtCAD(depositInv.amount)}</span>
    </div>
    <hr class="divider">
    <div class="total-final">
      <div>
        <div class="label">Balance due</div>
        ${dueDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">Due by ${dueDate}</div>` : ''}
      </div>
      <div class="amount">${fmtCAD(inv.amount)}</div>
    </div>` : ''}

    ${inv.invoice_type === 'standard' || !inv.invoice_type ? `
    <hr class="divider">
    <div class="total-final">
      <div>
        <div class="label">Amount due</div>
        ${dueDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">Due by ${dueDate}</div>` : ''}
      </div>
      <div class="amount">${fmtCAD(inv.amount)}</div>
    </div>` : ''}
  </div>

  ${prof?.email ? `
  <div class="payment-box">
    <div class="payment-title">Payment instructions</div>
    <div class="payment-row"><span class="key">E-Transfer to</span><span class="val">${prof.email}</span></div>
    <div class="payment-row"><span class="key">Reference / message</span><span class="val">${inv.invoice_number}</span></div>
    ${prof?.phone ? `<div class="payment-row"><span class="key">Questions</span><span class="val">${prof.phone}</span></div>` : ''}
  </div>` : ''}

  ${inv.notes ? `<div class="notes-box">${inv.notes.replace(/\n/g, '<br>')}</div>` : ''}

</div>

<div class="footer">
  <span>${companyName}${prof?.licence ? ` · Lic. ${prof.licence}` : ''}${prof?.insurance ? ` · Ins. ${prof.insurance}` : ''}</span>
  <span>Generated by EstimateOS</span>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${inv.invoice_number}.html"`,
    },
  })
}
