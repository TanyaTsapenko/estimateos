import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { substituteProvince } from '@/lib/provinces'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel, type SubtypeMap } from '@/lib/openingLabels'
import { OPENING_TYPES } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'

const INK  = '#0B1220'
const INK_M = '#475467'
const INK_S = '#94A0B4'
const BLUE  = '#2563EB'
const BLUE_D = '#1D4ED8'
const HAIR  = '#E8EDF3'

const INSTALL_LABELS: Record<string, string> = { fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
const MATERIAL_LABELS: Record<string, string> = { wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: BLUE },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { maxWidth: 130, maxHeight: 36, objectFit: 'contain' },
  monogram: { width: 36, height: 36, backgroundColor: BLUE, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  monogramLetter: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  companyName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 3 },
  docNumber: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 2 },
  docDate: { fontSize: 9, color: INK_S },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  col: { flex: 1, padding: 10, backgroundColor: '#F7F9FC', borderRadius: 6, borderWidth: 0.5, borderColor: HAIR },
  colTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: INK_S, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  colValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 4 },
  colDetail: { fontSize: 8.5, color: INK_M, marginBottom: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 8, marginTop: 14, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: HAIR },
  totalsBox: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { fontSize: 9, color: INK_M, width: 140, textAlign: 'right', marginRight: 16 },
  totalValue: { fontSize: 9, color: INK, width: 80, textAlign: 'right' },
  totalFinalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK, width: 140, textAlign: 'right', marginRight: 16 },
  totalFinalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLUE_D, width: 80, textAlign: 'right' },
  paymentBox: { marginTop: 12, padding: '12 14', backgroundColor: '#EEF3FF', borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(37,99,235,0.2)' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  paymentLabelStrong: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE_D },
  paymentValueStrong: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE_D },
  paymentLabelMuted: { fontSize: 9, color: INK_M },
  paymentValueMuted: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK },
  clauseItem: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: HAIR },
  clauseTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 3 },
  clauseText: { fontSize: 8.5, color: INK_M, lineHeight: 1.5 },
  signaturesSection: { marginTop: 24, flexDirection: 'row', gap: 40 },
  signatureBox: { flex: 1 },
  signatureTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INK_S, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  signatureImage: { width: 140, height: 48, objectFit: 'contain', marginBottom: 6 },
  signatureLine: { borderBottomWidth: 1.5, borderBottomColor: INK, marginBottom: 5 },
  signatureName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 1 },
  signatureDate: { fontSize: 8, color: INK_S },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: HAIR, paddingTop: 8 },
  footerText: { fontSize: 8, color: INK_S },
})

