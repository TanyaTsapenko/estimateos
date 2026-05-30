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
    .select('company_name, address, city, province, postal_code, phone, email, website, licence, insurance, logo_url, deposit_percent, contract_intro, contract_terms, contract_require_sign, contract_show_licence, signature_url, contractor_signature_url')
    .eq('id', est.user_id)
    .single()

  const { data: contract } = await supabase
    .from('contracts')
    .select('contractor_signature_url, client_signature_url')
    .eq('estimate_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contractorSigUrl: string | null =
    contract?.contractor_signature_url ||
    (prof as any)?.contractor_signature_url ||
    (prof as any)?.signature_url ||
    null

  const clientSigUrl: string | null =
    contract?.client_signature_url ||
    (est.client_signature_url && !est.client_signature_url.startsWith('data:')
      ? est.client_signature_url : null) ||
    null

  const contractIntro = (prof as any)?.contract_intro
    ? ((prof as any).contract_intro as string)
        .replace(/\{client_name\}/g, est.client_name || '')
        .replace(/\{company_name\}/g, prof?.company_name || '')
    : null
  const contractTerms: string | null = (prof as any)?.contract_terms || null
  const contractRequireSign: boolean = (prof as any)?.contract_require_sign ?? true
  const contractShowLicence: boolean = !!(prof as any)?.contract_show_licence && !!prof?.licence

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']

  const depositPct: number = (prof as any)?.deposit_percent ?? 30
  const depositOnSigning = Math.round(est.total * depositPct / 100)
  const depositOnDelivery = est.total - depositOnSigning

  const validUntil = est.valid_until
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.valid_until + 'T00:00:00'))
    : '30 days from issue'

  const issuedDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.created_at))

  const signedDate = est.signed_at
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.signed_at))
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
  .hdr-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;gap:16px}
  .hdr-company{display:flex;flex-direction:column;gap:4px}
  .hdr-company-name{font-size:14px;font-weight:700;color:#fff}
  .hdr-company-sub{font-size:11px;color:rgba(255,255,255,.5)}
  .logo{font-size:16px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo span{color:#2563EB}
  .hdr-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px}
  .hdr-client{font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:14px;line-height:1.15}
  .pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pill-signed{background:rgba(5,150,105,.25);border:1px solid rgba(16,185,129,.4);color:#6EE7B7;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-sent{background:rgba(37,99,235,.25);border:1px solid rgba(59,130,246,.4);color:#93C5FD;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-draft{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.55);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-outline{border:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.5);font-size:10px;font-weight:600;border-radius:20px;padding:4px 12px;display:inline-block}
  .pill-num{background:rgba(37,99,235,.3);border:1px solid rgba(59,130,246,.5);color:#93C5FD;font-size:10px;font-weight:700;border-radius:20px;padding:4px 12px;display:inline-block;font-family:ui-monospace,monospace;letter-spacing:.05em}

  /* ── Body ── */
  .body{background:#F5F6F8;border-radius:24px 24px 0 0;margin-top:-24px;padding:20px 20px 40px;display:flex;flex-direction:column;gap:12px}

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

  /* ── Openings ── */
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
  }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="hdr">
  <div class="hdr-top">
    <div class="hdr-company">
      ${prof?.logo_url
        ? `<img src="${prof.logo_url}" style="max-width:120px;max-height:40px;object-fit:contain;display:block;margin-bottom:6px" alt="${prof?.company_name || 'Logo'}" />`
        : ''
      }
      ${prof?.company_name ? `<div class="hdr-company-name">${prof.company_name}</div>` : ''}
      ${((prof as any)?.address || prof?.city) ? `<div class="hdr-company-sub">${[(prof as any)?.address, prof?.city, [(prof as any)?.postal_code, prof?.province].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>` : ''}
      ${prof?.phone ? `<div class="hdr-company-sub">${prof.phone}</div>` : ''}
      ${(prof as any)?.email && !(prof as any)?.phone ? `<div class="hdr-company-sub">${(prof as any).email}</div>` : ''}
    </div>
  </div>
  <div class="hdr-kicker">Prepared for</div>
  <div class="hdr-client">${est.client_name || 'Client'}</div>
  ${est.client_address ? `<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:-8px;margin-bottom:10px">${est.client_address}</div>` : ''}
  <div class="pills">
    <span class="${statusPillClass}">${statusLabel}</span>
    <span class="pill-num">${est.estimate_number}</span>
    <span class="pill-outline">Valid until ${validUntil}</span>
  </div>
</div>

<!-- ── BODY ── -->
<div class="body">

  <!-- Estimate meta row -->
  <div class="card">
    <div class="drow">
      <span class="dkey">Estimate number</span>
      <span class="dval" style="font-family:ui-monospace,monospace;color:#2563EB">${est.estimate_number}</span>
    </div>
    <div class="drow">
      <span class="dkey">Date issued</span>
      <span class="dval">${issuedDate}</span>
    </div>
    <div class="drow">
      <span class="dkey">Valid until</span>
      <span class="dval">${validUntil}</span>
    </div>
    <div class="drow">
      <span class="dkey">Prepared by</span>
      <span class="dval">${prof?.company_name || 'Contractor'}</span>
    </div>
  </div>

  <!-- Price total -->
  <div class="card-blue">
    <div class="slbl">Estimate Total</div>
    <div class="price-value">${fmtCAD(est.total)}</div>
    <div class="price-sub">inc. ${taxLabel}</div>
  </div>

  <!-- Client Details -->
  ${clientDetailRows.length > 0 ? `
  <div class="card">
    <div class="slbl">Client Details</div>
    ${clientDetailRows.map(r => `
    <div class="drow">
      <span class="dkey">${r.label}</span>
      <span class="dval">${r.value}</span>
    </div>`).join('')}
  </div>` : ''}

  <!-- Line items -->
  <div class="card">
    <div class="slbl">Items (${ops?.length || 0})</div>
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
    <div class="slbl">Notes</div>
    <div style="font-size:13px;color:#475569;line-height:1.7;white-space:pre-wrap;margin-top:4px">${est.scope_notes}</div>
  </div>` : ''}

  ${contractTerms ? `
  <div class="card">
    <div class="slbl">Terms &amp; Conditions</div>
    <div style="font-size:11px;color:#64748B;line-height:1.7;white-space:pre-wrap;margin-top:4px">${contractTerms}</div>
  </div>` : ''}


  <!-- Signed — show both signatures -->
  ${est.status === 'signed' ? `
  <div class="card" style="border:1.5px solid #BBF7D0">
    <div class="slbl" style="color:#059669">Signed &amp; Accepted</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:4px">
      <div>
        <div style="font-size:10px;color:#94A3B8;margin-bottom:8px">Client</div>
        ${clientSigUrl ? `<img src="${clientSigUrl}" style="height:60px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px" alt="Client signature" />` : '<div style="height:52px;margin-bottom:6px"></div>'}
        <div style="height:1px;background:#0A1628;margin-bottom:6px"></div>
        <div style="font-size:11px;font-weight:600;color:#0A1628">${est.client_name || 'Client'}</div>
        <div style="font-size:10px;color:#94A3B8;margin-top:2px">${signedDate}${signedTime ? ` · ${signedTime}` : ''}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#94A3B8;margin-bottom:8px">${prof?.company_name || 'Contractor'}</div>
        ${contractorSigUrl ? `<img src="${contractorSigUrl}" style="height:60px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px" alt="Contractor signature" />` : '<div style="height:52px;margin-bottom:6px"></div>'}
        <div style="height:1px;background:#0A1628;margin-bottom:6px"></div>
        <div style="font-size:11px;font-weight:600;color:#0A1628">${prof?.company_name || 'Contractor'}</div>
      </div>
    </div>
  </div>` : ''}

</div>

<div class="footer">
  ${prof?.company_name ? `<div style="font-size:12px;font-weight:600;color:#64748B;margin-bottom:4px">Prepared by ${prof.company_name}${contractShowLicence ? ` &middot; Lic. ${prof.licence}` : ''}</div>` : ''}
  <div style="font-size:10px;color:#CBD5E1">Powered by ApexScale &middot; useapexscale.com</div>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${est.estimate_number}.html"`,
    },
  })
}
