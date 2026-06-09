import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerLeft: { flexDirection: 'column' },
  logo: { width: 120, height: 40, objectFit: 'contain', marginBottom: 8 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0A1628' },
  companyContact: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#2563EB' },
  docNumber: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  docDate: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  twoCol: { flexDirection: 'row', gap: 20 },
  col: { flex: 1 },
  infoBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 6 },
  infoLabel: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 10, color: '#0A1628', fontFamily: 'Helvetica-Bold' },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 8, borderRadius: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  tableCell: { flex: 1, fontSize: 9, color: '#374151' },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A1628' },
  tableCellRight: { flex: 1, fontSize: 9, color: '#374151', textAlign: 'right' },
  tableCellRightBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A1628', textAlign: 'right' },
  totalsSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  totalLabel: { fontSize: 9, color: '#6b7280', width: 120, textAlign: 'right', marginRight: 16 },
  totalValue: { fontSize: 9, color: '#374151', width: 80, textAlign: 'right' },
  totalFinalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0A1628', width: 120, textAlign: 'right', marginRight: 16 },
  totalFinalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2563EB', width: 80, textAlign: 'right' },
  depositBox: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 6, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  depositLabel: { fontSize: 9, color: '#1d4ed8' },
  depositValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  validBox: { marginTop: 16, padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 6 },
  validText: { fontSize: 9, color: '#6b7280', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#9ca3af' },
  openingCard: { marginBottom: 8, padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 6 },
  openingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  openingTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0A1628' },
  openingPrice: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#2563EB' },
  openingDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  openingDetail: { fontSize: 8, color: '#6b7280' },
  tierTable: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tierBox: { flex: 1, padding: 10, borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 6, alignItems: 'center' },
  tierBoxBetter: { flex: 1, padding: 10, borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 6, alignItems: 'center', backgroundColor: '#eff6ff' },
  tierLabel: { fontSize: 8, color: '#6b7280', marginBottom: 4 },
  tierPrice: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0A1628' },
  tierPriceBetter: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2563EB' },
  tierRecommended: { fontSize: 7, color: '#2563EB', marginTop: 2 },
})

const WINDOW_TYPES: Record<string, string> = {
  window_dh: 'Double-Hung Window',
  window_casement: 'Casement Window',
  window_sliding: 'Sliding Window',
  window_picture: 'Picture Window',
  window_bay: 'Bay Window',
  window_bow: 'Bow Window',
  window_awning: 'Awning Window',
  window_combination: 'Combination Window',
  window_garden: 'Garden Window',
  window_skylight: 'Skylight',
  door_entry: 'Entry Door',
  door_double_entry: 'Double Entry Door',
  door_french: 'French Doors',
  door_patio_sliding: 'Patio Sliding Door',
  door_garden: 'Garden Door',
  door_storm: 'Storm Door',
  door_interior: 'Interior Door',
}