function formatCurrency(amount: number) {
  return `CA$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

interface ContractPDFProps {
  contract: any
  estimate: any
  openings: any[]
  company: any
  customLabels?: Record<string, string>
  subtypesByType?: SubtypeMap
  openingPngs?: Record<string, string>
}

export function ContractPDF({ contract, estimate, openings, company, customLabels, subtypesByType, openingPngs }: ContractPDFProps) {
  const depositPct    = estimate.deposit_percent || 0
  const depositAmount = (estimate.total || 0) * (depositPct / 100)
  const balanceAmount = (estimate.total || 0) - depositAmount
  const clauses       = Array.isArray(contract.contract_clauses) ? contract.contract_clauses : []
  const companyName   = company.company_name || 'Your Company'
  const conId         = `CON-${contract.contract_number || contract.id.slice(-6).toUpperCase()}`
  const docDate       = formatDate(contract.signed_at || contract.created_at)

  const detItems: { label: string; value: string }[] = []
  if (company.warranty_period)      detItems.push({ label: 'Warranty period',       value: company.warranty_period })
  if (company.completion_timeframe) detItems.push({ label: 'Completion timeframe',  value: company.completion_timeframe })
  if (company.project_manager)      detItems.push({ label: 'Project manager',        value: company.project_manager })
  if (estimate.payment_method)      detItems.push({ label: 'Accepted payment',       value: estimate.payment_method })

  const DocHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {company.logo_url
          ? <Image style={styles.logo} src={company.logo_url} />
          : <>
              <View style={styles.monogram}>
                <Text style={styles.monogramLetter}>{companyName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.companyName}>{companyName}</Text>
            </>
        }
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.docTitle}>INSTALLATION CONTRACT</Text>
        <Text style={styles.docNumber}>{conId}</Text>
        <Text style={styles.docDate}>{docDate}</Text>
      </View>
    </View>
  )

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <DocHeader />

        {/* Parties */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Company</Text>
            <Text style={styles.colValue}>{companyName}</Text>
            {company.phone && <Text style={styles.colDetail}>{company.phone}</Text>}
            {company.email && <Text style={styles.colDetail}>{company.email}</Text>}
            {company.address && <Text style={styles.colDetail}>{[company.address, company.city, company.province].filter(Boolean).join(', ')}</Text>}
            {company.licence && (
              <View style={{ marginTop: 5 }}>
                <View style={{ backgroundColor: '#EEF3FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 8, color: BLUE, fontFamily: 'Helvetica-Bold' }}>Lic# {company.licence}</Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Client</Text>
            <Text style={styles.colValue}>{estimate.client_name}</Text>
            {estimate.client_phone  && <Text style={styles.colDetail}>{estimate.client_phone}</Text>}
            {estimate.client_email  && <Text style={styles.colDetail}>{estimate.client_email}</Text>}
            {estimate.client_address && <Text style={styles.colDetail}>{[estimate.client_address, estimate.client_city, estimate.client_province].filter(Boolean).join(', ')}</Text>}
          </View>
        </View>

        {/* Scope of Work */}
        <Text style={styles.sectionTitle}>Scope of Work</Text>
        {openings.map((op: any, i: number) => {
          const resolvedType = V2_TO_OLD_TYPE_KEY[op.type] ?? op.type
          const name = (customLabels?.[V2_TO_OLD_TYPE_KEY[op.type]] || customLabels?.[op.type] || OPENING_TYPES[resolvedType]?.name || V2_TYPE_LABELS[op.type] || op.type) + (op.window_subtype ? ` (${getSubtypeLabel(op, subtypesByType)})` : '')
          const specParts: string[] = []
          if (op.width_in && op.height_in) specParts.push(`${op.width_in}" × ${op.height_in}"`)
          const extCol = op.colour && op.colour !== 'white' ? getColourLabel(op) : null
          const intCol = getInteriorColourLabel(op)
          if (extCol) specParts.push(`Ext. ${extCol}`)
          if (intCol) specParts.push(`Int. ${intCol}`)
          if (op.install  && op.install  !== 'retrofit') specParts.push(`Install: ${INSTALL_LABELS[op.install]  || op.install}`)
          if (op.material && op.material !== 'vinyl')    specParts.push(`Material: ${MATERIAL_LABELS[op.material] || op.material}`)
          if (op.room) specParts.push(op.room)
          return (
            <View key={i} style={styles.tableRow}>
              <View style={{ width: '18%' }}>
                {openingPngs?.[op.id]
                  ? <Image src={openingPngs[op.id]} style={{ width: 72, height: 86, objectFit: 'contain' }} />
                  : <View style={{ width: 72, height: 86, borderWidth: 0.5, borderColor: HAIR, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 7, color: INK_S, textAlign: 'center' }}>{op.type}</Text>
                    </View>
                }
              </View>
              <View style={{ flex: 1, paddingLeft: 8, justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 3 }}>{name}</Text>
                <Text style={{ fontSize: 8, color: INK_S, marginBottom: specParts.length > 0 ? 2 : 0 }}>Qty {op.qty}</Text>
                {specParts.length > 0 && <Text style={{ fontSize: 8, color: INK_M }}>{specParts.join(' · ')}</Text>}
              </View>
              <View style={{ width: '16%', alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK }}>{formatCurrency(op.total_cost)}</Text>
              </View>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.subtotal)}</Text>
          </View>
          {estimate.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#16a34a' }]}>−{formatCurrency(estimate.discount_amount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.tax_amount)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 5, paddingTop: 5, borderTopWidth: 0.5, borderTopColor: '#CBD5E1' }]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(estimate.total)}</Text>
          </View>
        </View>

        {/* Payment band */}
        {depositPct > 0 && (
          <View style={styles.paymentBox}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabelStrong}>Deposit due upon signing ({depositPct}%)</Text>
              <Text style={styles.paymentValueStrong}>{formatCurrency(depositAmount)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabelMuted}>Balance on completion ({100 - depositPct}%)</Text>
              <Text style={styles.paymentValueMuted}>{formatCurrency(balanceAmount)}</Text>
            </View>
          </View>
        )}

        {/* Detail cards */}
        {detItems.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {detItems.map((item, i) => (
                <View key={i} style={{ width: '48%', backgroundColor: '#F7F9FC', borderRadius: 6, padding: 8, borderWidth: 0.5, borderColor: HAIR }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: INK_S, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{item.label}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{companyName} · Installation Contract</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2 — Terms & Signatures */}
      {(clauses.length > 0 || contract.contract_terms_snapshot || contract.client_signature_url) && (
        <Page size="LETTER" style={styles.page}>
          <DocHeader />

          {/* Terms */}
          {(clauses.length > 0 || contract.contract_terms_snapshot) && (
            <View>
              <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
              {clauses.length > 0
                ? [...clauses].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).filter((c: any) => c.enabled !== false).map((clause: any, i: number) => (
                    <View key={i} style={styles.clauseItem}>
                      <Text style={styles.clauseTitle}>{clause.title || clause.name}</Text>
                      <Text style={styles.clauseText}>{substituteProvince(clause.content || clause.text || '', company.province)}</Text>
                    </View>
                  ))
                : <Text style={styles.clauseText}>{contract.contract_terms_snapshot}</Text>
              }
            </View>
          )}

          {/* Signatures */}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Signatures</Text>
          <View style={styles.signaturesSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Contractor</Text>
              {(contract.contractor_signature_url || company.signature_url) && (
                <Image style={styles.signatureImage} src={contract.contractor_signature_url || company.signature_url} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{company.signing_rep_name || companyName}</Text>
              <Text style={styles.signatureDate}>{companyName} · {docDate}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Client</Text>
              {contract.client_signature_url && (
                <Image style={styles.signatureImage} src={contract.client_signature_url} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{estimate.client_name}</Text>
              <Text style={styles.signatureDate}>{formatDate(contract.signed_at || contract.created_at)}</Text>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{companyName} · Installation Contract</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  )
}
