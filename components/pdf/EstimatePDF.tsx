import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel, type SubtypeMap } from '@/lib/openingLabels'
import { OPENING_TYPES } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY    = '#0A1628'
const BLUE    = '#2563EB'
const BLUE_D  = '#1D4ED8'
const BLUE_BG = '#EEF3FF'
const GRAY_BG = '#F8FAFC'
const BORDER  = '#E2E8F0'
const MUTED   = '#64748B'
const FAINT   = '#94A3B8'

// ── StyleSheet ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: NAVY, padding: 36, backgroundColor: '#fff' },

  // Header
  hdrRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: BLUE, marginBottom: 14 },
  hdrLeft:     { flex: 1, marginRight: 20 },
  hdrRight:    { alignItems: 'flex-end', width: 155 },
  logo:        { height: 34, objectFit: 'contain', objectPositionX: 0, marginBottom: 5 },
  coName:      { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  coInfo:      { fontSize: 8, color: MUTED, marginBottom: 1.5 },
  badge:       { backgroundColor: BLUE, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 7, alignSelf: 'flex-end' },
  badgeText:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 1.4 },
  docNum:      { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  docMeta:     { fontSize: 8, color: MUTED, marginBottom: 1.5 },

  // Meta row (3 boxes)
  metaRow:   { flexDirection: 'row', marginBottom: 14 },
  metaBox:   { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10 },
  metaMid:   { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10, marginHorizontal: 8 },
  metaLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  metaName:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  metaVal:   { fontSize: 8, color: MUTED, marginBottom: 1.5 },

  // Section label
  secLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7, marginTop: 2 },

  // Opening cards
  card:       { borderWidth: 0.5, borderColor: BORDER, borderRadius: 5, marginBottom: 7 },
  cardHdr:    { flexDirection: 'row', alignItems: 'center', backgroundColor: GRAY_BG, paddingHorizontal: 10, paddingVertical: 6 },
  cardNum:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: FAINT, marginRight: 7, width: 18 },
  cardTitle:  { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: NAVY, flex: 1 },
  cardPrice:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  cardBody:   { flexDirection: 'row', padding: 10 },
  drawingCol: { width: 212, marginRight: 2 },
  drawing:    { width: 180, height: 216 },
  dimLblW:    { width: 180, textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', marginTop: -2 },
  dimLblH:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569' },
  specsCol:   { flex: 1 },

  // Spec rows
  grpLbl:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 7, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingBottom: 2 },
  specRow:  { flexDirection: 'row', marginBottom: 2.5 },
  specLbl:  { fontSize: 8, color: FAINT, width: 86 },
  specVal:  { fontSize: 8, color: NAVY, flex: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
  chip:     { borderRadius: 3, borderWidth: 0.5, borderColor: BLUE, paddingHorizontal: 5, paddingVertical: 1.5, marginRight: 4, marginBottom: 3 },
  chipTxt:  { fontSize: 7, color: BLUE, fontFamily: 'Helvetica-Bold' },
  notesTxt: { fontSize: 8, color: MUTED, lineHeight: 1.5, fontStyle: 'italic' },

  // Trim
  trimRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: GRAY_BG },
  trimLbl: { fontSize: 8, color: MUTED },
  trimVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY },

  // Totals + notes 2-col
  bottomHalf: { flexDirection: 'row', marginTop: 8 },
  notesCol:   { flex: 3, marginRight: 16 },
  notesBody:  { fontSize: 8.5, color: MUTED, lineHeight: 1.55 },
  totalsCol:  { flex: 2 },
  totRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingBottom: 4 },
  totRowFinal:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingTop: 2 },
  totLbl:     { fontSize: 8.5, color: MUTED },
  totVal:     { fontSize: 8.5, color: NAVY },
  totLblFinal:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  totValFinal:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE },
  depositBox: { backgroundColor: BLUE_BG, borderRadius: 5, padding: 10, marginTop: 6 },
  depLbl:     { fontSize: 8, color: BLUE_D, marginBottom: 2 },
  depAmt:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE_D },
  depBal:     { fontSize: 7.5, color: BLUE_D, marginTop: 2 },

  // Bottom 2-col (warranty + validity)
  infoGrid:    { flexDirection: 'row', marginTop: 14 },
  infoCol:     { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10 },
  infoColR:    { flex: 1, backgroundColor: GRAY_BG, borderRadius: 5, padding: 10, marginLeft: 10 },
  infoLbl:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  infoBody:    { fontSize: 8.5, color: MUTED, lineHeight: 1.55 },

  // Footer
  footer:    { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, borderTopWidth: 0.5, borderTopColor: BORDER },
  footerTxt: { fontSize: 7.5, color: FAINT },
})

// ── Helpers ─────────────────────────────────────────────────────────────────
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

// ── Sub-components ──────────────────────────────────────────────────────────
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

// ── Props ───────────────────────────────────────────────────────────────────
export interface EstimatePDFProps {
  estimate: any
  openings: any[]
  company: any
  customLabels?: Record<string, string>
  subtypesByType?: SubtypeMap
  drawingPngs?:   string[]
  drawingLabels?: { w: string; h: string }[]
}

