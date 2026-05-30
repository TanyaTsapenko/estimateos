'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

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

const ff = '"Inter", system-ui, -apple-system, sans-serif'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', overflow: 'hidden',
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

  if (docStatus === 'loading' || !estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily: ff }}>
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily: ff, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily: ff, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const showGBB = !!(estimate.has_tiers && estimate.total_good && estimate.total_better && estimate.total_best)
  const goodSpecs   = aggregateSpecs(openings, priceListItems, 'tier_good')
  const betterSpecs = aggregateSpecs(openings, priceListItems, 'tier_better')
  const bestSpecs   = aggregateSpecs(openings, priceListItems, 'tier_best')
  const validUntil  = estimate.valid_until ? fmtDate(estimate.valid_until) : null

  const badgeBase: React.CSSProperties = {
    display: 'inline-block', padding: '4px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ background: '#F5F6F8', minHeight: '100vh', fontFamily: ff }}>
      <style>{`
        @media print {
          body { background: #F5F6F8 !important; }
          .download-btn { display: none !important; }
          .powered-by { display: none !important; }
          @page { margin: 10mm; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Dark header */}
      <div style={{ background: '#080E1C', padding: '32px 20px 36px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            Prepared for
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: estimate.client_address ? 6 : 16 }}>
            {estimate.client_name || 'Client'}
          </div>
          {estimate.client_address && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              {estimate.client_address}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ ...badgeBase, background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(59,130,246,0.4)', color: '#93C5FD', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>
              {estimate.estimate_number}
            </span>
            {profile?.company_name && (
              <span style={{ ...badgeBase, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                {profile.company_name}
              </span>
            )}
            {validUntil && (
              <span style={{ ...badgeBase, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                Valid until {validUntil}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Company + Total card */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={profile.company_name || ''} style={{ height: 32, maxWidth: 120, objectFit: 'contain', display: 'block', marginBottom: 8 }} />
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{profile?.company_name || 'Contractor'}</div>
            {profile?.phone && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{profile.phone}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>Estimate Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtCAD(estimate.total)}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>inc. {taxLabel}</div>
          </div>
        </div>

        {/* Items card */}
        {openings.length > 0 && (
          <div style={card}>
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E5E7EB' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                Items ({openings.length})
              </span>
            </div>
            <div style={{ padding: '0 18px' }}>
              {openings.map((op, i) => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i < openings.length - 1 ? '0.5px solid #F1F5F9' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>
                      {OPENING_TYPES[op.type]?.name || op.type}
                      {op.qty > 1 && <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}> × {op.qty}</span>}
                    </div>
                    {op.room && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{op.room}</div>
                    )}
                  </div>
                  {!showGBB && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                  )}
                </div>
              ))}
            </div>
            {!showGBB && (
              <div style={{ padding: '12px 18px', borderTop: '0.5px solid #E5E7EB', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 6 }}>
                  <span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 6 }}>
                    <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                    <span>−{fmtCAD(estimate.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                  <span>{taxLabel}</span><span>{fmtCAD(estimate.tax_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '0.5px solid #E5E7EB', paddingTop: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.02em' }}>{fmtCAD(estimate.total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GBB 3-card view */}
        {showGBB && (
          <div style={card}>
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E5E7EB' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>Your Options</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: goodSpecs.length ? 8 : 0 }}>Good</div>
                {goodSpecs.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>• {s}</div>)}
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginTop: 10 }}>{fmtCAD(estimate.total_good!)}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>inc. {taxLabel}</div>
              </div>
              <div style={{ border: '2px solid #2563EB', borderRadius: 10, padding: '14px 16px', background: '#F5F8FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: betterSpecs.length ? 8 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Better</div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: '#fff', borderRadius: 20, padding: '2px 8px' }}>Recommended</span>
                </div>
                {betterSpecs.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#2563EB', marginBottom: 3 }}>• {s}</div>)}
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginTop: 10 }}>{fmtCAD(estimate.total_better!)}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>inc. {taxLabel}</div>
              </div>
              <div style={{ border: '1.5px solid #D97706', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: bestSpecs.length ? 8 : 0 }}>Best</div>
                {bestSpecs.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#92400E', marginBottom: 3 }}>• {s}</div>)}
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginTop: 10 }}>{fmtCAD(estimate.total_best!)}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>inc. {taxLabel}</div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {estimate.scope_notes && (
          <div style={{ ...card, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
          </div>
        )}

        {/* Terms & Conditions */}
        {profile?.contract_terms && (
          <div style={{ ...card, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Terms &amp; Conditions</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile.contract_terms}</div>
          </div>
        )}

        {/* Download button */}
        <button
          className="download-btn"
          onClick={() => window.print()}
          style={{ width: '100%', padding: '15px 0', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: ff }}
        >
          Download PDF
        </button>

        {/* Footer */}
        <div className="powered-by" style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', paddingBottom: 8 }}>
          Powered by ApexScale · useapexscale.com
        </div>

      </div>
    </div>
  )
}
