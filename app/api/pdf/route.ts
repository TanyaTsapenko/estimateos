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

  const coMeta = [
    [prof?.city, prof?.province].filter(Boolean).join(', '),
    prof?.phone,
    prof?.website,
    prof?.licence   ? `Lic. ${prof.licence}`      : null,
    prof?.insurance ? `Ins. ${prof.insurance}`     : null,
  ].filter(Boolean).join('<br>')

  const createdDate = new Date(est.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  const validUntil  = est.valid_until
    ? new Date(est.valid_until + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : '30 days from issue'
  const tierLabel   = ((est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)) + ' Package'
  const clientHdr   = [
    [est.client_address, est.client_city, est.client_province].filter(Boolean).join(', '),
    est.client_email,
  ].filter(Boolean).join('<br>')
  const signedDate  = est.signed_at
    ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const gridSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="#94A3B8"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="#94A3B8"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="#94A3B8"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="#94A3B8"/></svg>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${est.estimate_number} — ${est.client_name || 'Estimate'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#ECEEF2;color:#0A1628;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Toolbar ── */
  .toolbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:12px 48px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20}
  .back-btn{background:transparent;border:1.5px solid #E2E8F0;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;color:#64748B;cursor:pointer;font-family:inherit}
  .back-btn:hover{background:#F8FAFC}
  .save-btn{background:#2563EB;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit}
  .save-btn:hover{background:#1D4ED8}

  /* ── Document shell ── */
  .doc{max-width:860px;margin:28px auto 48px;background:#fff;border-radius:12px;box-shadow:0 0 0 1px rgba(10,22,40,.07),0 4px 24px rgba(10,22,40,.06);overflow:hidden}

  /* ── Header ── */
  .doc-header{background:#0A1628;padding:28px 40px 32px}
  .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  .logo-mark{font-size:15px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo-mark span{color:#3B82F6}
  .est-num{font-family:ui-monospace,'Cascadia Code',monospace;font-size:13px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.04em}
  .header-main{display:grid;grid-template-columns:1fr auto;gap:32px;align-items:start}
  .hdr-kicker{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3B82F6;margin-bottom:6px}
  .hdr-client{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:6px;line-height:1.1}
  .hdr-sub{font-size:12px;color:rgba(255,255,255,.42);line-height:1.6}
  .hdr-right{text-align:right}
  .tier-pill{display:inline-block;background:rgba(59,130,246,.18);border:1px solid rgba(59,130,246,.35);color:#93C5FD;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:20px;padding:3px 10px;margin-bottom:10px}
  .hdr-total{font-size:36px;font-weight:800;color:#fff;letter-spacing:-.03em;line-height:1;margin-bottom:6px}
  .hdr-meta{font-size:11px;color:rgba(255,255,255,.38);line-height:1.6}

  /* ── Body ── */
  .doc-body{padding:32px 40px 40px;background:#fff}

  /* ── Info cards ── */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .info-card{background:#F8FAFC;border-radius:10px;padding:16px 18px}
  .card-lbl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px}
  .card-title{font-size:14px;font-weight:700;color:#0A1628;margin-bottom:5px}
  .card-detail{font-size:12px;color:#64748B;line-height:1.7}

  /* ── Services card ── */
  .svc-card{background:#fff;border:1px solid rgba(10,22,40,.07);border-radius:10px;padding:20px 22px;margin-bottom:24px}
  .svc-head{display:flex;align-items:center;gap:8px;margin-bottom:16px}
  .svc-head-title{font-size:13px;font-weight:700;color:#0A1628}
  table{width:100%;border-collapse:collapse}
  thead tr{border-top:2px solid #0A1628}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;padding:10px 0;text-align:left;white-space:nowrap}
  th:last-child{text-align:right}
  th.center{text-align:center}
  tbody tr{border-bottom:.5px solid rgba(10,22,40,.06)}
  tbody tr:last-child{border-bottom:none}
  td{padding:13px 0;vertical-align:top;font-size:13px;color:#0A1628}
  td:last-child{text-align:right;font-weight:700}
  td.center{text-align:center}
  td.muted{color:#64748B;font-weight:400}
  .item-name{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:2px}
  .item-sub{font-size:11px;color:#94A3B8}

  /* ── Price breakdown ── */
  .pricing-wrap{display:flex;justify-content:flex-end;margin-bottom:24px}
  .pricing{width:260px}
  .price-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:13px;border-bottom:.5px solid rgba(10,22,40,.06)}
  .price-lbl{color:#64748B}
  .price-val{font-weight:600;color:#0A1628}
  .price-green .price-lbl,.price-green .price-val{color:#059669}
  .price-divider{height:1.5px;background:#0A1628;margin:8px 0}
  .price-total{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 0}
  .price-total-lbl{font-size:14px;font-weight:700;color:#0A1628}
  .price-total-val{font-size:28px;font-weight:800;color:#2563EB;letter-spacing:-.02em}

  /* ── Payment schedule ── */
  .payment-card{background:#F0F7FF;border:1px solid rgba(37,99,235,.15);border-radius:10px;padding:14px 18px;margin-bottom:24px}
  .payment-lbl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:10px}
  .pay-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px}
  .pay-row:last-child{margin-bottom:0}
  .pay-key{color:#64748B}
  .pay-val{font-weight:700;color:#0A1628}
  .pay-blue{color:#2563EB}

  /* ── Scope notes ── */
  .scope-card{background:#F8FAFC;border-radius:10px;padding:16px 18px;margin-bottom:24px}
  .scope-text{font-size:13px;color:#475569;line-height:1.7;margin-top:8px}

  /* ── Contract intro / terms ── */
  .contract-intro{background:#F8FAFC;border-radius:10px;padding:16px 18px;margin-bottom:24px}
  .contract-terms{background:#F8FAFC;border-radius:10px;padding:16px 18px;margin-bottom:24px}
  .contract-terms .scope-text{font-size:11px;color:#64748B;white-space:pre-wrap;line-height:1.7}

  /* ── Signature line (unsigned) ── */
  .sig-line-banner{background:#F8FAFC;border:1px solid #E2E5EA;border-radius:10px;padding:18px 22px;margin-bottom:24px}
  .sig-line-title{font-size:9px;font-weight:700;color:#94A3B8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .sig-line-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}
  .sig-line-col .sig-col-lbl{margin-bottom:20px}
  .sig-line-bar{height:1px;background:#0A1628;margin-bottom:6px}
  .sig-line-hint{font-size:10px;color:#94A3B8}

  /* ── Signature banner ── */
  .sig-banner{background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.2);border-radius:10px;padding:18px 22px}
  .sig-banner-title{font-size:11px;font-weight:700;color:#059669;letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .sig-col-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px}
  .sig-col-name{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:3px}
  .sig-col-date{font-size:11px;color:#94A3B8}
  .sig-col-img{max-height:48px;margin-top:8px;display:block}

  /* ── Footer ── */
  .doc-footer{padding:14px 40px;border-top:1px solid rgba(10,22,40,.06);display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-size:11px;font-weight:600;color:#94A3B8}
  .footer-right{font-size:11px;color:#94A3B8}

  /* ── Print ── */
  @media print{
    .toolbar{display:none}
    body{background:#fff}
    .doc{margin:0;border-radius:0;box-shadow:none}
    .doc-body{padding:24px 40px 40px}
    .doc-footer{padding:12px 40px}
  }
</style>
</head>
<body>

<div class="toolbar">
  <button class="back-btn" onclick="window.location.href='/dashboard/estimates/${id}'">← Back</button>
  <button class="save-btn" onclick="window.print()">Save as PDF</button>
</div>

<div class="doc">

  <div class="doc-header">
    <div class="header-top">
      ${prof?.logo_url
        ? `<img src="${prof.logo_url}" style="max-width:120px;max-height:40px;object-fit:contain;display:block" alt="${prof?.company_name || 'Logo'}" />`
        : `<div class="logo-mark">Estimate<span>OS</span></div>`
      }
      <div class="est-num">${est.estimate_number}</div>
    </div>
    <div class="header-main">
      <div>
        <div class="hdr-kicker">Prepared for</div>
        <div class="hdr-client">${est.client_name || 'Client'}</div>
        ${clientHdr ? `<div class="hdr-sub">${clientHdr}</div>` : ''}
      </div>
      <div class="hdr-right">
        <div><span class="tier-pill">${tierLabel}</span></div>
        <div class="hdr-total">${fmtCAD(est.total)}</div>
        <div class="hdr-meta">inc. ${taxLabel} · Valid until ${validUntil}</div>
      </div>
    </div>
  </div>

  <div class="doc-body">

    <div class="info-grid">
      <div class="info-card">
        <div class="card-lbl">Prepared by</div>
        <div class="card-title">${prof?.company_name || 'Contractor'}</div>
        <div class="card-detail">${coMeta}</div>
      </div>
      <div class="info-card">
        <div class="card-lbl">Details</div>
        <div class="card-detail">
          <strong style="color:#0A1628;font-size:12px">Date:</strong> ${createdDate}<br>
          <strong style="color:#0A1628;font-size:12px">Valid until:</strong> ${validUntil}${est.payment_method ? `<br><strong style="color:#0A1628;font-size:12px">Payment:</strong> ${est.payment_method}` : ''}
        </div>
      </div>
    </div>

    ${contractIntro ? `
    <div class="contract-intro">
      <div class="card-lbl">From ${prof?.company_name || 'Contractor'}</div>
      <div class="scope-text">${contractIntro}</div>
    </div>` : ''}

    <div class="svc-card">
      <div class="svc-head">
        ${gridSvg}
        <div class="svc-head-title">Services</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40%">Description</th>
            <th style="width:20%">Size</th>
            <th class="center" style="width:8%">Qty</th>
            <th style="width:32%;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(ops || []).map(op => {
            const installLabel = op.install ? INSTALL_LABELS[op.install] || op.install : null
            const subParts = [installLabel, op.room].filter(Boolean)
            return `
          <tr>
            <td>
              <div class="item-name">${OPENING_TYPES[op.type]?.name || op.type}</div>
              ${subParts.length > 0 ? `<div class="item-sub">${subParts.join(' · ')}</div>` : ''}
            </td>
            <td class="muted">${(op.width_in && op.height_in) ? `${op.width_in}" × ${op.height_in}"` : '—'}</td>
            <td class="center muted">${op.qty}</td>
            <td>${fmtCAD(op.total_cost)}</td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="pricing-wrap">
      <div class="pricing">
        <div class="price-row">
          <span class="price-lbl">Subtotal</span>
          <span class="price-val">${fmtCAD(est.subtotal)}</span>
        </div>
        ${est.discount_amount > 0 ? `
        <div class="price-row price-green">
          <span class="price-lbl">Discount${est.discount_type === 'percent' ? ` (${est.discount_value}%)` : ''}</span>
          <span class="price-val">−${fmtCAD(est.discount_amount)}</span>
        </div>` : ''}
        <div class="price-row">
          <span class="price-lbl">${taxLabel}</span>
          <span class="price-val">${fmtCAD(est.tax_amount)}</span>
        </div>
        <div class="price-divider"></div>
        <div class="price-total">
          <span class="price-total-lbl">Total</span>
          <span class="price-total-val">${fmtCAD(est.total)}</span>
        </div>
      </div>
    </div>

    <div class="payment-card">
      <div class="payment-lbl">Payment schedule</div>
      <div class="pay-row">
        <span class="pay-key">Deposit on signing (${depositPct}%)</span>
        <span class="pay-val">${fmtCAD(depositOnSigning)}</span>
      </div>
      <div class="pay-row">
        <span class="pay-key">Balance on completion</span>
        <span class="pay-val pay-blue">${fmtCAD(depositOnDelivery)}</span>
      </div>
    </div>

    ${est.scope_notes ? `
    <div class="scope-card">
      <div class="card-lbl">Scope of work</div>
      <div class="scope-text">${est.scope_notes}</div>
    </div>` : ''}

    ${contractTerms ? `
    <div class="contract-terms">
      <div class="card-lbl">Terms &amp; Conditions</div>
      <div class="scope-text">${contractTerms}</div>
    </div>` : ''}

    ${contractRequireSign && est.status !== 'signed' ? `
    <div class="sig-line-banner">
      <div class="sig-line-title">Signature required to accept estimate</div>
      <div class="sig-line-grid">
        <div class="sig-line-col">
          <div class="sig-col-lbl">Client</div>
          <div class="sig-line-bar"></div>
          <div class="sig-line-hint">${est.client_name || 'Client'} &nbsp;·&nbsp; Date</div>
        </div>
        <div class="sig-line-col">
          <div class="sig-col-lbl">Contractor</div>
          <div class="sig-line-bar"></div>
          <div class="sig-line-hint">${prof?.company_name || 'Contractor'} &nbsp;·&nbsp; Date</div>
        </div>
      </div>
    </div>` : ''}

    ${est.status === 'signed' ? `
    <div class="sig-banner">
      <div class="sig-banner-title">Signed &amp; agreed</div>
      <div class="sig-grid">
        <div>
          <div class="sig-col-lbl">Client</div>
          <div class="sig-col-name">${est.client_name || ''}</div>
          <div class="sig-col-date">${signedDate}</div>
          ${est.client_signature_url && !est.client_signature_url.startsWith('data:') ? `<img src="${est.client_signature_url}" class="sig-col-img" alt="Signature" />` : ''}
        </div>
        <div>
          <div class="sig-col-lbl">Contractor</div>
          <div class="sig-col-name">${prof?.company_name || ''}</div>
          <div class="sig-col-date">${signedDate}</div>
        </div>
      </div>
    </div>` : ''}

  </div>

  <div class="doc-footer">
    <div class="footer-left">${prof?.company_name || 'EstimateOS'}</div>
    <div class="footer-right">${contractShowLicence ? `Lic. ${prof?.licence}` : 'Generated by EstimateOS'}</div>
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
