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

  const issuedDate = new Date(inv.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const dueDate = inv.due_date
    ? new Date(inv.due_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const invoiceTypeLabel = inv.invoice_type === 'deposit' ? 'Deposit Invoice'
    : inv.invoice_type === 'final' ? 'Final Invoice'
    : 'Invoice'

  // ── Status-derived style tokens ───────────────────────────────────────────
  const headerPill = inv.status === 'paid'
    ? { bg: 'rgba(5,150,105,.22)', text: '#6EE7B7', border: 'rgba(16,185,129,.35)', label: 'PAID' }
    : inv.status === 'overdue'
    ? { bg: 'rgba(220,38,38,.22)', text: '#FCA5A5', border: 'rgba(239,68,68,.35)', label: 'OVERDUE' }
    : { bg: 'rgba(37,99,235,.22)', text: '#93C5FD', border: 'rgba(59,130,246,.35)', label: 'PAYMENT DUE' }

  const typePill = inv.invoice_type === 'deposit' ? 'DEPOSIT'
    : inv.invoice_type === 'final' ? 'FINAL' : 'STANDARD'

  const bannerBg     = inv.status === 'paid' ? '#F0FDF4' : inv.status === 'overdue' ? '#FEF2F2' : '#EFF6FF'
  const bannerBorder = inv.status === 'paid' ? '#BBF7D0' : inv.status === 'overdue' ? '#FECACA' : '#BFDBFE'
  const bannerText   = inv.status === 'paid' ? '#166534' : inv.status === 'overdue' ? '#991B1B' : '#1E40AF'
  const bannerIcon   = inv.status === 'paid' ? '#16A34A' : inv.status === 'overdue' ? '#DC2626' : '#2563EB'
  const bannerLabel  = inv.status === 'paid' ? 'Payment received'
    : inv.status === 'overdue' ? 'Payment overdue' : 'Payment pending'

  // ── Pre-computed detail strings ───────────────────────────────────────────
  const clientDetail = [
    est?.client_address
      ? [est.client_address, est?.client_city].filter(Boolean).join(', ')
      : est?.client_city,
    est?.client_email,
    est?.client_phone,
  ].filter(Boolean).join('<br>')

  const fromDetail = [
    location,
    prof?.phone,
    prof?.email,
    prof?.licence ? `Lic. ${prof.licence}` : null,
  ].filter(Boolean).join('<br>')

  // ── SVG icons ─────────────────────────────────────────────────────────────
  const clockSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${bannerIcon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  const gridSvg  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${invoiceTypeLabel} ${inv.invoice_number} — ${companyName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#0A1628;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── PRINT BAR ── */
  .print-bar{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 20px;margin:16px 40px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:600;color:#2563EB}
  .print-bar-btn{background:#2563EB;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}

  /* ── HEADER ── */
  .header{background:#0A1628;padding:28px 40px 32px}
  .header-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.07)}
  .logo{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo-os{color:#3B82F6}
  .inv-num-wrap{text-align:right}
  .inv-num-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-bottom:4px}
  .inv-num{font-size:15px;font-weight:700;color:#fff;font-family:'Courier New',monospace;letter-spacing:.04em}
  .header-main{display:flex;justify-content:space-between;align-items:flex-start}
  .kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-bottom:8px}
  .client-name{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.15;margin-bottom:7px}
  .client-detail{font-size:12px;color:rgba(255,255,255,.48);line-height:1.9}
  .amount-block{text-align:right}
  .amount-value{font-size:36px;font-weight:800;color:#fff;letter-spacing:-.03em;line-height:1;margin-bottom:7px}
  .amount-due{font-size:12px;color:rgba(255,255,255,.45);margin-bottom:12px}
  .pills{display:flex;gap:6px;justify-content:flex-end}
  .pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:20px;padding:3px 10px}

  /* ── BODY ── */
  .body{padding:28px 40px 40px}

  /* Status banner */
  .banner{border-radius:10px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px}
  .banner-left{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600}
  .banner-amount{font-weight:800;margin-left:2px}
  .est-tag{border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap}

  /* Two-col grid */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}

  /* Gray cards */
  .card{background:#F8FAFC;border-radius:10px;padding:16px}
  .card-kicker{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:9px}
  .card-name{font-size:14px;font-weight:700;color:#0A1628;margin-bottom:5px}
  .card-detail{font-size:11px;color:#64748B;line-height:1.85}
  .drow{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:7px}
  .drow:last-child{margin-bottom:0}
  .dkey{color:#64748B}
  .dval{font-weight:600;color:#0A1628}
  .dval-blue{font-weight:700;color:#2563EB}

  /* Services card */
  .svc-card{background:#F8FAFC;border-radius:10px;padding:16px;margin-bottom:12px}
  .svc-hd{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
  .svc-icon{width:28px;height:28px;background:#DBEAFE;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#2563EB}
  .svc-title{font-size:13px;font-weight:700;color:#0A1628}
  .svc-count{font-size:10px;font-weight:600;color:#64748B;background:#E2E8F0;border-radius:5px;padding:2px 8px}
  .tier-tag{font-size:10px;font-weight:700;color:#2563EB;background:#DBEAFE;border-radius:5px;padding:2px 8px;text-transform:capitalize}
  table{width:100%;border-collapse:collapse}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;text-align:left;padding:8px 4px 8px 0;border-top:2px solid #0A1628;border-bottom:1px solid #E2E8F0}
  td{font-size:12px;padding:10px 4px 10px 0;border-bottom:1px solid #F1F5F9;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .td-name{font-size:12px;font-weight:600;color:#0A1628}
  .td-sub{font-size:11px;color:#94A3B8;margin-top:2px}

  /* Payment instructions card */
  .pay-card{background:#F8FAFF;border:1px solid #BFDBFE;border-radius:10px;padding:16px}
  .prow{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(37,99,235,.07)}
  .prow:last-child{border-bottom:none}
  .pkey{color:#64748B}
  .pval{font-weight:600;color:#0A1628}
  .pval-blue{font-weight:600;color:#2563EB}
  .pval-mono{font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#0A1628;letter-spacing:.04em}

  /* Totals card */
  .totals-card{border:1px solid #E2E8F0;border-radius:10px;overflow:hidden}
  .totals-inner{padding:14px 16px}
  .trow{display:flex;justify-content:space-between;font-size:12px;color:#64748B;padding:4px 0}
  .trow-green{color:#059669;font-weight:600}
  .tfooter{background:#0A1628;padding:15px 16px;display:flex;justify-content:space-between;align-items:center}
  .tfooter-label{font-size:13px;font-weight:700;color:#fff}
  .tfooter-amount{font-size:22px;font-weight:800;color:#3B82F6;letter-spacing:-.02em}

  /* Notes */
  .notes{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-top:12px;font-size:12px;color:#64748B;line-height:1.7}

  /* Footer */
  .footer{padding:14px 40px;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;background:#FAFBFC}

  @media print{.print-bar{display:none}}
</style>
</head>
<body>

<!-- ── PRINT BAR ── -->
<div class="print-bar">
  ${invoiceTypeLabel} &middot; ${inv.invoice_number}
  <button class="print-bar-btn" onclick="window.print()">Print / Save PDF</button>
</div>

<!-- ── HEADER ── -->
<div class="header">

  <!-- Logo + invoice number -->
  <div class="header-top">
    <div class="logo">Estimate<span class="logo-os">OS</span></div>
    <div class="inv-num-wrap">
      <div class="inv-num-kicker">Invoice</div>
      <div class="inv-num">${inv.invoice_number}</div>
    </div>
  </div>

  <!-- Bill to + Amount due -->
  <div class="header-main">
    <div>
      <div class="kicker">Bill to</div>
      <div class="client-name">${est?.client_name || 'Client'}</div>
      ${clientDetail ? `<div class="client-detail">${clientDetail}</div>` : ''}
    </div>
    <div class="amount-block">
      <div class="kicker">Amount due</div>
      <div class="amount-value">${fmtCAD(inv.amount)}</div>
      ${dueDate ? `<div class="amount-due">Due ${dueDate}</div>` : ''}
      <div class="pills">
        <span class="pill" style="background:${headerPill.bg};color:${headerPill.text};border:1px solid ${headerPill.border}">${headerPill.label}</span>
        <span class="pill" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.1)">${typePill}</span>
      </div>
    </div>
  </div>

</div>

<!-- ── BODY ── -->
<div class="body">

  <!-- 1. Status banner -->
  <div class="banner" style="background:${bannerBg};border:1px solid ${bannerBorder}">
    <div class="banner-left" style="color:${bannerText}">
      ${clockSvg}
      ${bannerLabel}
      <span class="banner-amount" style="color:${bannerIcon}">${fmtCAD(inv.amount)}</span>
    </div>
    ${est ? `<span class="est-tag" style="background:${bannerBorder};color:${bannerText}">${est.estimate_number}</span>` : ''}
  </div>

  <!-- 2. From + Invoice details -->
  <div class="two-col">
    <div class="card">
      <div class="card-kicker">From</div>
      <div class="card-name">${companyName}</div>
      ${fromDetail ? `<div class="card-detail">${fromDetail}</div>` : ''}
    </div>
    <div class="card">
      <div class="card-kicker">Invoice details</div>
      <div class="drow"><span class="dkey">Issued</span><span class="dval">${issuedDate}</span></div>
      ${dueDate ? `<div class="drow"><span class="dkey">Due date</span><span class="dval-blue">${dueDate}</span></div>` : ''}
      ${est ? `<div class="drow"><span class="dkey">Ref estimate</span><span class="dval">${est.estimate_number}</span></div>` : ''}
      <div class="drow"><span class="dkey">Terms</span><span class="dval">Due on receipt</span></div>
      <div class="drow"><span class="dkey">Payment</span><span class="dval">E-Transfer</span></div>
    </div>
  </div>

  <!-- 3. Services card -->
  ${ops && ops.length > 0 ? `
  <div class="svc-card">
    <div class="svc-hd">
      <div class="svc-icon">${gridSvg}</div>
      <span class="svc-title">Services rendered</span>
      <span class="svc-count">${ops.length} item${ops.length !== 1 ? 's' : ''}</span>
      ${est?.tier ? `<span class="tier-tag">${est.tier.charAt(0).toUpperCase() + est.tier.slice(1)}</span>` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center;width:56px">Qty</th>
          <th style="text-align:right;width:100px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${ops.map((op: Record<string, unknown>) => `
        <tr>
          <td>
            <div class="td-name">${(OPENING_TYPES as Record<string, { name: string }>)[op.type as string]?.name || op.type}</div>
            ${op.room ? `<div class="td-sub">${op.room}</div>` : ''}
          </td>
          <td style="text-align:center;color:#64748B">${op.qty}</td>
          <td style="text-align:right;font-weight:700;color:#0A1628">${fmtCAD(op.total_cost as number)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- 4. Payment instructions + Totals -->
  <div class="two-col">

    ${prof?.email ? `
    <div class="pay-card">
      <div class="card-kicker">Payment instructions</div>
      <div class="prow"><span class="pkey">Send to</span><span class="pval-blue">${prof.email}</span></div>
      <div class="prow"><span class="pkey">Reference</span><span class="pval-mono">${inv.invoice_number}</span></div>
      ${prof?.phone ? `<div class="prow"><span class="pkey">Questions</span><span class="pval">${prof.phone}</span></div>` : ''}
    </div>` : '<div></div>'}

    <div class="totals-card">
      <div class="totals-inner">
        ${est ? `
        <div class="trow"><span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span></div>
        <div class="trow"><span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span></div>` : ''}
        ${depositInv ? `
        <div class="trow trow-green"><span>Deposit paid</span><span>&minus; ${fmtCAD(depositInv.amount)}</span></div>` : ''}
        ${inv.invoice_type === 'deposit' && est ? `
        <div class="trow" style="color:#2563EB;font-weight:600"><span>Deposit rate</span><span>${Math.round(inv.amount / est.total * 100)}%</span></div>` : ''}
      </div>
      <div class="tfooter">
        <span class="tfooter-label">Total due</span>
        <span class="tfooter-amount">${fmtCAD(inv.amount)}</span>
      </div>
    </div>

  </div>

  ${inv.notes ? `<div class="notes">${String(inv.notes).replace(/\n/g, '<br>')}</div>` : ''}

</div>

<!-- ── FOOTER ── -->
<div class="footer">
  <span>estimateos.com</span>
  <span>Thank you for your business</span>
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
