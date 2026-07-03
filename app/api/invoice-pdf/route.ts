import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OPENING_TYPES, TAX_RATES } from '@/lib/pricing'

const fmtInv = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
      .select('company_name, first_name, last_name, email, phone, city, province, website, licence, insurance, logo_url, signature_url, gst_hst_number')
      .eq('id', user.id)
      .single(),
  ])

  const ops = est ? (await supabase
    .from('estimate_openings')
    .select('*')
    .eq('estimate_id', est.id)
    .order('sort_order')).data : []

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
    || `${(prof as any)?.first_name || ''} ${(prof as any)?.last_name || ''}`.trim()
    || 'Contractor'
  const location = [prof?.city, prof?.province].filter(Boolean).join(', ')
  const [, taxLabel] = TAX_RATES[est?.client_province || prof?.province || 'AB'] || [0.05, 'Tax']

  const issuedDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(inv.created_at))
  const dueDate = inv.due_date
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(inv.due_date))
    : null

  const invoiceTypeLabel = inv.invoice_type === 'deposit' ? 'Deposit Invoice'
    : inv.invoice_type === 'final' ? 'Final Invoice'
    : 'Invoice'

  const isPaid = inv.status === 'paid'
  const isOverdue = inv.status === 'overdue'

  // Header status pill
  const statusPillClass = isPaid ? 'pill-paid' : isOverdue ? 'pill-overdue' : 'pill-due'
  const statusLabel = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Payment Due'

  // Type pill
  const typePillLabel = inv.invoice_type === 'deposit' ? 'Deposit'
    : inv.invoice_type === 'final' ? 'Final Invoice' : 'Standard'

  // Payment status card values
  const statusCardBg    = isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#EFF6FF'
  const statusCardTitle = isPaid ? 'Payment received' : isOverdue ? 'Payment overdue' : 'Payment pending'
  const statusCardSub   = isPaid
    ? `${fmtInv(inv.amount)} received`
    : `${fmtInv(inv.amount)} due${dueDate ? ` · ${dueDate}` : ''}`
  const statusCardColor = isPaid ? '#059669' : isOverdue ? '#DC2626' : '#2563EB'
  const statusCardBorder = isPaid ? '#BBF7D0' : isOverdue ? '#FECACA' : '#BFDBFE'

  const fromDetail = [
    location,
    prof?.phone,
    prof?.email,
    prof?.licence ? `Lic. ${prof.licence}` : null,
    (prof as any)?.gst_hst_number ? `GST/HST #: ${(prof as any).gst_hst_number}` : null,
  ].filter(Boolean).join('<br>')

  const clientDetail = [
    est?.client_address
      ? [est.client_address, est?.client_city].filter(Boolean).join(', ')
      : est?.client_city,
    (est as any)?.job_site_same_as_client === false && (est as any)?.job_site_address
      ? `Job Site: ${[(est as any).job_site_address, (est as any).job_site_city].filter(Boolean).join(', ')}`
      : null,
    est?.client_email,
    est?.client_phone,
  ].filter(Boolean).join('<br>')

  // SVG icons
  const windowSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`

  const checkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${statusCardColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
  const clockSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${statusCardColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  const statusIcon = isPaid ? checkSvg : clockSvg

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
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#F5F6F8;color:#0A1628;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Header ── */
  .hdr{background:linear-gradient(135deg,#080E1C 0%,#0E1F3D 50%,#0C2847 100%);padding:28px 24px 48px}
  .hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
  .logo{font-size:16px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo span{color:#2563EB}
  .save-btn{background:#2563EB;border:none;border-radius:20px;padding:8px 20px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit}
  .hdr-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px}
  .hdr-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
  .hdr-client{font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.15}
  .hdr-inv-num{font-size:13px;font-weight:700;color:rgba(255,255,255,.45);font-family:'Courier New',monospace;letter-spacing:.04em;text-align:right;white-space:nowrap;margin-top:4px}
  .hdr-amount{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.03em;line-height:1;text-align:right}
  .hdr-amount-lbl{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:5px;text-align:right}
  .pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
  .pill-paid{background:rgba(5,150,105,.25);border:1px solid rgba(16,185,129,.4);color:#6EE7B7;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-due{background:rgba(37,99,235,.25);border:1px solid rgba(59,130,246,.4);color:#93C5FD;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-overdue{background:rgba(220,38,38,.25);border:1px solid rgba(239,68,68,.4);color:#FCA5A5;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-outline{border:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.5);font-size:10px;font-weight:600;border-radius:20px;padding:4px 12px;display:inline-block}

  /* ── Body ── */
  .body{background:#F5F6F8;border-radius:24px 24px 0 0;margin-top:-24px;padding:20px;display:flex;flex-direction:column;gap:12px;min-height:100vh}

  /* ── Cards ── */
  .card{background:#fff;border-radius:16px;padding:16px}
  .card-blue{background:#fff;border-radius:16px;padding:16px;border:1.5px solid #BFDBFE}
  .slbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px}

  /* ── Status card ── */
  .status-card{border-radius:16px;padding:16px;display:flex;align-items:center;gap:14px}
  .status-icon-wrap{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(255,255,255,.7)}
  .status-title{font-size:15px;font-weight:700;margin-bottom:4px}
  .status-sub{font-size:12px;opacity:.75}

  /* ── Three-col date card ── */
  .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0}
  .date-col{padding:14px 16px}
  .date-col+.date-col{border-left:1px solid #EEF0F4}
  .date-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:6px}
  .date-val{font-size:13px;font-weight:700;color:#0A1628}
  .date-val-blue{font-size:13px;font-weight:700;color:#2563EB}

  /* ── Two-col card ── */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .party-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px}
  .party-name{font-size:14px;font-weight:700;color:#0A1628;margin-bottom:5px}
  .party-detail{font-size:11px;color:#64748B;line-height:1.85}

  /* ── Estimate badge ── */
  .est-badge{display:inline-flex;align-items:center;gap:8px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 14px}
  .est-badge-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2563EB}
  .est-badge-num{font-size:13px;font-weight:700;color:#0A1628;font-family:'Courier New',monospace}

  /* ── Services card ── */
  .svc-head{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
  .svc-title{font-size:13px;font-weight:700;color:#0A1628}
  .svc-count{font-size:10px;font-weight:600;color:#64748B;background:#E2E8F0;border-radius:5px;padding:2px 8px}
  .op-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #EEF0F4;gap:12px}
  .op-row:last-of-type{border-bottom:none}
  .op-name{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:3px}
  .op-sub{font-size:11px;color:#94A3B8}
  .op-price{font-size:13px;font-weight:700;color:#0A1628;flex-shrink:0}
  .tot-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;color:#64748B}
  .tot-divider{height:1.5px;background:#0A1628;margin:8px 0}
  .tot-final{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 0}
  .tot-lbl{font-size:14px;font-weight:700;color:#0A1628}
  .tot-val{font-size:26px;font-weight:800;color:#2563EB;letter-spacing:-.02em}

  /* ── Payment instructions ── */
  .pay-card{background:#F8FAFF;border:1px solid #BFDBFE;border-radius:16px;padding:16px}
  .drow{display:flex;justify-content:space-between;align-items:flex-start;font-size:13px;padding:7px 0;border-bottom:1px solid #EEF0F4;gap:16px}
  .drow:last-child{border-bottom:none}
  .dkey{color:#94A3B8;flex-shrink:0}
  .dval{font-weight:600;color:#0A1628;text-align:right}
  .dval-blue{font-weight:700;color:#2563EB;text-align:right}
  .dval-mono{font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#0A1628;letter-spacing:.04em}

  /* ── Footer ── */
  .footer{text-align:center;padding:28px 20px;font-size:11px;color:#9CA3AF}

  @media print{
    body{background:#F5F6F8}
    .save-btn{display:none}
  }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="hdr">
  <div class="hdr-top">
    ${prof?.logo_url
      ? `<img src="${prof.logo_url}" style="max-width:120px;max-height:40px;object-fit:contain;display:block" alt="${companyName}" />`
      : `<div class="logo">Apex<span>Scale</span></div>`
    }
    <div style="display:flex;align-items:center;gap:10px">
      <button onclick="window.history.back()" style="background:rgba(255,255,255,.12);border:none;border-radius:20px;padding:7px 16px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;font-family:inherit">← Back</button>
      <button class="save-btn" onclick="window.print()">Save PDF</button>
    </div>
  </div>
  <div class="hdr-kicker">Bill to</div>
  <div class="hdr-row">
    <div class="hdr-client">${est?.client_name || 'Client'}</div>
    <div style="text-align:right;flex-shrink:0">
      <div class="hdr-amount-lbl">Amount due</div>
      <div class="hdr-amount">${fmtInv(inv.amount)}</div>
    </div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div class="hdr-inv-num">${inv.invoice_number}</div>
    <div class="pills">
      <span class="${statusPillClass}">${statusLabel}</span>
      ${dueDate ? `<span class="pill-outline">Due ${dueDate}</span>` : ''}
      <span class="pill-outline">${typePillLabel}</span>
    </div>
  </div>
</div>

<!-- ── BODY ── -->
<div class="body">

  <!-- Card 1: Payment status -->
  <div class="status-card" style="background:${statusCardBg};border:1.5px solid ${statusCardBorder}">
    <div class="status-icon-wrap">${statusIcon}</div>
    <div>
      <div class="status-title" style="color:${statusCardColor}">${statusCardTitle}</div>
      <div class="status-sub" style="color:${statusCardColor}">${statusCardSub}</div>
    </div>
  </div>

  <!-- Card 2: Dates -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="three-col">
      <div class="date-col">
        <div class="date-lbl">Issued</div>
        <div class="date-val">${issuedDate}</div>
      </div>
      <div class="date-col">
        <div class="date-lbl">Due date</div>
        <div class="${dueDate ? 'date-val-blue' : 'date-val'}">${dueDate || '—'}</div>
      </div>
      <div class="date-col">
        <div class="date-lbl">Terms</div>
        <div class="date-val">Due on receipt</div>
      </div>
    </div>
  </div>

  <!-- Card 3: From / Bill to -->
  <div class="two-col">
    <div class="card">
      <div class="party-lbl">From</div>
      <div class="party-name">${companyName}</div>
      ${fromDetail ? `<div class="party-detail">${fromDetail}</div>` : ''}
    </div>
    <div class="card">
      <div class="party-lbl">Bill to</div>
      <div class="party-name">${est?.client_name || 'Client'}</div>
      ${clientDetail ? `<div class="party-detail">${clientDetail}</div>` : ''}
    </div>
  </div>

  <!-- Card 4: Related estimate -->
  ${est ? `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="slbl" style="margin-bottom:0">Related estimate</div>
      <div class="est-badge" style="padding:8px 12px">
        <div class="est-badge-lbl">Estimate</div>
        <div class="est-badge-num">${est.estimate_number}</div>
      </div>
    </div>
  </div>` : ''}

  <!-- Card 5: Services -->
  ${ops && ops.length > 0 ? `
  <div class="card">
    <div class="svc-head">
      ${windowSvg}
      <span class="svc-title">Services rendered</span>
      <span class="svc-count">${ops.length} item${ops.length !== 1 ? 's' : ''}</span>
    </div>
    ${ops.map((op: Record<string, unknown>) => `
    <div class="op-row">
      <div>
        <div class="op-name">${(OPENING_TYPES as Record<string, { name: string }>)[op.type as string]?.name || op.type} × ${op.qty}</div>
        ${op.room ? `<div class="op-sub">${op.room as string}</div>` : ''}
      </div>
      <div class="op-price">${fmtInv(op.total_cost as number)}</div>
    </div>`).join('')}
    <div style="margin-top:12px;padding-top:4px">
      ${est ? `
      <div class="tot-row">
        <span>Subtotal</span>
        <span style="color:#0A1628;font-weight:600">${fmtInv(est.subtotal)}</span>
      </div>
      <div class="tot-row">
        <span>${taxLabel}</span>
        <span style="color:#0A1628;font-weight:600">${fmtInv(est.tax_amount)}</span>
      </div>` : ''}
      ${depositInv ? `
      <div class="tot-row" style="color:#059669;font-weight:600">
        <span>Deposit paid</span>
        <span>&minus; ${fmtInv(depositInv.amount)}</span>
      </div>` : ''}
      ${inv.additional_charges?.items?.length > 0 ? `
      <div class="tot-row" style="font-weight:700;color:#0A1628;margin-top:4px">
        <span>Additional charges</span><span></span>
      </div>
      ${inv.additional_charges.items.map((c: {label: string; amount: number}) => `
      <div class="tot-row" style="padding-left:12px">
        <span>${c.label}</span>
        <span style="color:#0A1628;font-weight:600">${fmtInv(c.amount)}</span>
      </div>`).join('')}
      <div class="tot-row">
        <span>${taxLabel} on charges</span>
        <span style="color:#0A1628;font-weight:600">${fmtInv(inv.additional_charges.tax_amount)}</span>
      </div>` : ''}
      ${inv.invoice_type === 'deposit' && est ? `
      <div class="tot-row" style="color:#2563EB;font-weight:600">
        <span>Deposit rate</span>
        <span>${Math.round(inv.amount / est.total * 100)}%</span>
      </div>` : ''}
      <div class="tot-divider"></div>
      <div class="tot-final">
        <span class="tot-lbl">Total due</span>
        <span class="tot-val">${fmtInv(inv.amount)}</span>
      </div>
    </div>
  </div>` : ''}

  <!-- Payment instructions -->
  ${prof?.email ? `
  <div class="pay-card">
    <div class="slbl" style="color:#2563EB">Payment instructions</div>
    <div class="drow"><span class="dkey">Send e-transfer to</span><span class="dval-blue">${prof.email}</span></div>
    <div class="drow"><span class="dkey">Reference number</span><span class="dval-mono">${inv.invoice_number}</span></div>
    ${prof?.phone ? `<div class="drow"><span class="dkey">Questions</span><span class="dval">${prof.phone}</span></div>` : ''}
  </div>` : ''}

  ${inv.notes ? `
  <div class="card">
    <div class="slbl">Notes</div>
    <div style="font-size:13px;color:#475569;line-height:1.7;margin-top:4px">${String(inv.notes).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

</div>

${(prof as any)?.signature_url ? `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0">
  <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Authorized by</div>
  <img src="${(prof as any).signature_url}" style="max-height:50px;max-width:180px;object-fit:contain" alt="Contractor signature" />
  <div style="font-size:12px;color:#475569;margin-top:6px">${companyName || ''}</div>
</div>` : ''}

<div class="footer">
  ${companyName ? `<div style="font-size:12px;font-weight:600;color:#64748B;margin-bottom:4px">Prepared by ${companyName}</div>` : ''}
  <div style="font-size:10px;color:#CBD5E1">Powered by ApexScale &middot; useapexscale.com</div>
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
