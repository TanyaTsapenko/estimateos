import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { substituteProvince } from '@/lib/provinces'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel, type SubtypeMap } from '@/lib/openingLabels'
import { OPENING_TYPES } from '@/lib/pricing'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'

const NAVY    = '#0A1628'
const BLUE    = '#2563EB'
const BLUE_D  = '#1D4ED8'
const BLUE_BG = '#EEF3FF'
const GRAY_BG = '#F8FAFC'
const BORDER  = '#E2E8F0'
const MUTED   = '#64748B'
const FAINT   = '#94A3B8'

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 9, color: NAVY, padding: 36, backgroundColor: '#fff' },

  hdrRow:    { flexDirection: 'row', alignItems: 'stretch', marginBottom: 14 },
  hdrLeft:   { flex: 1, paddingRight: 14, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: BLUE },
  hdrRight:  { backgroundColor: BLUE, borderRadius: 5, width: 165, padding: 12, alignItems: 'flex-end', justifyContent: 'center' },
  logo:      { height: 34, objectFit: 'contain', objectPositionX: 0, marginBottom: 5 },
  coName:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  coInfo:    { fontSize: 8, color: MUTED, marginBottom: 1.5 },
  badge:     { marginBottom: 7, alignSelf: 'flex-end' },
  badgeTxt:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 1, opacity: 0.65 },
  docNum:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 3 },
  docMeta:   { fontSize: 8, color: '#fff', opacity: 0.8, marginBottom: 1.5 },

  metaRow:   { flexDirection: 'row', marginBottom: 14 },
  metaBox:   { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10 },
  metaBoxR:  { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10, marginLeft: 8 },
  metaLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  metaName:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  metaVal:   { fontSize: 8, color: MUTED, marginBottom: 1.5 },

  secLabel:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7, marginTop: 2 },

  card:      { borderWidth: 0.5, borderColor: BORDER, borderRadius: 5, marginBottom: 7 },
  cardHdr:   { flexDirection: 'row', alignItems: 'center', backgroundColor: GRAY_BG, paddingHorizontal: 10, paddingVertical: 6 },
  cardNum:   { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: FAINT, marginRight: 7, width: 18 },
  cardTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: NAVY, flex: 1 },
  cardPrice: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  cardBody:  { flexDirection: 'row', padding: 10 },
  drawCol:   { width: 130, marginRight: 10 },
  drawing:   { width: 110, height: 132 },
  dimLblW:   { width: 110, textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', marginTop: -2 },
  dimLblH:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569' },
  specsCol:  { flex: 1 },

  grpLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 7, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingBottom: 2 },
  specRow:  { flexDirection: 'row', marginBottom: 2.5 },
  specLbl:  { fontSize: 8, color: FAINT, width: 86 },
  specVal:  { fontSize: 8, color: NAVY, flex: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
  chip:     { borderRadius: 3, borderWidth: 0.5, borderColor: BLUE, paddingHorizontal: 5, paddingVertical: 1.5, marginRight: 4, marginBottom: 3 },
  chipTxt:  { fontSize: 7, color: BLUE, fontFamily: 'Helvetica-Bold' },
  notesTxt: { fontSize: 8, color: MUTED, lineHeight: 1.5, fontStyle: 'italic' },

  trimRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: GRAY_BG },
  trimLbl:  { fontSize: 8, color: MUTED },
  trimVal:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY },

  totRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingBottom: 4 },
  totRowFinal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingTop: 2 },
  totLbl:      { fontSize: 8.5, color: MUTED },
  totVal:      { fontSize: 8.5, color: NAVY },
  totLblFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  totValFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE },
  depositRow:  { flexDirection: 'row', gap: 8, marginTop: 6 },
  depBox:      { flex: 1, backgroundColor: BLUE_BG, borderRadius: 5, padding: 10 },
  depLbl:      { fontSize: 8, color: BLUE_D, marginBottom: 2 },
  depAmt:      { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE_D },

  detailGrid:  { flexDirection: 'row', gap: 8, marginTop: 14 },
  detailBox:   { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10 },
  detailLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  detailVal:   { fontSize: 8.5, color: MUTED, lineHeight: 1.55 },

  clauseItem:  { marginBottom: 10 },
  clauseTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  clauseText:  { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  sigSection: { flexDirection: 'row', gap: 40, marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: BORDER },
  sigBox:     { flex: 1 },
  sigTitle:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sigImage:   { width: 150, height: 50, objectFit: 'contain', marginBottom: 4 },
  sigLine:    { borderBottomWidth: 1, borderBottomColor: NAVY, marginBottom: 5 },
  sigName:    { fontSize: 9, color: NAVY },
  sigDate:    { fontSize: 8, color: MUTED },

  footer:    { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, borderTopWidth: 0.5, borderTopColor: BORDER },
  footerTxt: { fontSize: 7.5, color: FAINT },
})

