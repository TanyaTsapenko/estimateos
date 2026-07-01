import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { substituteProvince } from '@/lib/provinces'
import { openingSvgString } from '@/lib/openingSvgString'
import { getSubtypeLabel, getColourLabel, getInteriorColourLabel } from '@/lib/openingLabels'
import { hasTrim, trimSummaryLines } from '@/lib/v2/trimUtils'

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function humanize(s?: string | null): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(s?: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get('contractId')

  // ── Signed contract view (public, by contractId) ──────────────────────────
  if (contractId) {
    const admin = createAdminClient()
    const { data: con } = await admin.from('contracts').select('*').eq('id', contractId).single()
    if (!con) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const [{ data: est }, { data: ops }, { data: prof }, { data: priceRows }, { data: subtypeRows }] = await Promise.all([
      admin.from('estimates').select('*').eq('id', con.estimate_id).single(),
      admin.from('estimate_openings').select('*').eq('estimate_id', con.estimate_id).order('sort_order'),
      admin.from('profiles').select('company_name, first_name, last_name, email, address, city, province, phone, website, licence, insurance, logo_url, signature_url, warranty_period, completion_timeframe, payment_methods, project_manager, contract_clauses, deposit_timing, wsib_number, gst_hst_number, signing_rep_name, signing_rep_title').eq('id', con.profile_id).single(),
      admin.from('price_lists').select('opening_type, custom_label').eq('user_id', con.profile_id).neq('opening_type', '_sizes'),
      admin.from('window_subtypes').select('type_key, subtype_key, subtype_label').order('sort_order'),
    ])

    if (!est) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const customLabels: Record<string, string> = {}
    priceRows?.forEach((r: any) => { if (r.custom_label) customLabels[r.opening_type] = r.custom_label })
    const subtypesByType: Record<string, { key: string; label: string }[]> = {}
    subtypeRows?.forEach((r: any) => {
      if (!subtypesByType[r.type_key]) subtypesByType[r.type_key] = []
      subtypesByType[r.type_key].push({ key: r.subtype_key, label: r.subtype_label })
    })

    const p = prof as any
    const companyName  = p?.company_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Contractor'
    const conNum       = 'CON-' + con.id.slice(0, 6).toUpperCase()
    const signedFmt    = fmtDate(con.signed_at || con.created_at)
    const payMethods: string[] = Array.isArray(p?.payment_methods) ? p.payment_methods : []

    const depositPct = (est as any).deposit_percent || 0
    const depositAmt = ((est as any).total || 0) * (depositPct / 100)
    const balanceAmt = ((est as any).total || 0) - depositAmt

    // ── Opening cards ──────────────────────────────────────────────────────
    const opCards = (ops || []).map((op: any, i: number) => {
      const typeName  = customLabels[op.type] || OPENING_TYPES[op.type]?.name || humanize(op.type)
      const subLabel  = getSubtypeLabel(op, subtypesByType)
      const title     = [op.qty > 1 ? `${op.qty}×` : null, typeName, subLabel ? `(${subLabel})` : null, op.room ? `— ${esc(op.room)}` : null].filter(Boolean).join(' ')
      const extColour = getColourLabel(op)
      const intColour = getInteriorColourLabel(op)
      const gridVal   = op.grid ? (op.grille_type ? humanize(op.grille_type) : 'Yes') : null
      const floorVal  = op.floor && op.floor !== 'first' ? humanize(op.floor) : null
      const paneLabel = op.pane === 'triple' ? 'Triple Pane' : op.pane === 'single' ? 'Single Pane' : null
      const glassChips: string[] = []
      if (paneLabel)                                   glassChips.push(paneLabel)
      if (op.glass_kind && op.glass_kind !== 'clear') glassChips.push(humanize(op.glass_kind))
      if (op.low_e)           glassChips.push('Low-E')
      if (op.argon)           glassChips.push('Argon')
      if (op.tempered)        glassChips.push('Tempered')
      if (op.laminated_glass) glassChips.push('Laminated')

      const drawUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(openingSvgString(op))}`

      const SR = (label: string, val: string | null | undefined) =>
        val ? `<div class="sr"><span class="sl">${label}</span><span class="sv">${esc(val)}</span></div>` : ''

      return `
<div class="card">
  <div class="card-hdr">
    <span class="cn">${i + 1}</span>
    <span class="ct">${title}</span>
    <span class="cp">${fmtCAD(op.total_cost || 0)}</span>
  </div>
  <div class="card-body">
    <div class="draw-col">
      <img src="${drawUri}" class="draw-img" alt="${esc(typeName)}" />
      ${op.width_in ? `<div class="dim-w">${op.width_in}"</div>` : ''}
    </div>
    <div class="specs-col">
      ${(op.room || floorVal) ? `
        <div class="grp">Location</div>
        ${SR('Room', op.room)}
        ${SR('Floor', floorVal)}
      ` : ''}
      <div class="grp">Product</div>
      ${op.width_in && op.height_in ? SR('Size', `${op.width_in}" × ${op.height_in}"`) : ''}
      ${SR('Material', humanize(op.material))}
      ${SR('Ext. colour', extColour || null)}
      ${SR('Int. colour', intColour || null)}
      ${SR('Grid', gridVal)}
      ${SR('Installation', humanize(op.install))}
      ${glassChips.length ? `
        <div class="grp">Glass</div>
        <div class="chips">${glassChips.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      ` : ''}
      ${op.notes ? `<div class="grp">Notes</div><div class="notes">${esc(op.notes)}</div>` : ''}
    </div>
  </div>
</div>`
    }).join('')

    // ── Trim section ───────────────────────────────────────────────────────
    const trimHtml = hasTrim(est as any) ? `
<div class="sec-lbl">Trim &amp; Finishing</div>
${trimSummaryLines(est as any).map(l =>
  `<div class="trim-row"><span class="tl">${esc(l.label)}</span><span class="tv">${esc(l.value)}</span></div>`
).join('')}` : ''

    // ── Price summary ──────────────────────────────────────────────────────
    const discountHtml = (est as any).discount_amount > 0 ? `
<div class="tot-row"><span class="tol">Discount</span><span class="tov">−${fmtCAD((est as any).discount_amount)}</span></div>` : ''

    const depositHtml = depositPct > 0 ? `
<div class="dep-grid">
  <div class="dep-box">
    <div class="dep-lbl">Deposit on signing (${depositPct}%)</div>
    <div class="dep-amt">${fmtCAD(depositAmt)}</div>
  </div>
  <div class="dep-box">
    <div class="dep-lbl">Balance on completion</div>
    <div class="dep-amt">${fmtCAD(balanceAmt)}</div>
  </div>
</div>` : ''

    // ── Contract details ───────────────────────────────────────────────────
    const detailBoxes = [
      p?.warranty_period       ? `<div class="det-box"><div class="det-lbl">Warranty</div><div class="det-val">${esc(p.warranty_period)}</div></div>` : '',
      p?.completion_timeframe  ? `<div class="det-box"><div class="det-lbl">Completion Timeframe</div><div class="det-val">${esc(p.completion_timeframe)}</div></div>` : '',
      payMethods.length        ? `<div class="det-box"><div class="det-lbl">Payment Methods</div><div class="det-val">${payMethods.map(esc).join(', ')}</div></div>` : '',
      p?.project_manager       ? `<div class="det-box"><div class="det-lbl">Project Manager</div><div class="det-val">${esc(p.project_manager)}</div></div>` : '',
    ].filter(Boolean).join('')
    const detailHtml = detailBoxes ? `<div class="det-grid">${detailBoxes}</div>` : ''

    // ── Clauses ────────────────────────────────────────────────────────────
    const clauses = (() => {
      try {
        const raw = p?.contract_clauses
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'string') return JSON.parse(raw)
        return []
      } catch { return [] }
    })().filter((c: any) => c.enabled !== false).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

    const clauseHtml = clauses.length ? `
<div class="sec-lbl" style="margin-top:28px">Terms &amp; Conditions</div>
${clauses.map((c: any) => `
<div class="cl-item">
  <div class="cl-title">${esc(c.title || c.name || '')}</div>
  <div class="cl-text">${esc(substituteProvince(c.content || c.text || '', p?.province)).replace(/\n/g, '<br>')}</div>
</div>`).join('')}` : ''

    // ── Signatures ─────────────────────────────────────────────────────────
    const contractorSig = con.contractor_signature_url || p?.signature_url
    const clientSig     = con.client_signature_url

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Signed Contract — ${conNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#0A1628;background:#fff;padding:40px 48px;max-width:820px;margin:0 auto}
.print-bar{background:#EEF3FF;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#1D4ED8;font-weight:600}
.print-bar button{background:#2563EB;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2.5px solid #2563EB;margin-bottom:20px}
.logo-img{max-height:40px;max-width:160px;object-fit:contain;margin-bottom:6px;display:block}
.co-name{font-size:16px;font-weight:800;color:#0A1628;margin-bottom:4px}
.co-info{font-size:11px;color:#64748B;line-height:1.75}
.doc-r{text-align:right}
.badge{display:inline-block;background:#2563EB;color:#fff;border-radius:4px;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px}
.doc-num{font-size:14px;font-weight:800;color:#0A1628;margin-bottom:4px}
.doc-meta{font-size:11px;color:#64748B;line-height:1.75}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.party-box{background:#F8FAFC;border-radius:6px;padding:12px}
.party-lbl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.party-name{font-size:13px;font-weight:700;color:#0A1628;margin-bottom:3px}
.party-info{font-size:11px;color:#64748B;line-height:1.75}
.sec-lbl{font-size:10px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 10px}
.card{border:1px solid #E2E8F0;border-radius:6px;margin-bottom:10px;page-break-inside:avoid}
.card-hdr{display:flex;align-items:center;background:#F8FAFC;padding:8px 12px;border-radius:6px 6px 0 0;gap:8px}
.cn{font-size:10px;font-weight:700;color:#94A3B8;width:20px;flex-shrink:0}
.ct{font-size:12px;font-weight:700;color:#0A1628;flex:1}
.cp{font-size:13px;font-weight:700;color:#2563EB}
.card-body{display:flex;gap:14px;padding:12px}
.draw-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center}
.draw-img{width:110px;height:130px;object-fit:contain;display:block}
.dim-w{font-size:10px;font-weight:700;color:#475569;text-align:center;margin-top:3px}
.specs-col{flex:1;min-width:0}
.grp{font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.7px;margin-top:8px;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #F1F5F9}
.grp:first-child{margin-top:0}
.sr{display:flex;margin-bottom:3px}
.sl{font-size:11px;color:#94A3B8;width:100px;flex-shrink:0}
.sv{font-size:11px;color:#0A1628}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.chip{background:#EEF3FF;color:#2563EB;border-radius:3px;padding:2px 7px;font-size:10px;font-weight:700}
.notes{font-size:11px;color:#64748B;font-style:italic;line-height:1.5;margin-top:4px}
.trim-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #F8FAFC}
.tl{font-size:12px;color:#64748B}.tv{font-size:12px;font-weight:700;color:#0A1628}
.totals-wrap{display:flex;justify-content:flex-end;margin-top:4px}
.totals-box{width:280px}
.tot-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #E2E8F0}
.tol{font-size:12px;color:#64748B}.tov{font-size:12px;color:#0A1628}
.tot-final{display:flex;justify-content:space-between;padding:8px 0 4px}
.tolf{font-size:15px;font-weight:700;color:#0A1628}.tovf{font-size:15px;font-weight:700;color:#2563EB}
.dep-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.dep-box{background:#EEF3FF;border-radius:6px;padding:10px}
.dep-lbl{font-size:10px;color:#1D4ED8;margin-bottom:3px}
.dep-amt{font-size:14px;font-weight:700;color:#1D4ED8}
.det-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px}
.det-box{background:#F8FAFC;border-radius:6px;padding:10px}
.det-lbl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
.det-val{font-size:12px;color:#64748B;line-height:1.55}
.cl-item{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F1F5F9}
.cl-item:last-child{border-bottom:none}
.cl-title{font-size:12px;font-weight:700;color:#0A1628;margin-bottom:5px}
.cl-text{font-size:12px;color:#4B5563;line-height:1.65}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px;padding-top:20px;border-top:1px solid #E2E8F0}
.sig-lbl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
.sig-img{max-height:64px;max-width:180px;object-fit:contain;display:block;margin-bottom:8px}
.sig-line{border-bottom:1.5px solid #0A1628;margin-bottom:6px;height:0}
.sig-name{font-size:12px;font-weight:600;color:#0A1628;margin-top:6px;margin-bottom:2px}
.sig-date{font-size:11px;color:#64748B}
.doc-footer{margin-top:32px;padding-top:12px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8}
.sp{margin-top:20px}
@media print{.print-bar{display:none}body{padding:24px 32px}.card{border-color:#ddd}}
</style>
</head>
<body>

<div class="print-bar">
  Signed Contract — ${conNum} · ${signedFmt}
  <button onclick="window.print()">Print / Save PDF</button>
</div>

<div class="hdr">
  <div>
    ${p?.logo_url ? `<img src="${p.logo_url}" class="logo-img" alt="${esc(companyName)}" />` : ''}
    <div class="co-name">${esc(companyName)}</div>
    <div class="co-info">${[p?.phone, p?.email, p?.website, [p?.address, p?.city, p?.province].filter(Boolean).join(', '), p?.licence ? `Lic. ${p.licence}` : null, p?.wsib_number ? `WSIB/WCB #: ${p.wsib_number}` : null, p?.gst_hst_number ? `GST/HST #: ${p.gst_hst_number}` : null].filter(Boolean).map(esc).join('<br>')}</div>
  </div>
  <div class="doc-r">
    <div class="badge">INSTALLATION CONTRACT</div>
    <div class="doc-num">${esc(conNum)}</div>
    <div class="doc-meta">Signed: ${signedFmt}<br>Related: ${esc((est as any).estimate_number || '')}</div>
  </div>
</div>

<div class="two-col">
  <div class="party-box">
    <div class="party-lbl">Contractor</div>
    <div class="party-name">${esc(companyName)}</div>
    <div class="party-info">${[p?.phone, p?.email, [p?.address, p?.city, p?.province].filter(Boolean).join(', '), p?.licence ? `Lic# ${p.licence}` : null, p?.insurance ? `Ins# ${p.insurance}` : null, p?.wsib_number ? `WSIB/WCB# ${p.wsib_number}` : null, p?.gst_hst_number ? `GST/HST# ${p.gst_hst_number}` : null].filter(Boolean).map(esc).join('<br>')}</div>
  </div>
  <div class="party-box">
    <div class="party-lbl">Client</div>
    <div class="party-name">${esc((est as any).client_name || '—')}</div>
    <div class="party-info">${[(est as any).client_phone, (est as any).client_email, [(est as any).client_address, (est as any).client_city, (est as any).client_province, (est as any).client_postal_code].filter(Boolean).join(', ')].filter(Boolean).map(esc).join('<br>')}${(est as any).job_site_same_as_client === false && (est as any).job_site_address ? `<br>Job site: ${esc([(est as any).job_site_address, (est as any).job_site_city, (est as any).job_site_province].filter(Boolean).join(', '))}` : ''}</div>
  </div>
</div>

<div class="sec-lbl">Scope of Work</div>
${opCards}
${trimHtml}

<div class="sp">
<div class="sec-lbl">Price Summary</div>
<div class="totals-wrap">
  <div class="totals-box">
    <div class="tot-row"><span class="tol">Subtotal</span><span class="tov">${fmtCAD((est as any).subtotal || 0)}</span></div>
    ${discountHtml}
    <div class="tot-row"><span class="tol">Tax (${(((est as any).tax_rate || 0) * 100).toFixed(0)}%)</span><span class="tov">${fmtCAD((est as any).tax_amount || 0)}</span></div>
    <div class="tot-final"><span class="tolf">Total</span><span class="tovf">${fmtCAD((est as any).total || 0)}</span></div>
  </div>
</div>
${depositHtml}
</div>

${detailHtml ? `<div class="sp">${detailHtml}</div>` : ''}

${clauseHtml}

<div class="sig-grid">
  <div>
    <div class="sig-lbl">Contractor</div>
    ${contractorSig ? `<img src="${contractorSig}" class="sig-img" alt="Contractor signature" />` : ''}
    <div class="sig-line"></div>
    <div class="sig-name">${esc(companyName)}</div>
    <div class="sig-date">${signedFmt}</div>
    ${p?.signing_rep_name  ? `<div class="sig-name">${esc(p.signing_rep_name)}</div>` : ''}
    ${p?.signing_rep_title ? `<div class="sig-date">${esc(p.signing_rep_title)}</div>` : ''}
  </div>
  <div>
    <div class="sig-lbl">Client</div>
    ${clientSig ? `<img src="${clientSig}" class="sig-img" alt="Client signature" />` : ''}
    <div class="sig-line"></div>
    <div class="sig-name">${esc((est as any).client_name || '—')}</div>
    <div class="sig-date">${signedFmt}</div>
  </div>
</div>

<div class="doc-footer">
  <span>${esc(companyName)}${p?.licence ? ` · Lic. ${esc(p.licence)}` : ''}${p?.gst_hst_number ? ` · GST/HST #: ${esc(p.gst_hst_number)}` : ''}</span>
  <span>Powered by ApexScale</span>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // ── Profile contract terms (authenticated) ────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, email, address, city, province, phone, website, licence, insurance, logo_url, contract_terms, signature_url, completion_timeframe, payment_methods, project_manager, contract_clauses, deposit_timing, wsib_number, gst_hst_number, signing_rep_name, signing_rep_title')
    .eq('id', user.id)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const contractText = prof.contract_terms?.trim()
  const companyName = prof.company_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Your Company'
  const location = [prof.city, prof.province].filter(Boolean).join(', ')
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  const p = prof as any
  const completionTimeframe: string | null = p?.completion_timeframe || null
  const paymentMethods: string[] = p?.payment_methods || []
  const projectManager: string | null = p?.project_manager || null

  function clauseBlock(title: string, body: string | null): string {
    if (!body) return ''
    return `<div class="clause"><div class="clause-title">${title}</div><p>${body.replace(/\n/g, '<br>')}</p></div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contract Terms — ${companyName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;padding:48px 56px;max-width:780px;margin:0 auto}
  .print-bar{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:8px;padding:10px 16px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#2045B8;font-weight:600}
  .print-bar button{background:#3B6CFF;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #E0E0E0;margin-bottom:32px}
  .logo-img{max-height:64px;max-width:160px;object-fit:contain}
  .logo-text{font-size:20px;font-weight:800;color:#1A1A1A}
  .logo-text span{color:#3B6CFF}
  .company-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px}
  .doc-info{text-align:right}
  .doc-title{font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-.02em}
  .doc-sub{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6}
  .doc-date{font-size:10px;color:#BFBFBF;margin-top:8px}
  .divider{height:1px;background:#E0E0E0;margin:24px 0}
  .body-section{margin-bottom:28px}
  .body-section p{font-size:13px;color:#374151;line-height:1.8;margin-bottom:14px}
  .body-section p:last-child{margin-bottom:0}
  .empty-state{border:2px dashed #E0E0E0;border-radius:10px;padding:40px;text-align:center;color:#BFBFBF;font-size:13px}
  .clause{margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid #F0F0F0}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:6px}
  .payment-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .payment-pill{background:#EEF2FF;color:#2045B8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600}
  .sig-section{display:flex;gap:48px;margin-top:48px;padding-top:24px;border-top:2px solid #E0E0E0}
  .sig-box{flex:1}
  .sig-line{border-bottom:1px solid #1A1A1A;height:48px;margin-bottom:8px}
  .sig-label{font-size:10px;color:#6b7280;line-height:1.5}
  .sig-name{font-size:12px;font-weight:700;color:#1A1A1A}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between}
  @media print{.print-bar{display:none}body{padding:32px 40px}}
</style>
</head>
<body>

<div class="print-bar">
  Contract Terms Preview
  <button onclick="window.print()">Print / Save PDF</button>
</div>

<div class="header">
  <div>
    ${prof.logo_url
      ? `<img src="${prof.logo_url}" alt="${companyName}" class="logo-img" />`
      : `<div class="logo-text">Apex<span>Scale</span></div>`}
    <div class="company-meta">
      ${companyName}${location ? `<br>${location}` : ''}${prof.phone ? `<br>${prof.phone}` : ''}${prof.website ? `<br>${prof.website}` : ''}${prof.licence ? `<br>Lic. ${prof.licence}` : ''}${prof.insurance ? `<br>Ins. ${prof.insurance}` : ''}${p?.wsib_number ? `<br>WSIB/WCB #: ${p.wsib_number}` : ''}${p?.gst_hst_number ? `<br>GST/HST #: ${p.gst_hst_number}` : ''}
    </div>
  </div>
  <div class="doc-info">
    <div class="doc-title">Contract Terms</div>
    <div class="doc-sub">${companyName}<br>Standard Terms &amp; Conditions</div>
    <div class="doc-date">Generated ${today}</div>
  </div>
</div>

${(() => {
  const clauses2: any[] = p?.contract_clauses ? (() => { try { return JSON.parse(p.contract_clauses) } catch { return [] } })() : []
  const enabledClauses2 = clauses2.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
  if (enabledClauses2.length === 0) return ''
  return `<div style="margin-bottom: 24px;">
  <h2 style="font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">Terms &amp; Conditions</h2>
  ${enabledClauses2.map((c: any) => `<div style="display: flex; gap: 8px; margin-bottom: 8px;">
    <div style="width: 16px; height: 16px; border-radius: 50%; background: #EEF2FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
      <svg width="9" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#2045B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">${c.title}</div>
      <div style="font-size: 12px; color: #353A3E; line-height: 1.6;">${substituteProvince(c.content, p?.province).replace(/\n/g, '<br>')}</div>
    </div>
  </div>`).join('')}
</div>`
})()}

${(() => {
  const warrantyPeriod2: string | null = p?.warranty_period || null
  const depositTiming2: string = p?.deposit_timing || 'signing'
  if (!warrantyPeriod2 && !completionTimeframe && paymentMethods.length === 0 && !projectManager) return ''
  return `<div class="divider"></div>
<div class="body-section">
  ${warrantyPeriod2 ? `${clauseBlock('Warranty Period', warrantyPeriod2)}` : ''}
  ${completionTimeframe ? `${clauseBlock('Completion Timeframe', completionTimeframe)}` : ''}
  ${clauseBlock('Deposit Due', depositTiming2 === 'delivery' ? 'Upon delivery' : 'Upon signing')}
  ${paymentMethods.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${paymentMethods.map((m: string) => `<span class="payment-pill">${m}</span>`).join('')}</div></div>` : ''}
  ${projectManager ? `<div class="clause"><div class="clause-title">Project Manager</div><p style="font-weight:600;color:#0A1628">${projectManager}</p></div>` : ''}
</div>`
})()}

<div class="divider"></div>

<div class="sig-section">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${companyName}</div>
    <div class="sig-label">Contractor signature &amp; date</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-label">Client signature, printed name &amp; date</div>
  </div>
</div>

${(prof as any)?.signature_url ? `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0">
  <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Authorized by</div>
  <img src="${(prof as any).signature_url}" style="max-height:50px;max-width:180px;object-fit:contain" alt="Contractor signature" />
  <div style="font-size:12px;color:#475569;margin-top:6px">${companyName || ''}</div>
  ${p?.signing_rep_name ? `<div style="font-size:12px;color:#475569;margin-top:2px">${p.signing_rep_name}</div>` : ''}
  ${p?.signing_rep_title ? `<div style="font-size:11px;color:#94A3B8;margin-top:2px">${p.signing_rep_title}</div>` : ''}
</div>` : ''}

<div class="footer">
  <span>${companyName}${prof.licence ? ` · Lic. ${prof.licence}` : ''}${prof.insurance ? ` · Ins. ${prof.insurance}` : ''}${p?.gst_hst_number ? ` · GST/HST #: ${p.gst_hst_number}` : ''}</span>
  <span style="font-size:10px;color:#CBD5E1">Powered by ApexScale &middot; useapexscale.com</span>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