function formatCurrency(amount: number) {
  return `CA$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

interface EstimatePDFProps {
  estimate: any
  openings: any[]
  company: any
}

export function EstimatePDF({ estimate, openings, company }: EstimatePDFProps) {
  const depositAmount = (estimate.total || 0) * ((estimate.deposit_percent || 0) / 100)
  const balanceAmount = (estimate.total || 0) - depositAmount

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo_url ? (
              <Image style={styles.logo} src={company.logo_url} />
            ) : (
              <Text style={styles.companyName}>{company.company_name || 'Your Company'}</Text>
            )}
            {company.logo_url && <Text style={styles.companyName}>{company.company_name}</Text>}
            {company.phone && <Text style={styles.companyContact}>{company.phone}</Text>}
            {company.email && <Text style={styles.companyContact}>{company.email}</Text>}
            {company.website && <Text style={styles.companyContact}>{company.website}</Text>}
            {company.address && <Text style={styles.companyContact}>{company.address}{company.city ? `, ${company.city}` : ''}{company.province ? `, ${company.province}` : ''}</Text>}
            {company.licence_number && <Text style={styles.companyContact}>Lic# {company.licence_number}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>ESTIMATE</Text>
            <Text style={styles.docNumber}>{estimate.estimate_number}</Text>
            <Text style={styles.docDate}>Date: {formatDate(estimate.created_at || new Date().toISOString())}</Text>
            <Text style={styles.docDate}>Valid until: {formatDate(estimate.valid_until || new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared for</Text>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0A1628', marginBottom: 4 }}>{estimate.client_name}</Text>
            {estimate.client_address && <Text style={styles.companyContact}>{estimate.client_address}, {estimate.client_city}, {estimate.client_province} {estimate.client_postal_code}</Text>}
            {estimate.client_phone && <Text style={styles.companyContact}>{estimate.client_phone}</Text>}
            {estimate.client_email && <Text style={styles.companyContact}>{estimate.client_email}</Text>}
          </View>
        </View>

        {/* Openings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of work — {openings.length} opening{openings.length !== 1 ? 's' : ''}</Text>
          {openings.map((op: any, i: number) => (
            <View key={i} style={styles.openingCard}>
              <View style={styles.openingHeader}>
                <Text style={styles.openingTitle}>{op.qty > 1 ? `${op.qty}× ` : ''}{WINDOW_TYPES[op.type] || op.type}{op.room ? ` — ${op.room}` : ''}</Text>
                <Text style={styles.openingPrice}>{formatCurrency(op.total_cost)}</Text>
              </View>
              <View style={styles.openingDetails}>
                <Text style={styles.openingDetail}>Size: {op.width_in}" × {op.height_in}"</Text>
                {op.colour && <Text style={styles.openingDetail}>Colour: {op.colour}</Text>}
                {op.material && <Text style={styles.openingDetail}>Material: {op.material}</Text>}
                {op.glass && op.glass !== 'clear' && <Text style={styles.openingDetail}>Glass: {op.glass}</Text>}
                {op.floor && op.floor !== 'first' && <Text style={styles.openingDetail}>Floor: {op.floor}</Text>}
                {op.notes && <Text style={styles.openingDetail}>Note: {op.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Tier pricing if applicable */}
        {estimate.has_tiers && estimate.total_good && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options</Text>
            <View style={styles.tierTable}>
              <View style={styles.tierBox}>
                <Text style={styles.tierLabel}>Good</Text>
                <Text style={styles.tierPrice}>{formatCurrency(estimate.total_good)}</Text>
              </View>
              <View style={styles.tierBoxBetter}>
                <Text style={styles.tierLabel}>Better</Text>
                <Text style={styles.tierPriceBetter}>{formatCurrency(estimate.total_better)}</Text>
                <Text style={styles.tierRecommended}>★ Recommended</Text>
              </View>
              <View style={styles.tierBox}>
                <Text style={styles.tierLabel}>Best</Text>
                <Text style={styles.tierPrice}>{formatCurrency(estimate.total_best)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.subtotal)}</Text>
          </View>
          {estimate.discount_value && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-{estimate.discount_type === 'percent' ? `${estimate.discount_value}%` : formatCurrency(estimate.discount_value)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({((estimate.tax_rate || 0) * 100).toFixed(0)}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.tax_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(estimate.total)}</Text>
          </View>
        </View>

        {/* Deposit info */}
        {estimate.deposit_percent > 0 && (
          <View style={styles.depositBox}>
            <View>
              <Text style={styles.depositLabel}>Deposit on signing ({estimate.deposit_percent}%)</Text>
              <Text style={{ fontSize: 8, color: '#3b82f6', marginTop: 2 }}>Balance on completion</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.depositValue}>{formatCurrency(depositAmount)}</Text>
              <Text style={{ fontSize: 9, color: '#1d4ed8', marginTop: 2 }}>{formatCurrency(balanceAmount)}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {estimate.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{estimate.notes}</Text>
          </View>
        )}

        {/* Valid until */}
        <View style={styles.validBox}>
          <Text style={styles.validText}>This estimate is valid for 30 days until {formatDate(estimate.valid_until || new Date().toISOString())}. Prices subject to change after expiry.</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.company_name} · {estimate.estimate_number}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
