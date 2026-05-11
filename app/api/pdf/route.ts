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
    .select('company_name, city, province, phone, website, licence, insurance, logo_url, deposit_pct')
    .eq('id', est.user_id)
    .single()

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']

  const depositPct: number = prof?.deposit_pct ?? 30
  const depositOnSigning = Math.round(est.total * depositPct / 100)
  const depositOnDelivery = est.total - depositOnSigning

  const coMeta = [
    [prof?.city, prof?.province].filter(Boolean).join(', '),
    prof?.phone,
    prof?.website,
    prof?.licence  ? `Licence: ${prof.licence}`   : null,
    prof?.insurance ? `Insurance: ${prof.insurance}` : null,
  ].filter(Boolean).join('<br>')

  // ── Pre-computed display strings ────────────────────────────────────────────
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
  .toolbar{background:#fff;border-bottom:1px solid #E0E2E7;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20;gap:12px}
  .toolbar-left{display:flex;align-items:center;gap:10px}
  .back-btn{background:#F4F5F7;border:1.5px solid #E0E2E7;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;color:#1A1A1A;cursor:pointer;font-family:inherit;white-space:nowrap}
  .back-btn:hover{background:#EBEBEB}
  .toolbar-label{font-size:12px;color:#9ca3af;white-space:nowrap}
  .print-btn{background:#2045B8;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;white-space:nowrap}
  .print-btn:hover{background:#1a38a0}

  /* ── Document shell ── */
  .doc{max-width:900px;margin:28px auto 48px;background:#fff;border-radius:10px;box-shadow:0 2px 20px rgba(0,0,0,.09);overflow:hidden}

  /* ── Header band ── */
  .doc-header{padding:40px 52px 36px;border-bottom:2px solid #0A0E1A;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:start}
  .co-logo{max-height:60px;max-width:180px;object-fit:contain;margin-bottom:14px;display:block}
  .co-name{font-size:19px;font-weight:800;color:#0A0E1A;margin-bottom:5px;letter-spacing:-.01em}
  .co-detail{font-size:12px;color:#6b7280;line-height:1.75}
  .est-label{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:7px}
  .est-number{font-size:30px;font-weight:800;color:#2045B8;letter-spacing:-.02em;line-height:1}
  .est-meta{font-size:12px;color:#6b7280;margin-top:9px;line-height:1.75;text-align:right}
  .tier-tag{display:inline-block;background:#0A0E1A;color:#fff;font-size:9px;font-weight:700;padding:4px 11px;border-radius:5px;letter-spacing:.08em;margin-top:10px;text-transform:uppercase}

  /* ── Body ── */
  .doc-body{padding:36px 52px 52px}

  /* ── Parties ── */
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding-bottom:28px;border-bottom:1px solid #ECEEF2;margin-bottom:28px}
  .party-lbl{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:9px}
  .party-name{font-size:15px;font-weight:700;color:#0A0E1A;margin-bottom:5px;letter-spacing:-.01em}
  .party-detail{font-size:12px;color:#6b7280;line-height:1.75}

  /* ── Scope ── */
  .scope-section{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #ECEEF2}
  .section-title{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:13px}
  .scope-text{font-size:13px;color:#374151;line-height:1.75;background:#F8F9FB;border-radius:8px;padding:14px 16px}

  /* ── Line items table ── */
  .items-section{margin-bottom:0}
  table{width:100%;border-collapse:collapse}
  thead tr{border-bottom:1.5px solid #0A0E1A}
  th{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;padding:0 12px 11px 0;text-align:left;white-space:nowrap}
  th:last-child{text-align:right;padding-right:0}
  th.center{text-align:center}
  tbody tr:last-child td{border-bottom:none}
  td{padding:14px 12px 14px 0;border-bottom:1px solid #F0F1F3;vertical-align:top;font-size:13px}
  td:last-child{text-align:right;padding-right:0;font-weight:700;color:#0A0E1A}
  td.center{text-align:center}
  td.muted{color:#6b7280}
  .item-name{font-size:13px;font-weight:600;color:#0A0E1A;margin-bottom:3px}
  .item-sub{font-size:11px;color:#9ca3af}

  /* ── Summary ── */
  .summary-wrap{display:flex;justify-content:flex-end;margin-top:28px;padding-top:24px;border-top:1px solid #ECEEF2}
  .summary{width:310px}
  .sum-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:13px;border-bottom:1px solid #F0F1F3}
  .sum-row:first-child{border-top:none}
  .sum-lbl{color:#6b7280}
  .sum-val{font-weight:600;color:#1A1A1A}
  .sum-green .sum-lbl,.sum-green .sum-val{color:#16a34a}
  .sum-divider{height:1.5px;background:#0A0E1A;margin:12px 0 0}
  .sum-total{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 0}
  .sum-total-lbl{font-size:15px;font-weight:700;color:#0A0E1A}
  .sum-total-val{font-size:28px;font-weight:800;color:#2045B8;letter-spacing:-.02em}
  .sum-deposit{background:#F4F5F7;border-radius:9px;padding:13px 16px;margin-top:14px;border:1px solid #E8E9EC}
  .sum-dep-title{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:9px}
  .sum-dep-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:7px}
  .sum-dep-row:last-child{margin-bottom:0}
  .dep-lbl{color:#6b7280}
  .dep-val{font-weight:700;color:#0A0E1A}
  .dep-blue{color:#2045B8}

  /* ── Signature ── */
  .sig-section{margin-top:44px;padding-top:32px;border-top:1px solid #ECEEF2}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:16px}
  .sig-box{padding-top:10px;border-top:1.5px solid #0A0E1A}
  .sig-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:7px}
  .sig-name{font-size:13px;font-weight:600;color:#0A0E1A}
  .sig-date{font-size:11px;color:#9ca3af;margin-top:3px}
  .sig-img{max-height:52px;margin-top:10px;display:block}

  /* ── Footer ── */
  .doc-footer{padding:16px 52px;border-top:1px solid #ECEEF2;background:#F8F9FB;display:flex;justify-content:space-between;align-items:center}
  .footer-detail{font-size:11px;color:#9ca3af}
  .footer-brand{font-size:12px;font-weight:700;color:#0A0E1A;letter-spacing:-.01em}
  .footer-brand span{color:#2045B8}

  /* ── Print ── */
  @media print{
    .toolbar{display:none}
    body{background:#fff}
    .doc{margin:0;border-radius:0;box-shadow:none}
    .doc-header{padding:28px 40px 24px}
    .doc-body{padding:24px 40px 40px}
    .doc-footer{padding:12px 40px}
  }
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="back-btn" onclick="window.location.href='/dashboard/estimates/${id}'">← Back</button>
    <span class="toolbar-label">${est.estimate_number} · ${est.client_name || 'Estimate'}</span>
  </div>
  <button class="print-btn" onclick="window.print()">Save as PDF</button>
</div>

<div class="doc">

  <div class="doc-header">
    <div>
      ${prof?.logo_url ? `<img src="${prof.logo_url}" class="co-logo" alt="${prof?.company_name || ''}" />` : ''}
      <div class="co-name">${prof?.company_name || 'Contractor'}</div>
      ${coMeta ? `<div class="co-detail">${coMeta}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="est-label">Estimate</div>
      <div class="est-number">${est.estimate_number}</div>
      <div class="est-meta">
        Date: ${new Date(est.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}<br>
        Valid until: ${est.valid_until
          ? new Date(est.valid_until + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
          : '30 days from issue'}
      </div>
      <div><span class="tier-tag">${((est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1))} Package</span></div>
    </div>
  </div>

  <div class="doc-body">

    <div class="parties">
      <div>
        <div class="party-lbl">Prepared by</div>
        <div class="party-name">${prof?.company_name || 'Contractor'}</div>
        <div class="party-detail">
          ${[prof?.phone, prof?.website, prof?.licence ? 'Lic. ' + prof.licence : null].filter(Boolean).join('<br>')}
        </div>
      </div>
      <div>
        <div class="party-lbl">Prepared for</div>
        <div class="party-name">${est.client_name || 'Client'}</div>
        <div class="party-detail">
          ${[
            est.client_email,
            est.client_phone,
            est.client_address
              ? est.client_address + (est.client_city ? ', ' + est.client_city : '') + (est.client_province ? ', ' + est.client_province : '')
              : null,
          ].filter(Boolean).join('<br>')}
        </div>
      </div>
    </div>

    ${est.scope_notes ? `
    <div class="scope-section">
      <div class="section-title">Scope of work</div>
      <div class="scope-text">${est.scope_notes}</div>
    </div>` : ''}

    <div class="items-section">
      <div class="section-title">Line items</div>
      <table>
        <thead>
          <tr>
            <th style="width:38%">Description</th>
            <th style="width:16%">Dimensions</th>
            <th class="center" style="width:8%">Qty</th>
            <th style="width:18%;text-align:right">Unit price</th>
            <th style="width:20%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(ops || []).map(op => {
            const installLabel = op.install ? INSTALL_LABELS[op.install] || op.install : null
            const subParts = [installLabel, op.room].filter(Boolean)
            const unitCost: number = op.unit_cost ?? (op.qty > 0 ? op.total_cost / op.qty : op.total_cost)
            return `
          <tr>
            <td>
              <div class="item-name">${OPENING_TYPES[op.type]?.name || op.type}</div>
              ${subParts.length > 0 ? `<div class="item-sub">${subParts.join(' · ')}</div>` : ''}
            </td>
            <td class="muted">${(op.width_in && op.height_in) ? `${op.width_in}" × ${op.height_in}"` : '—'}</td>
            <td class="center muted">${op.qty}</td>
            <td style="text-align:right" class="muted">${fmtCAD(unitCost)}</td>
            <td>${fmtCAD(op.total_cost)}</td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary-wrap">
      <div class="summary">
        <div class="sum-row">
          <span class="sum-lbl">Subtotal</span>
          <span class="sum-val">${fmtCAD(est.subtotal)}</span>
        </div>
        ${est.discount_amount > 0 ? `
        <div class="sum-row sum-green">
          <span class="sum-lbl">Discount${est.discount_type === 'percent' ? ` (${est.discount_value}%)` : ''}</span>
          <span class="sum-val">−${fmtCAD(est.discount_amount)}</span>
        </div>` : ''}
        <div class="sum-row">
          <span class="sum-lbl">${taxLabel}</span>
          <span class="sum-val">${fmtCAD(est.tax_amount)}</span>
        </div>
        ${est.payment_method ? `
        <div class="sum-row">
          <span class="sum-lbl">Payment method</span>
          <span class="sum-val">${est.payment_method}</span>
        </div>` : ''}
        <div class="sum-divider"></div>
        <div class="sum-total">
          <span class="sum-total-lbl">Total</span>
          <span class="sum-total-val">${fmtCAD(est.total)}</span>
        </div>
        <div class="sum-deposit">
          <div class="sum-dep-title">Payment schedule</div>
          <div class="sum-dep-row">
            <span class="dep-lbl">Deposit on signing (${depositPct}%)</span>
            <span class="dep-val">${fmtCAD(depositOnSigning)}</span>
          </div>
          <div class="sum-dep-row">
            <span class="dep-lbl">Balance on completion</span>
            <span class="dep-val dep-blue">${fmtCAD(depositOnDelivery)}</span>
          </div>
        </div>
      </div>
    </div>

    ${est.status === 'signed' ? `
    <div class="sig-section">
      <div class="section-title">Agreement &amp; signatures</div>
      <div class="sig-grid">
        <div class="sig-box">
          <div class="sig-lbl">Client</div>
          <div class="sig-name">${est.client_name || ''}</div>
          <div class="sig-date">${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
          ${est.client_signature_url && !est.client_signature_url.startsWith('data:') ? `<img src="${est.client_signature_url}" class="sig-img" alt="Signature" />` : ''}
        </div>
        <div class="sig-box">
          <div class="sig-lbl">Contractor</div>
          <div class="sig-name">${prof?.company_name || ''}</div>
          <div class="sig-date">${est.signed_at ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
        </div>
      </div>
    </div>` : ''}

  </div>

  <div class="doc-footer">
    <div class="footer-detail">
      ${[prof?.licence ? 'Lic. ' + prof.licence : null, prof?.insurance ? 'Ins. ' + prof.insurance : null].filter(Boolean).join(' · ')}
    </div>
    <div class="footer-brand">Estimate<span>OS</span></div>
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
