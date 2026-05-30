'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

const T = {
  blue: '#2563EB', blueDeep: '#1D4ED8', navy: '#0B1640',
  blueSoft: '#EEF3FF', blueText: '#C7D2FE',
  bg: '#F4F6FB', card: '#FFFFFF',
  ink: '#0B1220', inkMid: '#475467', inkSoft: '#94A0B4',
  hair: 'rgba(15,23,42,0.06)',
}
const SANS = '"Inter", -apple-system, "SF Pro Display", system-ui, sans-serif'
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", monospace'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_address: string | null; client_province: string | null
  status: string; tier: string | null; subtotal: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  scope_notes: string | null; valid_until: string | null
  has_tiers: boolean | null
  total_good: number | null; total_better: number | null; total_best: number | null
  tax_rate: number | null
}
interface Opening { id: string; type: string; qty: number; total_cost: number; room: string | null }
interface Profile {
  company_name: string | null; address: string | null; city: string | null; province: string | null; postal_code: string | null
  phone: string | null; logo_url: string | null; contract_terms: string | null; pricing_mode: string | null
}
interface TierData { display_name: string; specs: string[]; pricing_type: string; price: number }
interface PriceListItem {
  opening_type: string; is_tiered: boolean
  tier_good: TierData | null; tier_better: TierData | null; tier_best: TierData | null
}

function aggregateSpecs(ops: Opening[], items: PriceListItem[], field: 'tier_good' | 'tier_better' | 'tier_best'): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  ops.forEach(op => {
    const item = items.find(p => p.opening_type === op.type && p.is_tiered)
    const tier = item?.[field]
    tier?.specs?.forEach(s => { if (!seen.has(s)) { seen.add(s); out.push(s) } })
  })
  return out.slice(0, 5)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso + 'T00:00:00'))
}

