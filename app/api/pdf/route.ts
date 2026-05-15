import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

const INSTALL_LABELS: Record<string, string> = {
  insert: 'Retrofit', retrofit: 'Retrofit', fullframe: 'Full Frame', stud_to_stud: 'Stud to Stud',
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
  if (!est) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ops } = await supabase
    .from('estimate_openings')
    .select('*')
    .eq('estimate_id', id)
    .order('sort_order')

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, city, province, phone, website, licence, insurance, logo_url, deposit_pct, contract_intro, contract_terms, contract_require_sign, contract_show_licence')
    .eq('id', est.user_id)
    .single()

  const contractIntro = (prof as any)?.contract_intro
    ? ((prof as any).contract_intro as string)
        .replace(/\{client_name\}/g, est.client_name || '')
        .replace(/\{company_name\}/g, prof?.company_name || '')
    : null
  const contractTerms: string | null = (prof as any)?.contract_terms || null
  const contractRequireSign: boolean = (prof as any)?.contract_require_sign ?? true
  const contractShowLicence: boolean = !!(prof as any)?.contract_show_licence && !!prof?.licence

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']

  const depositPct: number = prof?.deposit_pct ?? 30
  const depositOnSigning = Math.round(est.total * depositPct / 100)
  const depositOnDelivery = est.total - depositOnSigning

  const validUntil = est.valid_until
    ? new Date(est.valid_until + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : '30 days from issue'
  const tierLabel = ((est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)) + ' Package'
  const signedDate = est.signed_at
    ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const signedTime = est.signed_at
    ? new Date(est.signed_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : ''

  const clientDetailRows = [
    est.client_email   && { label: 'Email',   value: est.client_email },
    est.client_phone   && { label: 'Phone',   value: est.client_phone },
    (est.client_address || est.client_city) && {
      label: 'Address',
      value: [est.client_address, est.client_city, est.client_province].filter(Boolean).join(', '),
    },
    est.payment_method && { label: 'Payment', value: est.payment_method },
  ].filter(Boolean) as { label: string; value: string }[]

  const statusPillClass = est.status === 'signed' ? 'pill-signed'
    : est.status === 'sent' ? 'pill-sent' : 'pill-draft'
  const statusLabel = est.status.charAt(0).toUpperCase() + est.status.slice(1)

  const windowSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${est.estimate_number} — ${est.client_name || 'Estimate'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;background:#F5F6F8;color:#0A1628;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Header ── */
  .hdr{background:linear-gradient(135deg,#080E1C 0%,#0E1F3D 50%,#0C2847 100%);padding:28px 24px 48px}
  .hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
  .logo{font-size:16px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo span{color:#2563EB}
  .save-btn{background:#2563EB;border:none;border-radius:20px;padding:8px 20px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit}
  .hdr-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px}
  .hdr-client{font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:14px;line-height:1.15}
  .pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pill-signed{background:rgba(5,150,105,.25);border:1px solid rgba(16,185,129,.4);color:#6EE7B7;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-sent{background:rgba(37,99,235,.25);border:1px solid rgba(59,130,246,.4);color:#93C5FD;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-draft{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.55);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-outline{border:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.5);font-size:10px;font-weight:600;border-radius:20px;padding:4px 12px;display:inline-block}

  /* ── Body ── */
  .body{background:#F5F6F8;border-radius:24px 24px 0 0;margin-top:-24px;padding:20px;display:flex;flex-direction:column;gap:12px;min-height:100vh}

  /* ── Cards ── */
  .card{background:#fff;border-radius:16px;padding:16px}
  .card-blue{background:#fff;border-radius:16px;padding:16px;border:1.5px solid #BFDBFE}
  .card-green{background:#ECFDF5;border-radius:16px;padding:16px;text-align:center}
  .slbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px}

  /* ── Price card ── */
  .price-value{font-size:32px;font-weight:800;color:#2563EB;letter-spacing:-.03em;line-height:1;margin-bottom:6px}
  .price-sub{font-size:12px;color:#94A3B8}

  /* ── Detail rows ── */
  .drow{display:flex;justify-content:space-between;align-items:flex-start;font-size:13px;padding:7px 0;border-bottom:1px solid #EEF0F4;gap:16px}
  .drow:last-child{border-bottom:none}
  .dkey{color:#94A3B8;flex-shrink:0}
  .dval{font-weight:600;color:#0A1628;text-align:right}

  /* ── Openings card ── */
  .svc-head{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
  .svc-title{font-size:13px;font-weight:700;color:#0A1628}
  .svc-pkg{font-size:10px;font-weight:600;color:#2563EB;background:#EFF6FF;border-radius:6px;padding:2px 8px}
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

  /* ── Signature card ── */
  .sig-circle{width:40px;height:40px;background:#059669;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
  .sig-name{font-size:15px;font-weight:700;color:#065F46;margin-bottom:4px}
  .sig-date{font-size:12px;color:#34D399;margin-bottom:12px}
  .sig-img{max-height:60px;display:block;margin:4px auto 0}

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
      ? `<img src="${prof.logo_url}" style="max-width:120px;max-height:40px;object-fit:contain;display:block" alt="${prof?.company_name || 'Logo'}" />`
      : `<div class="logo">Estimate<span>OS</span></div>`
    }
    <button class="save-btn" onclick="window.print()">Save PDF</button>
  </div>
  <div class="hdr-kicker">Prepared for</div>
  <div class="hdr-client">${est.client_name || 'Client'}</div>
  <div class="pills">
    <span class="${statusPillClass}">${statusLabel}</span>
    <span class="pill-outline">Valid until ${validUntil}</span>
  </div>
</div>

<!-- ── BODY ── -->
<div class="body">

  <!-- Card 1: Price -->
  <div class="card-blue">
    <div class="slbl">Estimate Total</div>
    <div class="price-value">${fmtCAD(est.total)}</div>
    <div class="price-sub">inc. ${taxLabel} · Valid until ${validUntil}</div>
  </div>

  <!-- Card 2: Client Details -->
  ${clientDetailRows.length > 0 ? `
  <div class="card">
    <div class="slbl">Client Details</div>
    ${clientDetailRows.map(r => `
    <div class="drow">
      <span class="dkey">${r.label}</span>
      <span class="dval">${r.value}</span>
    </div>`).join('')}
  </div>` : ''}

  <!-- Card 3: Openings -->
  <div class="card">
    <div class="svc-head">
      ${windowSvg}
      <span class="svc-title">Openings (${ops?.length || 0})</span>
    </div>
    ${(ops || []).map((op: any) => {
      const installLabel = op.install ? INSTALL_LABELS[op.install] || op.install : null
      const subParts = [
        op.width_in && op.height_in ? `${op.width_in}" × ${op.height_in}"` : null,
        installLabel,
        op.colour && op.colour !== 'white' ? op.colour.charAt(0).toUpperCase() + op.colour.slice(1) : null,
        op.room || null,
      ].filter(Boolean)
      return `
    <div class="op-row">
      <div>
        <div class="op-name">${OPENING_TYPES[op.type]?.name || op.type} × ${op.qty}</div>
        ${subParts.length > 0 ? `<div class="op-sub">${subParts.join(' · ')}</div>` : ''}
      </div>
      <div class="op-price">${fmtCAD(op.total_cost)}</div>
    </div>`
    }).join('')}
    <div style="margin-top:12px;padding-top:4px">
      <div class="tot-row">
        <span>Subtotal</span>
        <span style="color:#0A1628;font-weight:600">${fmtCAD(est.subtotal)}</span>
      </div>
      ${est.discount_amount > 0 ? `
      <div class="tot-row" style="color:#059669">
        <span>Discount${est.discount_type === 'percent' ? ` (${est.discount_value}%)` : ''}</span>
        <span>−${fmtCAD(est.discount_amount)}</span>
      </div>` : ''}
      <div class="tot-row">
        <span>${taxLabel}</span>
        <span style="color:#0A1628;font-weight:600">${fmtCAD(est.tax_amount)}</span>
      </div>
      <div class="tot-divider"></div>
      <div class="tot-final">
        <span class="tot-lbl">Total</span>
        <span class="tot-val">${fmtCAD(est.total)}</span>
      </div>
    </div>
  </div>

  <!-- Payment schedule -->
  <div class="card" style="border:1px solid #BFDBFE">
    <div class="slbl" style="color:#2563EB">Payment Schedule</div>
    <div class="drow">
      <span class="dkey">Deposit on signing (${depositPct}%)</span>
      <span class="dval">${fmtCAD(depositOnSigning)}</span>
    </div>
    <div class="drow">
      <span class="dkey">Balance on completion</span>
      <span class="dval" style="color:#2563EB">${fmtCAD(depositOnDelivery)}</span>
    </div>
  </div>

  ${contractIntro ? `
  <div class="card">
    <div class="slbl">From ${prof?.company_name || 'Contractor'}</div>
    <div style="font-size:13px;color:#475569;line-height:1.7;margin-top:4px">${contractIntro}</div>
  </div>` : ''}

  ${est.scope_notes ? `
  <div class="card">
    <div class="slbl">Scope of Work</div>
    <div style="font-size:13px;color:#475569;line-height:1.7;margin-top:4px">${est.scope_notes}</div>
  </div>` : ''}

  ${contractTerms ? `
  <div class="card">
    <div class="slbl">Terms &amp; Conditions</div>
    <div style="font-size:11px;color:#64748B;line-height:1.7;white-space:pre-wrap;margin-top:4px">${contractTerms}</div>
  </div>` : ''}

  ${contractRequireSign && est.status !== 'signed' ? `
  <div class="card">
    <div class="slbl">Signature Required</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:12px">
      <div>
        <div style="font-size:10px;color:#94A3B8;margin-bottom:24px">Client</div>
        <div style="height:1px;background:#0A1628;margin-bottom:6px"></div>
        <div style="font-size:10px;color:#94A3B8">${est.client_name || 'Client'} · Date</div>
      </div>
      <div>
        <div style="font-size:10px;color:#94A3B8;margin-bottom:24px">Contractor</div>
        <div style="height:1px;background:#0A1628;margin-bottom:6px"></div>
        <div style="font-size:10px;color:#94A3B8">${prof?.company_name || 'Contractor'} · Date</div>
      </div>
    </div>
  </div>` : ''}

  <!-- Card 4: Signature (signed only) -->
  ${est.status === 'signed' ? `
  <div class="card-green">
    <div class="sig-circle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <div class="sig-name">Signed by ${est.client_name || 'Client'}</div>
    <div class="sig-date">${signedDate}${signedTime ? ` at ${signedTime}` : ''}</div>
    ${est.client_signature_url && !est.client_signature_url.startsWith('data:')
      ? `<img src="${est.client_signature_url}" class="sig-img" alt="Signature" />`
      : ''}
  </div>` : ''}

</div>

<div class="footer">Generated by EstimateOS · estimateos.ca${contractShowLicence ? ` · Lic. ${prof?.licence}` : ''}</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${est.estimate_number}.html"`,
    },
  })
}