// ── Component ───────────────────────────────────────────────────────────────
export function EstimatePDF({ estimate, openings, company, customLabels, subtypesByType, drawingPngs, drawingLabels }: EstimatePDFProps) {
  const depositPct    = estimate.deposit_percent || 0
  const depositAmt    = (estimate.total || 0) * (depositPct / 100)
  const balanceAmt    = (estimate.total || 0) - depositAmt
  const contactEmail  = company.company_contact_email || company.email || null
  const projectSite   = estimate.job_site_same_as_client === false && estimate.job_site_address
    ? [estimate.job_site_address, estimate.job_site_city, estimate.job_site_province, estimate.job_site_postal_code].filter(Boolean).join(', ')
    : [estimate.client_address, estimate.client_city, estimate.client_province, estimate.client_postal_code].filter(Boolean).join(', ')

  return (
    <Document>
      <Page size="LETTER" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.hdrRow}>
          <View style={S.hdrLeft}>
            {company.logo_url
              ? <Image style={S.logo} src={company.logo_url} />
              : <Text style={S.coName}>{company.company_name || 'Your Company'}</Text>
            }
            {company.logo_url && <Text style={S.coName}>{company.company_name}</Text>}
            {company.phone    && <Text style={S.coInfo}>{company.phone}</Text>}
            {contactEmail     && <Text style={S.coInfo}>{contactEmail}</Text>}
            {company.website  && <Text style={S.coInfo}>{company.website}</Text>}
            {(company.address || company.city) &&
              <Text style={S.coInfo}>{[company.address, company.city, company.province, company.postal].filter(Boolean).join(', ')}</Text>}
            {company.licence      && <Text style={S.coInfo}>Lic# {company.licence}</Text>}
            {company.gst_hst_number && <Text style={S.coInfo}>GST/HST# {company.gst_hst_number}</Text>}
            {company.wsib_number    && <Text style={S.coInfo}>WSIB/WCB# {company.wsib_number}</Text>}
          </View>
          <View style={S.hdrRight}>
            <View style={S.badge}><Text style={S.badgeText}>ESTIMATE</Text></View>
            <Text style={S.docNum}>{estimate.estimate_number}</Text>
            <Text style={S.docMeta}>Date: {fmtDate(estimate.created_at)}</Text>
            {estimate.valid_until && <Text style={S.docMeta}>Valid until: {fmtDate(estimate.valid_until)}</Text>}
          </View>
        </View>

        {/* ── META ROW ── */}
        <View style={S.metaRow}>
          {/* Prepared for */}
          <View style={S.metaBox}>
            <Text style={S.metaLbl}>Prepared for</Text>
            <Text style={S.metaName}>{estimate.client_name}</Text>
            {estimate.client_address && <Text style={S.metaVal}>{[estimate.client_address, estimate.client_city, estimate.client_province].filter(Boolean).join(', ')}</Text>}
            {estimate.client_phone   && <Text style={S.metaVal}>{estimate.client_phone}</Text>}
            {estimate.client_email   && <Text style={S.metaVal}>{estimate.client_email}</Text>}
          </View>

          {/* Project site */}
          <View style={S.metaMid}>
            <Text style={S.metaLbl}>Project site</Text>
            {projectSite
              ? <Text style={S.metaName}>{projectSite}</Text>
              : <Text style={S.metaVal}>Same as above</Text>}
          </View>

          {/* Summary */}
          <View style={S.metaBox}>
            <Text style={S.metaLbl}>Summary</Text>
            <Text style={S.metaName}>{openings.length} opening{openings.length !== 1 ? 's' : ''}</Text>
            <Text style={S.metaVal}>Total incl. tax: {fmtCAD(estimate.total || 0)}</Text>
            {depositPct > 0 && <Text style={S.metaVal}>Deposit ({depositPct}%): {fmtCAD(depositAmt)}</Text>}
          </View>
        </View>

        {/* ── SCOPE OF WORK ── */}
        <Text style={S.secLabel}>Scope of work</Text>

        {openings.map((op: any, i: number) => {
          const typeName = customLabels?.[V2_TO_OLD_TYPE_KEY[op.type]] || customLabels?.[op.type] || V2_TYPE_LABELS[op.type] || OPENING_TYPES[op.type]?.name || humanize(op.type)
          const subLabel = getSubtypeLabel(op, subtypesByType)
          const title    = [op.qty > 1 ? `${op.qty}×` : null, typeName, subLabel ? `(${subLabel})` : null, op.room ? `— ${op.room}` : null].filter(Boolean).join(' ')
          const extColour = getColourLabel(op)
          const intColour = getInteriorColourLabel(op)
          const gridVal   = (op.grid_pattern && op.grid_pattern !== 'none') ? humanize(op.grid_pattern) : null
          const floorVal  = op.floor && op.floor !== 'first' ? humanize(op.floor) : null
          const paneLabel = op.pane === 'triple' ? 'Triple Pane' : op.pane === 'single' ? 'Single Pane' : null

          const glassChips: string[] = []
          if (paneLabel) glassChips.push(paneLabel)
          if (op.glass_kind && op.glass_kind !== 'clear') glassChips.push(humanize(op.glass_kind))
          if (op.low_e)           glassChips.push('Low-E')
          if (op.argon)           glassChips.push('Argon')
          if (op.tempered)        glassChips.push('Tempered')
          if (op.laminated_glass) glassChips.push('Laminated')

          const hasLocation = !!(op.room || floorVal)
          const hasGlass    = glassChips.length > 0

          return (
            <View key={i} style={S.card} wrap={false}>
              {/* Card header */}
              <View style={S.cardHdr}>
                <Text style={S.cardNum}>{i + 1}</Text>
                <Text style={S.cardTitle}>{title}</Text>
                <Text style={S.cardPrice}>{fmtCAD(op.total_cost || 0)}</Text>
              </View>

              {/* Card body */}
              <View style={S.cardBody}>
                {/* Drawing */}
                <View style={S.drawingCol}>
                  <View style={{ flexDirection: 'row' }}>
                    <View>
                      {drawingPngs?.[i]
                        ? <Image src={drawingPngs[i]} style={S.drawing} />
                        : null}
                      {drawingLabels?.[i]?.w
                        ? <Text style={S.dimLblW}>{drawingLabels[i].w}</Text>
                        : null}
                    </View>
                    {drawingLabels?.[i]?.h
                      ? <View style={{ height: 216, justifyContent: 'center', marginLeft: 2 }}>
                          <Text style={S.dimLblH}>{drawingLabels[i].h}</Text>
                        </View>
                      : null}
                  </View>
                </View>

                {/* Specs */}
                <View style={S.specsCol}>
                  {/* Location */}
                  {hasLocation && (
                    <>
                      <GrpHdr>Location</GrpHdr>
                      <SR label="Room"  value={op.room} />
                      <SR label="Floor" value={floorVal} />
                    </>
                  )}

                  {/* Product */}
                  <GrpHdr>Product</GrpHdr>
                  <SR label="Size"         value={`${op.width_in}" × ${op.height_in}"`} />
                  <SR label="Material"     value={humanize(op.material)} />
                  <SR label="Ext. colour"  value={extColour || undefined} />
                  <SR label="Int. colour"  value={intColour || undefined} />
                  <SR label="Grid"         value={gridVal || undefined} />
                  <SR label="Installation" value={humanize(op.install)} />

                  {/* Glass */}
                  {hasGlass && (
                    <>
                      <GrpHdr>Glass</GrpHdr>
                      <View style={S.chipsRow}>
                        {glassChips.map(c => <Chip key={c} label={c} />)}
                      </View>
                    </>
                  )}

                  {/* Notes */}
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

        {/* ── TOTALS + NOTES ── */}
        <View style={S.bottomHalf} wrap={false}>
          {/* Scope notes */}
          {!!estimate.scope_notes && (
            <View style={S.notesCol}>
              <Text style={[S.secLabel, { marginTop: 8 }]}>Notes</Text>
              <Text style={S.notesBody}>{estimate.scope_notes}</Text>
            </View>
          )}

          {/* Totals */}
          <View style={[S.totalsCol, !estimate.scope_notes ? { marginLeft: 'auto' } : {}]}>
            <Text style={[S.secLabel, { marginTop: 8 }]}>Pricing</Text>

            <View style={S.totRow}>
              <Text style={S.totLbl}>Subtotal</Text>
              <Text style={S.totVal}>{fmtCAD(estimate.subtotal || 0)}</Text>
            </View>

            {!!(estimate.discount_value) && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Discount</Text>
                <Text style={S.totVal}>
                  {estimate.discount_type === 'percent'
                    ? `−${estimate.discount_value}%`
                    : `−${fmtCAD(estimate.discount_value)}`}
                </Text>
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

            {depositPct > 0 && (
              <View style={S.depositBox}>
                <Text style={S.depLbl}>Deposit on signing ({depositPct}%)</Text>
                <Text style={S.depAmt}>{fmtCAD(depositAmt)}</Text>
                <Text style={S.depBal}>Balance on completion: {fmtCAD(balanceAmt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── WARRANTY + VALIDITY ── */}
        {(!!company.warranty_summary || !!estimate.valid_until) && (
          <View style={S.infoGrid} wrap={false}>
            {!!company.warranty_summary && (
              <View style={S.infoCol}>
                <Text style={S.infoLbl}>Warranty</Text>
                <Text style={S.infoBody}>{company.warranty_summary}</Text>
              </View>
            )}
            {!!estimate.valid_until && (
              <View style={company.warranty_summary ? S.infoColR : S.infoCol}>
                <Text style={S.infoLbl}>Validity</Text>
                <Text style={S.infoBody}>
                  This estimate is valid until {fmtDate(estimate.valid_until)}.{'\n'}
                  Pricing is subject to change after this date.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>
            {[company.company_name, estimate.estimate_number, company.city].filter(Boolean).join(' · ')}
          </Text>
          <Text style={S.footerTxt}>
            {company.gst_hst_number ? `GST/HST# ${company.gst_hst_number}  ·  ` : ''}
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </Text>
        </View>

      </Page>
    </Document>
  )
}