function fmtCAD(n: number) {
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s?: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}
function humanize(s?: string | null): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SR({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <View style={S.specRow}>
      <Text style={S.specLbl}>{label}</Text>
      <Text style={S.specVal}>{value}</Text>
    </View>
  )
}

function GrpHdr({ children }: { children: string }) {
  return <Text style={S.grpLbl}>{children}</Text>
}

function Chip({ label }: { label: string }) {
  return (
    <View style={S.chip}>
      <Text style={S.chipTxt}>{label}</Text>
    </View>
  )
}

export interface ContractPDFProps {
  contract: any
  estimate: any
  openings: any[]
  company: any
  customLabels?: Record<string, string>
  subtypesByType?: SubtypeMap
  drawingPngs?:   string[]
  drawingLabels?: { w: string; h: string }[]
}

export function ContractPDF({ contract, estimate, openings, company, customLabels, subtypesByType, drawingPngs, drawingLabels }: ContractPDFProps) {
  const clauses     = Array.isArray(contract.contract_clauses) ? contract.contract_clauses : []
  const depositPct  = estimate.deposit_percent || 0
  const depositAmt  = (estimate.total || 0) * (depositPct / 100)
  const balanceAmt  = (estimate.total || 0) - depositAmt
  const conNum      = 'CON-' + (contract.contract_number || contract.id.slice(-6).toUpperCase())
  const payMethods: string[] = Array.isArray(company.payment_methods) ? company.payment_methods : []
  const hasDetails  = !!(company.warranty_period || company.completion_timeframe || company.project_manager || payMethods.length > 0)

  return (
    <Document>
      <Page size="LETTER" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.hdrRow}>
          <View style={S.hdrLeft}>
            {company.logo_url
              ? <Image style={S.logo} src={company.logo_url} />
              : <Text style={S.coName}>{company.company_name || 'Your Company'}</Text>}
            {company.logo_url && <Text style={S.coName}>{company.company_name}</Text>}
            {company.phone                && <Text style={S.coInfo}>{company.phone}</Text>}
            {company.company_contact_email && <Text style={S.coInfo}>{company.company_contact_email}</Text>}
            {(company.city || company.province) &&
              <Text style={S.coInfo}>{[company.city, company.province].filter(Boolean).join(', ')}</Text>}
            {company.licence              && <Text style={S.coInfo}>Lic# {company.licence}</Text>}
          </View>
          <View style={S.hdrRight}>
            <View style={S.badge}><Text style={S.badgeTxt}>INSTALLATION CONTRACT</Text></View>
            <Text style={S.docNum}>{conNum}</Text>
            <Text style={S.docMeta}>{fmtDate(contract.signed_at || contract.created_at)}</Text>
          </View>
        </View>

        {/* ── CONTRACTOR / CLIENT ── */}
        <View style={S.metaRow}>
          <View style={S.metaBox}>
            <Text style={S.metaLbl}>Contractor</Text>
            <Text style={S.metaName}>{company.company_name}</Text>
            {company.phone     && <Text style={S.metaVal}>{company.phone}</Text>}
            {company.email     && <Text style={S.metaVal}>{company.email}</Text>}
            {company.address   && <Text style={S.metaVal}>{[company.address, company.city, company.province].filter(Boolean).join(', ')}</Text>}
            {company.licence   && <Text style={S.metaVal}>Lic# {company.licence}</Text>}
            {company.insurance && <Text style={S.metaVal}>Ins# {company.insurance}</Text>}
            {company.wsib_number    && <Text style={S.metaVal}>WSIB/WCB# {company.wsib_number}</Text>}
            {company.gst_hst_number && <Text style={S.metaVal}>GST/HST# {company.gst_hst_number}</Text>}
          </View>
          <View style={S.metaBoxR}>
            <Text style={S.metaLbl}>Client</Text>
            <Text style={S.metaName}>{estimate.client_name}</Text>
            {estimate.client_phone && <Text style={S.metaVal}>{estimate.client_phone}</Text>}
            {estimate.client_email && <Text style={S.metaVal}>{estimate.client_email}</Text>}
            {estimate.client_address && <Text style={S.metaVal}>{[estimate.client_address, estimate.client_city, estimate.client_province, estimate.client_postal_code].filter(Boolean).join(', ')}</Text>}
            {estimate.job_site_same_as_client === false && estimate.job_site_address &&
              <Text style={[S.metaVal, { marginTop: 4 }]}>Job site: {[estimate.job_site_address, estimate.job_site_city, estimate.job_site_province].filter(Boolean).join(', ')}</Text>}
          </View>
        </View>

        {/* ── SCOPE OF WORK ── */}
        <Text style={S.secLabel}>Scope of Work</Text>

        {openings.map((op: any, i: number) => {
          const typeName  = customLabels?.[op.type] || OPENING_TYPES[op.type]?.name || humanize(op.type)
          const subLabel  = getSubtypeLabel(op, subtypesByType)
          const title     = [op.qty > 1 ? `${op.qty}×` : null, typeName, subLabel ? `(${subLabel})` : null, op.room ? `— ${op.room}` : null].filter(Boolean).join(' ')
          const extColour = getColourLabel(op)
          const intColour = getInteriorColourLabel(op)
          const gridVal   = op.grid ? (op.grille_type ? humanize(op.grille_type) : 'Yes') : null
          const floorVal  = op.floor && op.floor !== 'first' ? humanize(op.floor) : null
          const paneLabel = op.pane === 'triple' ? 'Triple Pane' : op.pane === 'single' ? 'Single Pane' : null

          const glassChips: string[] = []
          if (paneLabel)                                    glassChips.push(paneLabel)
          if (op.glass_kind && op.glass_kind !== 'clear')  glassChips.push(humanize(op.glass_kind))
          if (op.low_e)           glassChips.push('Low-E')
          if (op.argon)           glassChips.push('Argon')
          if (op.tempered)        glassChips.push('Tempered')
          if (op.laminated_glass) glassChips.push('Laminated')

          return (
            <View key={i} style={S.card} wrap={false}>
              <View style={S.cardHdr}>
                <Text style={S.cardNum}>{i + 1}</Text>
                <Text style={S.cardTitle}>{title}</Text>
                <Text style={S.cardPrice}>{fmtCAD(op.total_cost || 0)}</Text>
              </View>
              <View style={S.cardBody}>
                {/* Drawing */}
                <View style={S.drawCol}>
                  <View style={{ flexDirection: 'row' }}>
                    <View>
                      {drawingPngs?.[i] ? <Image src={drawingPngs[i]} style={S.drawing} /> : null}
                      {drawingLabels?.[i]?.w ? <Text style={S.dimLblW}>{drawingLabels[i].w}</Text> : null}
                    </View>
                    {drawingLabels?.[i]?.h
                      ? <View style={{ height: 132, justifyContent: 'center', marginLeft: 2 }}>
                          <Text style={S.dimLblH}>{drawingLabels[i].h}</Text>
                        </View>
                      : null}
                  </View>
                </View>
                {/* Specs */}
                <View style={S.specsCol}>
                  {(op.room || floorVal) && (
                    <>
                      <GrpHdr>Location</GrpHdr>
                      <SR label="Room"  value={op.room} />
                      <SR label="Floor" value={floorVal} />
                    </>
                  )}
                  <GrpHdr>Product</GrpHdr>
                  <SR label="Size"         value={`${op.width_in}" × ${op.height_in}"`} />
                  <SR label="Material"     value={humanize(op.material)} />
                  <SR label="Ext. colour"  value={extColour || undefined} />
                  <SR label="Int. colour"  value={intColour || undefined} />
                  <SR label="Grid"         value={gridVal || undefined} />
                  <SR label="Installation" value={humanize(op.install)} />
                  {glassChips.length > 0 && (
                    <>
                      <GrpHdr>Glass</GrpHdr>
                      <View style={S.chipsRow}>
                        {glassChips.map(c => <Chip key={c} label={c} />)}
                      </View>
                    </>
                  )}
                  {!!op.notes && (
                    <>
                      <GrpHdr>Notes</GrpHdr>
                      <Text style={S.notesTxt}>{op.notes}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          )
        })}

        {/* ── TRIM & FINISHING ── */}
        {hasTrim(estimate) && (
          <View wrap={false}>
            <Text style={S.secLabel}>Trim &amp; Finishing</Text>
            {trimSummaryLines(estimate).map(line => (
              <View key={line.label} style={S.trimRow}>
                <Text style={S.trimLbl}>{line.label}</Text>
                <Text style={S.trimVal}>{line.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── PRICE SUMMARY ── */}
        <View wrap={false} style={{ marginTop: 12 }}>
          <Text style={S.secLabel}>Price Summary</Text>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }} />
            <View style={{ width: 240 }}>
              <View style={S.totRow}>
                <Text style={S.totLbl}>Subtotal</Text>
                <Text style={S.totVal}>{fmtCAD(estimate.subtotal || 0)}</Text>
              </View>
              {!!(estimate.discount_amount > 0) && (
                <View style={S.totRow}>
                  <Text style={S.totLbl}>Discount</Text>
                  <Text style={S.totVal}>−{fmtCAD(estimate.discount_amount)}</Text>
                </View>
              )}
              <View style={S.totRow}>
                <Text style={S.totLbl}>Tax ({((estimate.tax_rate || 0) * 100).toFixed(0)}%)</Text>
                <Text style={S.totVal}>{fmtCAD(estimate.tax_amount || 0)}</Text>
              </View>
              <View style={S.totRowFinal}>
                <Text style={S.totLblFinal}>Total</Text>
                <Text style={S.totValFinal}>{fmtCAD(estimate.total || 0)}</Text>
              </View>
            </View>
          </View>
          {depositPct > 0 && (
            <View style={S.depositRow}>
              <View style={S.depBox}>
                <Text style={S.depLbl}>Deposit on signing ({depositPct}%)</Text>
                <Text style={S.depAmt}>{fmtCAD(depositAmt)}</Text>
              </View>
              <View style={S.depBox}>
                <Text style={S.depLbl}>Balance on completion</Text>
                <Text style={S.depAmt}>{fmtCAD(balanceAmt)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── CONTRACT DETAILS ── */}
        {hasDetails && (
          <View style={S.detailGrid} wrap={false}>
            {company.warranty_period && (
              <View style={S.detailBox}>
                <Text style={S.detailLbl}>Warranty</Text>
                <Text style={S.detailVal}>{company.warranty_period}</Text>
              </View>
            )}
            {company.completion_timeframe && (
              <View style={S.detailBox}>
                <Text style={S.detailLbl}>Completion Timeframe</Text>
                <Text style={S.detailVal}>{company.completion_timeframe}</Text>
              </View>
            )}
            {payMethods.length > 0 && (
              <View style={S.detailBox}>
                <Text style={S.detailLbl}>Payment Methods</Text>
                <Text style={S.detailVal}>{payMethods.join(', ')}</Text>
              </View>
            )}
            {company.project_manager && (
              <View style={S.detailBox}>
                <Text style={S.detailLbl}>Project Manager</Text>
                <Text style={S.detailVal}>{company.project_manager}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>{[
            company.address ? [company.address, company.city, company.province].filter(Boolean).join(', ') : null,
            company.gst_hst_number ? `GST/HST# ${company.gst_hst_number}` : null,
            company.website ? company.website.replace(/^https?:\/\//i, '') : null,
          ].filter(Boolean).join(' · ')}</Text>
          <Text style={S.footerTxt} render={({ pageNumber, totalPages }) => `${conNum} · Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>

      {/* ── PAGE 2: Terms + Signatures ── */}
      {(clauses.length > 0 || contract.contract_terms_snapshot || contract.client_signature_url) && (
        <Page size="LETTER" style={S.page}>

          <View style={[S.hdrRow, { marginBottom: 16 }]}>
            <Text style={S.coName}>{company.company_name}</Text>
            <Text style={S.docMeta}>{conNum} · Terms &amp; Signatures</Text>
          </View>

          {(clauses.length > 0 || contract.contract_terms_snapshot) && (
            <View>
              <Text style={S.secLabel}>Terms &amp; Conditions</Text>
              {clauses.length > 0
                ? clauses.map((clause: any, i: number) => (
                    <View key={i} style={S.clauseItem}>
                      <Text style={S.clauseTitle}>{clause.title || clause.name}</Text>
                      <Text style={S.clauseText}>{substituteProvince(clause.content || clause.text || '', company.province)}</Text>
                    </View>
                  ))
                : <Text style={S.clauseText}>{contract.contract_terms_snapshot}</Text>}
            </View>
          )}

          <Text style={[S.secLabel, { marginTop: 24 }]}>Signatures</Text>
          <View style={S.sigSection}>
            <View style={S.sigBox}>
              <Text style={S.sigTitle}>Contractor</Text>
              {(contract.contractor_signature_url || company.signature_url) && (
                <Image style={S.sigImage} src={contract.contractor_signature_url || company.signature_url} />
              )}
              <View style={S.sigLine} />
              <Text style={S.sigName}>{company.company_name}</Text>
              <Text style={S.sigDate}>{fmtDate(contract.signed_at || contract.created_at)}</Text>
              {company.signing_rep_name  && <Text style={S.sigName}>{company.signing_rep_name}</Text>}
              {company.signing_rep_title && <Text style={S.sigDate}>{company.signing_rep_title}</Text>}
            </View>
            <View style={S.sigBox}>
              <Text style={S.sigTitle}>Client</Text>
              {contract.client_signature_url && (
                <Image style={S.sigImage} src={contract.client_signature_url} />
              )}
              <View style={S.sigLine} />
              <Text style={S.sigName}>{estimate.client_name}</Text>
              <Text style={S.sigDate}>{fmtDate(contract.signed_at || contract.created_at)}</Text>
            </View>
          </View>

          <View style={S.footer} fixed>
            <Text style={S.footerTxt}>{[
              company.address ? [company.address, company.city, company.province].filter(Boolean).join(', ') : null,
              company.gst_hst_number ? `GST/HST# ${company.gst_hst_number}` : null,
              company.website ? company.website.replace(/^https?:\/\//i, '') : null,
            ].filter(Boolean).join(' · ')}</Text>
            <Text style={S.footerTxt} render={({ pageNumber, totalPages }) => `${conNum} · Page ${pageNumber} of ${totalPages}`} />
          </View>

        </Page>
      )}
    </Document>
  )
}
