import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { substituteProvince } from '@/lib/provinces'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel, type SubtypeMap } from '@/lib/openingLabels'
import { OPENING_TYPES } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { maxWidth: 130, maxHeight: 40, objectFit: 'contain', marginRight: 10 },
  logoPlaceholder: { width: 36, height: 36, backgroundColor: '#0B1640', borderRadius: 8, marginRight: 10 },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0B1220', marginBottom: 2 },
  companyContact: { fontSize: 8, color: '#94A0B4' },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#2563EB', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  docNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0B1220', marginBottom: 3 },
  docDate: { fontSize: 9, color: '#94A0B4' },
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col: { flex: 1, padding: 10, backgroundColor: '#F8F9FC', borderRadius: 5 },
  colTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#94A0B4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  colValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0B1220', marginBottom: 5 },
  colDetail: { fontSize: 8.5, color: '#475467', marginBottom: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0A1628', marginBottom: 10, marginTop: 16, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 8, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  col60: { width: '60%', fontSize: 9 },
  col20: { width: '20%', fontSize: 9, textAlign: 'center' },
  col20Right: { width: '20%', fontSize: 9, textAlign: 'right' },
  col60Bold: { width: '60%', fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A1628' },
  totalsBox: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { fontSize: 9, color: '#6b7280', width: 140, textAlign: 'right', marginRight: 16 },
  totalValue: { fontSize: 9, color: '#374151', width: 80, textAlign: 'right' },
  totalFinalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0A1628', width: 140, textAlign: 'right', marginRight: 16 },
  totalFinalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2563EB', width: 80, textAlign: 'right' },
  paymentBox: { marginTop: 12, padding: 12, backgroundColor: '#eff6ff', borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between' },
  paymentLabel: { fontSize: 9, color: '#1d4ed8' },
  paymentValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  detailsBox: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb', borderRadius: 6 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 9, color: '#6b7280', width: 140 },
  detailValue: { fontSize: 9, color: '#0A1628', flex: 1 },
  clauseItem: { marginBottom: 10 },
  clauseTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A1628', marginBottom: 3 },
  clauseText: { fontSize: 8.5, color: '#4b5563', lineHeight: 1.5 },
  signaturesSection: { marginTop: 30, flexDirection: 'row', gap: 40 },
  signatureBox: { flex: 1 },
  signatureTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  signatureImage: { width: 150, height: 50, objectFit: 'contain', marginBottom: 4 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#374151', marginBottom: 4 },
  signatureName: { fontSize: 9, color: '#374151' },
  signatureDate: { fontSize: 8, color: '#6b7280' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#9ca3af' },
  badge: { fontSize: 8, color: '#ffffff', backgroundColor: '#0A1628', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
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
  const depositAmount = (estimate.total || 0) * ((estimate.deposit_percent || 0) / 100)
  const balanceAmount = (estimate.total || 0) - depositAmount
  const clauses = Array.isArray(contract.contract_clauses) ? contract.contract_clauses : []

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo_url
              ? <Image style={styles.logo} src={company.logo_url} />
              : <Text style={[styles.companyName, { fontSize: 14 }]}>{company.company_name || 'Your Company'}</Text>
            }
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>INSTALLATION CONTRACT</Text>
            <Text style={styles.docNumber}>CON-{contract.contract_number || contract.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.docDate}>{formatDate(contract.signed_at || contract.created_at)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Company</Text>
            <Text style={styles.colValue}>{company.company_name}</Text>
            {company.phone && <Text style={styles.colDetail}>{company.phone}</Text>}
            {company.email && <Text style={styles.colDetail}>{company.email}</Text>}
            {company.address && <Text style={styles.colDetail}>{[company.address, company.city, company.province].filter(Boolean).join(', ')}</Text>}
            {company.licence && (
              <View style={{ marginTop: 6 }}>
                <View style={{ backgroundColor: '#EEF3FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 8.5, color: '#2563EB', fontFamily: 'Helvetica-Bold' }}>Lic# {company.licence}</Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.colTitle}>Client</Text>
            <Text style={styles.colValue}>{estimate.client_name}</Text>
            {estimate.client_phone && <Text style={styles.colDetail}>{estimate.client_phone}</Text>}
            {estimate.client_email && <Text style={styles.colDetail}>{estimate.client_email}</Text>}
            {estimate.client_address && <Text style={styles.colDetail}>{[estimate.client_address, estimate.client_city, estimate.client_province, estimate.client_postal_code].filter(Boolean).join(', ')}</Text>}
          </View>
        </View>

        {/* Scope of Work */}
        <Text style={styles.sectionTitle}>Scope of Work</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col60, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>Description</Text>
          <Text style={[styles.col20, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>Qty</Text>
          <Text style={[styles.col20Right, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>Amount</Text>
        </View>
        {openings.map((op: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <View style={{ width: '60%', flexDirection: 'row', gap: 8 }}>
              {openingPngs?.[op.id]
                ? <Image src={openingPngs[op.id]} style={{ width: 100, height: 100, objectFit: 'contain' }} />
                : <View style={{ width: 100, height: 100, border: '1pt solid #e5e7eb', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>{op.type}</Text>
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A1628' }}>{customLabels?.[V2_TO_OLD_TYPE_KEY[op.type]] || customLabels?.[op.type] || OPENING_TYPES[V2_TO_OLD_TYPE_KEY[op.type] ?? op.type]?.name || V2_TYPE_LABELS[op.type] || op.type}{op.window_subtype ? ` (${getSubtypeLabel(op, subtypesByType)})` : ''}</Text>
                {(() => {
                  const parts: string[] = []
                  if (op.width_in && op.height_in) parts.push(`${op.width_in}" × ${op.height_in}"`)
                  if (op.colour && op.colour !== 'white') parts.push(getColourLabel(op))
                  const intCol = getInteriorColourLabel(op)
                  if (intCol) parts.push(`Int: ${intCol}`)
                  if (op.material && op.material !== 'vinyl') parts.push(op.material)
                  if (parts.length === 0) return null
                  return <Text style={{ fontSize: 8, color: '#6b7280' }}>{parts.join(' · ')}</Text>
                })()}
                {op.room && <Text style={{ fontSize: 8, color: '#6b7280' }}>{op.room}</Text>}
              </View>
            </View>
            <Text style={styles.col20}>{op.qty}</Text>
            <Text style={styles.col20Right}>{formatCurrency(op.total_cost)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({((estimate.tax_rate || 0) * 100).toFixed(0)}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.tax_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(estimate.total)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.paymentBox}>
          <View>
            <Text style={styles.paymentLabel}>Deposit on signing ({estimate.deposit_percent}%)</Text>
            <Text style={{ fontSize: 8, color: '#3b82f6', marginTop: 2 }}>Balance on completion</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.paymentValue}>{formatCurrency(depositAmount)}</Text>
            <Text style={{ fontSize: 9, color: '#1d4ed8', marginTop: 2 }}>{formatCurrency(balanceAmount)}</Text>
          </View>
        </View>

        {/* Contract Details */}
        <View style={styles.detailsBox}>
          {company.warranty_period && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Warranty period</Text>
              <Text style={styles.detailValue}>{company.warranty_period}</Text>
            </View>
          )}
          {company.completion_timeframe && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completion timeframe</Text>
              <Text style={styles.detailValue}>{company.completion_timeframe}</Text>
            </View>
          )}
          {company.project_manager && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project manager</Text>
              <Text style={styles.detailValue}>{company.project_manager}</Text>
            </View>
          )}
          {estimate.payment_method && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Accepted payment</Text>
              <Text style={styles.detailValue}>{estimate.payment_method}</Text>
            </View>
          )}
        </View>

        {/* Footer page 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.company_name} · Signed Contract</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2 — Terms & Signatures */}
      {(clauses.length > 0 || contract.contract_terms_snapshot || contract.client_signature_url) && (
        <Page size="LETTER" style={styles.page}>
          {/* Header repeated */}
          <View style={[styles.header, { marginBottom: 16 }]}>
            <Text style={styles.companyName}>{company.company_name}</Text>
            <View style={styles.headerRight}>
              <Text style={{ fontSize: 9, color: '#6b7280' }}>CON-{contract.contract_number || contract.id.slice(-6).toUpperCase()} · Terms & Signatures</Text>
            </View>
          </View>

          {/* Terms */}
          {(clauses.length > 0 || contract.contract_terms_snapshot) && (
            <View>
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              {clauses.length > 0 ? (
                [...clauses].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).filter((c: any) => c.enabled !== false).map((clause: any, i: number) => (
                  <View key={i} style={styles.clauseItem}>
                    <Text style={styles.clauseTitle}>{clause.title || clause.name}</Text>
                    <Text style={styles.clauseText}>{substituteProvince(clause.content || clause.text || '', company.province)}</Text>
                  </View>
                ))
              ) : contract.contract_terms_snapshot ? (
                <Text style={styles.clauseText}>{contract.contract_terms_snapshot}</Text>
              ) : null}
            </View>
          )}

          {/* Signatures */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Signatures</Text>
          <View style={styles.signaturesSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Contractor</Text>
              {(contract.contractor_signature_url || company.signature_url) && (
                <Image style={styles.signatureImage} src={contract.contractor_signature_url || company.signature_url} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{company.company_name}</Text>
              <Text style={styles.signatureDate}>{formatDate(contract.signed_at || contract.created_at)}</Text>
              {company.signing_rep_name && <Text style={styles.signatureName}>{company.signing_rep_name}</Text>}
              {company.signing_rep_title && <Text style={styles.signatureDate}>{company.signing_rep_title}</Text>}
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
            <Text style={styles.footerText}>{company.company_name} · Signed Contract</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  )
}
