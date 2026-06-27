import { OPENING_TYPES } from '@/lib/pricing'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'
import { openingSvgString } from '@/lib/openingSvgString'

function fmtCAD(n: number | null | undefined): string {
  return `CA$${(n ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s?: string | null): string {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}
function humanize(s?: string | null): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function sr(label: string, value?: string | null): string {
  if (!value) return ''
  return `<div class="sr"><span class="sl">${esc(label)}</span><span class="sv">${esc(value)}</span></div>`
}
function chip(label: string): string {
  return `<span class="chip">${esc(label)}</span>`
}

export interface EstimateHtmlOptions {
  estimate: any
  openings: any[]
  company: any
  customLabels?: Record<string, string>
  subtypesByType?: Record<string, { key: string; label: string }[]>
}

export function generateEstimateHtml(opts: EstimateHtmlOptions): string {
  const { estimate, openings, company, customLabels, subtypesByType } = opts

  const depositPct   = estimate.deposit_percent || 0
  const depositAmt   = (estimate.total || 0) * (depositPct / 100)
  const balanceAmt   = (estimate.total || 0) - depositAmt
  const contactEmail = company.company_contact_email || company.email || ''
  const companyName  = company.company_name || [company.first_name, company.last_name].filter(Boolean).join(' ') || 'Your Company'
  const location     = [company.city, company.province].filter(Boolean).join(', ')

  const projectSite = estimate.job_site_same_as_client === false && estimate.job_site_address
    ? [estimate.job_site_address, estimate.job_site_city, estimate.job_site_province, estimate.job_site_postal_code].filter(Boolean).join(', ')
    : [estimate.client_address, estimate.client_city, estimate.client_province, estimate.client_postal_code].filter(Boolean).join(', ')

  // ── Opening cards ───────────────────────────────────────────────────────
  const openingCards = openings.map((op: any, i: number) => {
    const typeName  = customLabels?.[op.type] || OPENING_TYPES[op.type]?.name || humanize(op.type)
    const subLabel  = getSubtypeLabel(op, subtypesByType)
    const extColour = getColourLabel(op)
    const intColour = getInteriorColourLabel(op)
    const gridVal   = op.grid ? (op.grille_type ? humanize(op.grille_type) : 'Yes') : null
    const floorVal  = op.floor && op.floor !== 'first' ? humanize(op.floor) : null
    const paneLabel = op.pane === 'triple' ? 'Triple Pane' : op.pane === 'single' ? 'Single Pane' : null

    const title = [
      op.qty > 1 ? `${op.qty}×` : null,
      typeName,
      subLabel ? `(${subLabel})` : null,
      op.room ? `— ${op.room}` : null,
    ].filter(Boolean).join(' ')

    const chips: string[] = []
    if (paneLabel) chips.push(paneLabel)
    if (op.glass_kind && op.glass_kind !== 'clear') chips.push(humanize(op.glass_kind))
    if (op.low_e)           chips.push('Low-E')
    if (op.argon)           chips.push('Argon')
    if (op.tempered)        chips.push('Tempered')
    if (op.laminated_glass) chips.push('Laminated')

    const svgStr = openingSvgString(op)

    return `
<div class="card">
  <div class="card-hdr">
    <span class="card-num">${i + 1}</span>
    <span class="card-title">${esc(title)}</span>
    <span class="card-price">${fmtCAD(op.total_cost)}</span>
  </div>
  <div class="card-body">
    <div class="card-drawing">${svgStr}</div>
    <div class="card-specs">
      ${op.room || floorVal ? `<div class="grp">Location</div>${sr('Room', op.room)}${sr('Floor', floorVal)}` : ''}
      <div class="grp">Product</div>
      ${sr('Size', op.width_in && op.height_in ? `${op.width_in}" × ${op.height_in}"` : null)}
      ${sr('Material', humanize(op.material))}
      ${sr('Ext. colour', extColour || null)}
      ${sr('Int. colour', intColour || null)}
      ${sr('Grid', gridVal)}
      ${sr('Installation', humanize(op.install))}
      ${chips.length ? `<div class="grp">Glass</div><div class="chips">${chips.map(chip).join('')}</div>` : ''}
      ${op.notes ? `<div class="grp">Notes</div><div class="notes">${esc(op.notes)}</div>` : ''}
    </div>
  </div>
</div>`
  }).join('')

  // ── Trim section ────────────────────────────────────────────────────────
  const trimHtml = hasTrim(estimate) ? `
<div class="section-label">Trim &amp; Finishing</div>
<div class="trim-table">
  ${trimSummaryLines(estimate).map(({ label, value }) =>
    `<div class="trim-row"><span class="trim-label">${esc(label)}</span><span class="trim-value">${esc(value)}</span></div>`
  ).join('')}
</div>` : ''

  // ── Totals ──────────────────────────────────────────────────────────────
  const discountRow = estimate.discount_amount > 0
    ? `<div class="tot-row"><span>Discount</span><span class="green">−${fmtCAD(estimate.discount_amount)}</span></div>`
    : ''

  const depositBox = depositPct > 0 ? `
<div class="deposit-box">
  <div class="dep-label">Deposit required (${depositPct}%)</div>
  <div class="dep-amt">${fmtCAD(depositAmt)}</div>
  <div class="dep-bal">Balance due on completion: ${fmtCAD(balanceAmt)}</div>
</div>` : ''

  // ── Bottom info boxes ───────────────────────────────────────────────────
  const warrantyHtml = company.warranty_summary ? `
<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Warranty</div>
    <div class="info-body">${esc(company.warranty_summary)}</div>
  </div>
  <div class="info-box" style="margin-left:12px">
    <div class="info-label">Estimate validity</div>
    <div class="info-body">${estimate.valid_until ? `Valid until ${fmtDate(estimate.valid_until)}` : 'Contact us for current pricing after 30 days.'}</div>
  </div>
</div>` : estimate.valid_until ? `
<div class="info-grid">
  <div class="info-box" style="max-width:300px">
    <div class="info-label">Estimate validity</div>
    <div class="info-body">Valid until ${fmtDate(estimate.valid_until)}</div>
  </div>
</div>` : ''

  // ── Footer ──────────────────────────────────────────────────────────────
  const footerLeft = [
    companyName,
    company.licence ? `Lic# ${company.licence}` : null,
    company.gst_hst_number ? `GST/HST# ${company.gst_hst_number}` : null,
    company.wsib_number ? `WSIB/WCB# ${company.wsib_number}` : null,
  ].filter(Boolean).join(' · ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estimate ${esc(estimate.estimate_number || '')} — ${esc(estimate.client_name || '')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#0A1628;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:780px;margin:0 auto;padding:28px 32px}

/* Header */
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #2563EB;margin-bottom:14px}
.hdr-left{flex:1;margin-right:20px}
.logo-img{max-height:50px;max-width:160px;object-fit:contain;display:block;margin-bottom:5px}
.co-name{font-size:15px;font-weight:700;color:#0A1628;margin-bottom:3px}
.co-info{font-size:10px;color:#64748B;line-height:1.6}
.hdr-right{text-align:right;min-width:160px}
.badge{display:inline-block;background:#2563EB;color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;border-radius:4px;padding:3px 10px;margin-bottom:8px}
.doc-num{font-size:13px;font-weight:700;color:#0A1628;margin-bottom:3px}
.doc-meta{font-size:10px;color:#64748B;line-height:1.6}

/* Meta boxes */
.meta-row{display:flex;gap:10px;margin-bottom:14px}
.meta-box{flex:1;background:#F8FAFC;border-radius:6px;padding:10px}
.meta-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94A3B8;margin-bottom:5px}
.meta-name{font-size:12px;font-weight:700;color:#0A1628;margin-bottom:2px}
.meta-val{font-size:10px;color:#64748B;line-height:1.6}

/* Section label */
.section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#2563EB;margin-bottom:7px;margin-top:2px}

/* Opening cards */
.card{border:1px solid #E2E8F0;border-radius:6px;margin-bottom:8px;page-break-inside:avoid;break-inside:avoid}
.card-hdr{display:flex;align-items:center;background:#F8FAFC;padding:7px 12px;border-radius:6px 6px 0 0}
.card-num{font-size:9px;font-weight:700;color:#94A3B8;width:20px;flex-shrink:0}
.card-title{font-size:11px;font-weight:700;color:#0A1628;flex:1}
.card-price{font-size:11px;font-weight:700;color:#2563EB}
.card-body{display:flex;padding:10px;gap:14px}
.card-drawing{width:110px;flex-shrink:0;display:flex;align-items:flex-start;justify-content:center;padding-top:4px}
.card-drawing svg{width:110px;height:auto;display:block}
.card-specs{flex:1;min-width:0}

/* Spec rows */
.sr{display:flex;margin-bottom:3px;font-size:10px}
.sl{color:#94A3B8;width:96px;flex-shrink:0}
.sv{color:#0A1628;flex:1}
.grp{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#94A3B8;margin-top:8px;margin-bottom:3px;border-bottom:0.5px solid #E2E8F0;padding-bottom:2px}
.card-specs .grp:first-child{margin-top:0}
.chips{margin-top:3px}
.chip{display:inline-block;border:1px solid #2563EB;border-radius:3px;padding:1px 5px;font-size:9px;color:#2563EB;font-weight:700;margin:0 3px 3px 0}
.notes{font-size:10px;color:#64748B;line-height:1.5;font-style:italic}

/* Trim */
.trim-table{border:1px solid #E2E8F0;border-radius:6px;padding:8px 12px;margin-bottom:10px}
.trim-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid #F1F5F9;font-size:10px}
.trim-row:last-child{border-bottom:none}
.trim-label{color:#64748B}
.trim-value{font-weight:700;color:#0A1628}

/* Bottom half: notes + totals */
.bottom-half{display:flex;gap:20px;margin-top:10px}
.notes-col{flex:3}
.notes-body{font-size:11px;color:#64748B;line-height:1.6;white-space:pre-wrap}
.totals-col{flex:2}
.tot-row{display:flex;justify-content:space-between;font-size:10px;color:#64748B;padding:3px 0;border-bottom:0.5px solid #E2E8F0}
.tot-final{display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding-top:6px;margin-top:2px}
.tot-final-lbl{color:#0A1628}
.tot-final-val{color:#2563EB}
.green{color:#16a34a}
.deposit-box{background:#EEF3FF;border-radius:6px;padding:10px;margin-top:8px}
.dep-label{font-size:9px;color:#1D4ED8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
.dep-amt{font-size:14px;font-weight:700;color:#1D4ED8}
.dep-bal{font-size:9px;color:#1D4ED8;margin-top:3px}

/* Info boxes */
.info-grid{display:flex;margin-top:14px}
.info-box{flex:1;background:#F8FAFC;border-radius:6px;padding:10px}
.info-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94A3B8;margin-bottom:5px}
.info-body{font-size:10px;color:#64748B;line-height:1.6}

/* Footer */
.footer{margin-top:20px;padding-top:10px;border-top:0.5px solid #E2E8F0;display:flex;justify-content:space-between;font-size:9px;color:#94A3B8}

@media print{
  @page{margin:0;size:letter}
  .page{padding:15mm;max-width:none}
  .no-print{display:none}
}
</style>
</head>
<body>
<div class="page">

<!-- Header -->
<div class="hdr">
  <div class="hdr-left">
    ${company.logo_url
      ? `<img src="${esc(company.logo_url)}" class="logo-img" alt="${esc(companyName)}" crossorigin="anonymous"/>`
      : `<div class="co-name">${esc(companyName)}</div>`}
    ${company.logo_url ? `<div class="co-name">${esc(companyName)}</div>` : ''}
    <div class="co-info">
      ${[
        contactEmail,
        company.phone,
        company.website,
        location,
        company.address,
        company.licence ? `Lic# ${company.licence}` : null,
        company.gst_hst_number ? `GST/HST# ${company.gst_hst_number}` : null,
        company.wsib_number ? `WSIB/WCB# ${company.wsib_number}` : null,
      ].filter(Boolean).map(esc).join(' &middot; ')}
    </div>
  </div>
  <div class="hdr-right">
    <div class="badge">ESTIMATE</div>
    <div class="doc-num">${esc(estimate.estimate_number || '')}</div>
    <div class="doc-meta">Date: ${fmtDate(estimate.created_at)}</div>
    ${estimate.valid_until ? `<div class="doc-meta">Valid until: ${fmtDate(estimate.valid_until)}</div>` : ''}
  </div>
</div>

<!-- Meta boxes -->
<div class="meta-row">
  <div class="meta-box">
    <div class="meta-lbl">Prepared for</div>
    <div class="meta-name">${esc(estimate.client_name || '—')}</div>
    ${estimate.client_address ? `<div class="meta-val">${esc([estimate.client_address, estimate.client_city, estimate.client_province].filter(Boolean).join(', '))}</div>` : ''}
    ${estimate.client_phone ? `<div class="meta-val">${esc(estimate.client_phone)}</div>` : ''}
    ${estimate.client_email ? `<div class="meta-val">${esc(estimate.client_email)}</div>` : ''}
  </div>
  <div class="meta-box">
    <div class="meta-lbl">Project site</div>
    ${projectSite ? `<div class="meta-name">${esc(projectSite)}</div>` : '<div class="meta-val">Same as client address</div>'}
  </div>
  <div class="meta-box">
    <div class="meta-lbl">Summary</div>
    <div class="meta-name">${openings.length} opening${openings.length !== 1 ? 's' : ''}</div>
    <div class="meta-val">Total incl. tax: ${fmtCAD(estimate.total)}</div>
    ${depositPct > 0 ? `<div class="meta-val">Deposit (${depositPct}%): ${fmtCAD(depositAmt)}</div>` : ''}
  </div>
</div>

<!-- Scope of work -->
<div class="section-label">Scope of work</div>
${openingCards}

${trimHtml}

<!-- Totals + Notes -->
<div class="bottom-half">
  ${estimate.scope_notes ? `
  <div class="notes-col">
    <div class="section-label" style="margin-top:6px">Notes</div>
    <div class="notes-body">${esc(estimate.scope_notes)}</div>
  </div>` : ''}
  <div class="totals-col" style="${!estimate.scope_notes ? 'margin-left:auto;min-width:220px' : ''}">
    <div class="tot-row"><span>Subtotal</span><span>${fmtCAD(estimate.subtotal)}</span></div>
    ${discountRow}
    <div class="tot-row"><span>Tax</span><span>${fmtCAD(estimate.tax_amount)}</span></div>
    <div class="tot-final">
      <span class="tot-final-lbl">Total</span>
      <span class="tot-final-val">${fmtCAD(estimate.total)}</span>
    </div>
    ${depositBox}
  </div>
</div>

${warrantyHtml}

<!-- Footer -->
<div class="footer">
  <span>${esc(footerLeft)}</span>
  <span>Powered by ApexScale &middot; useapexscale.com</span>
</div>

</div>
</body>
</html>`
}