export default function ClientEstimatePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([])
  const [docStatus, setDocStatus] = useState<'loading' | 'signed' | 'declined' | 'active'>('loading')

  useEffect(() => {
    async function load() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
      if (!est) return
      setEstimate(est)
      if (est.status === 'signed') setDocStatus('signed')
      else if (est.status === 'declined') setDocStatus('declined')
      else setDocStatus('active')

      const [{ data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimate_openings').select('id, type, qty, total_cost, room').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, address, city, province, postal_code, phone, logo_url, contract_terms, pricing_mode').eq('id', (est as any).user_id).single(),
      ])
      setOpenings(ops || [])
      setProfile(prof)

      if (est.has_tiers) {
        const { data: pl } = await supabase
          .from('price_lists').select('opening_type, is_tiered, tier_good, tier_better, tier_best')
          .eq('user_id', (est as any).user_id).eq('is_tiered', true)
        setPriceListItems((pl || []) as PriceListItem[])
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (estimate) {
      document.title = `${estimate.estimate_number} — ${estimate.client_name || ''}`
    }
  }, [estimate])

  if (docStatus === 'loading' || !estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg, fontFamily: SANS }}>
      <div style={{ fontSize: 13, color: T.inkSoft }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const estimateNumber = estimate.estimate_number
  const clientName = estimate.client_name || ''

  const handleDownload = async () => {
    const element = document.getElementById('estimate-content')
    if (!element) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#F8F9FC',
      windowWidth: element.scrollWidth,
      width: element.scrollWidth,
    })
    const { default: jsPDF } = await import('jspdf')
    const imgWidth = 595
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pdf = new jsPDF('p', 'pt', [imgWidth, imgHeight])
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`${estimateNumber} — ${clientName}.pdf`)
  }

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const showGBB = !!(estimate.has_tiers && estimate.total_good && estimate.total_better && estimate.total_best)
  const goodSpecs   = aggregateSpecs(openings, priceListItems, 'tier_good')
  const betterSpecs = aggregateSpecs(openings, priceListItems, 'tier_better')
  const bestSpecs   = aggregateSpecs(openings, priceListItems, 'tier_best')
  const validUntil  = estimate.valid_until ? fmtDate(estimate.valid_until) : null
  const companyLine = [profile?.company_name, profile?.phone].filter(Boolean).join(' · ')

  return (
    <div className="page-wrap" style={{ background: T.bg, minHeight: '100vh', fontFamily: SANS, paddingBottom: 90 }}>
      <style>{`
        @media print {
          .download-btn { display: none !important; }
          @page { margin: 10mm; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #FFFFFF !important; }
          .page-wrap { background: #FFFFFF !important; padding: 0 !important; }
          .terms-block { background: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div id="estimate-content" style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <div style={{ background: T.card, borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '26px 22px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 10 }}>
            Prepared for
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: estimate.client_address ? 6 : 14 }}>
            {estimate.client_name || 'Client'}
          </div>
          {estimate.client_address && (
            <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>
              {estimate.client_address}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ display: 'inline-block', padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.blueSoft, color: T.blue, fontFamily: MONO, letterSpacing: '0.04em' }}>
              {estimate.estimate_number}
            </span>
            {profile?.company_name && (
              <span style={{ display: 'inline-block', padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1px solid ${T.hair}`, color: T.inkMid }}>
                {profile.company_name}
              </span>
            )}
            {validUntil && (
              <span style={{ display: 'inline-block', padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1px solid ${T.hair}`, color: T.inkMid }}>
                Valid until {validUntil}
              </span>
            )}
          </div>
        </div>

        {/* ── TOTAL BAND ── */}
        <div style={{ background: T.card, borderRadius: 14, border: '0.5px solid #E5E7EB', marginTop: 10, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 5 }}>
              Estimate Total
            </div>
            {companyLine && (
              <div style={{ fontSize: 13, color: T.inkMid }}>{companyLine}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: T.blue, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {fmtCAD(estimate.total)}
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>inc. {taxLabel}</div>
          </div>
        </div>

        {/* ── ITEMS ── */}
        {openings.length > 0 && (
          <div style={{ background: T.card, borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '22px 22px 0', marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 14 }}>
              Items ({openings.length})
            </div>
            {openings.map((op, i) => (
              <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 14, marginBottom: 14, borderBottom: i < openings.length - 1 ? `1px solid ${T.hair}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                    {OPENING_TYPES[op.type]?.name || op.type}
                    {op.qty > 1 && <span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 500 }}> × {op.qty}</span>}
                  </div>
                  {op.room && (
                    <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{op.room}</div>
                  )}
                </div>
                {!showGBB && (
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: MONO, flexShrink: 0 }}>
                    {fmtCAD(op.total_cost)}
                  </div>
                )}
              </div>
            ))}

            {/* Totals footer */}
            {!showGBB && (
              <div style={{ borderTop: `1px solid ${T.hair}`, padding: '16px 0 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.inkMid, marginBottom: 8 }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: MONO }}>{fmtCAD(estimate.subtotal)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                    <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                    <span style={{ fontFamily: MONO }}>−{fmtCAD(estimate.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.inkMid, marginBottom: 14 }}>
                  <span>{taxLabel}</span>
                  <span style={{ fontFamily: MONO }}>{fmtCAD(estimate.tax_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1.5px solid ${T.ink}`, paddingTop: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Total</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: T.blue, letterSpacing: '-0.02em', fontFamily: MONO }}>{fmtCAD(estimate.total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GBB ── */}
        {showGBB && (
          <div style={{ background: T.card, borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '22px', marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 14 }}>Your Options</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Good',   specs: goodSpecs,   price: estimate.total_good!,   style: { border: `1.5px solid ${T.hair}`, borderRadius: 12, padding: '14px 16px' }, labelColor: T.inkMid, priceColor: T.ink },
                { label: 'Better', specs: betterSpecs, price: estimate.total_better!, style: { border: `2px solid ${T.blue}`, borderRadius: 12, padding: '14px 16px', background: T.blueSoft }, labelColor: T.blue, priceColor: T.blue, badge: 'Recommended' },
                { label: 'Best',   specs: bestSpecs,   price: estimate.total_best!,   style: { border: '1.5px solid #D97706', borderRadius: 12, padding: '14px 16px' }, labelColor: '#D97706', priceColor: T.ink },
              ].map(({ label, specs, price, style, labelColor, priceColor, badge }) => (
                <div key={label} style={style}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: specs.length ? 8 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                    {badge && <span style={{ fontSize: 10, fontWeight: 700, background: T.blue, color: '#fff', borderRadius: 20, padding: '2px 8px' }}>{badge}</span>}
                  </div>
                  {specs.map((s, i) => <div key={i} style={{ fontSize: 12, color: labelColor, marginBottom: 3 }}>• {s}</div>)}
                  <div style={{ fontSize: 22, fontWeight: 800, color: priceColor, marginTop: 10, fontFamily: MONO }}>{fmtCAD(price)}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>inc. {taxLabel}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTES ── */}
        {estimate.scope_notes && (
          <div style={{ background: T.card, borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '20px 22px', marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 10 }}>Notes</div>
            <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
          </div>
        )}

        {/* ── TERMS ── */}
        {profile?.contract_terms && (
          <div className="terms-block" style={{ margin: '10px 0', background: '#ffffff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 10 }}>Terms &amp; Conditions</div>
            <div style={{ fontSize: 12.5, color: T.inkMid, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{profile.contract_terms}</div>
          </div>
        )}

      </div>

      {/* ── STICKY DOWNLOAD BUTTON ── */}
      <div
        className="download-btn"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px', background: 'linear-gradient(to top, #F4F6FB 60%, transparent)' }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button
            onClick={handleDownload}
            style={{ width: '100%', height: 54, borderRadius: 14, background: T.blue, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: SANS, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

    </div>
  )
}
