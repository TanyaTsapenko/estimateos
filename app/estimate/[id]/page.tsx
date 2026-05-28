'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_province: string | null
  status: string; tier: string | null; subtotal: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  scope_notes: string | null; valid_until: string | null
  has_tiers: boolean | null
  total_good: number | null; total_better: number | null; total_best: number | null
  tax_rate: number | null
}
interface Opening { id: string; type: string; qty: number; total_cost: number; room: string | null }
interface Profile {
  company_name: string | null; city: string | null; province: string | null
  logo_url: string | null; contract_terms: string | null; pricing_mode: string | null
}
interface TierData {
  display_name: string; specs: string[]; pricing_type: string; price: number
}
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
        supabase.from('profiles').select('company_name, city, province, logo_url, contract_terms, pricing_mode').eq('id', (est as any).user_id).single(),
      ])
      setOpenings(ops || [])
      setProfile(prof)

      if (est.has_tiers) {
        const { data: pl } = await supabase
          .from('price_lists')
          .select('opening_type, is_tiered, tier_good, tier_better, tier_best')
          .eq('user_id', (est as any).user_id)
          .eq('is_tiered', true)
        setPriceListItems((pl || []) as PriceListItem[])
      }
    }
    load()
  }, [id])

  const fontFamily = '"Inter", system-ui, -apple-system, sans-serif'

  if (docStatus === 'loading' || !estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily }}>
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const tierLabel = estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : null
  const hasNotes = !!estimate.scope_notes
  const hasTerms = !!profile?.contract_terms
  const showGBB = !!(estimate.has_tiers && estimate.total_good && estimate.total_better && estimate.total_best)

  const goodSpecs   = aggregateSpecs(openings, priceListItems, 'tier_good')
  const betterSpecs = aggregateSpecs(openings, priceListItems, 'tier_better')
  const bestSpecs   = aggregateSpecs(openings, priceListItems, 'tier_best')

  return (
    <div style={{ background: '#F5F6F8', minHeight: '100vh', fontFamily }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {/* Company info */}
          <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #EEF0F4' }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={profile.company_name || ''} style={{ height: 40, maxWidth: 160, objectFit: 'contain', marginBottom: 12, display: 'block' }} />
            )}
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628' }}>{profile?.company_name || 'Contractor'}</div>
            {(profile?.city || profile?.province) && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                {[profile?.city, profile?.province].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Estimate number + client */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEF0F4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>Estimate</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>{estimate.estimate_number}</div>
              {estimate.client_name && (
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginTop: 6 }}>{estimate.client_name}</div>
              )}
              {!showGBB && tierLabel && profile?.pricing_mode === 'gbb' && (
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{tierLabel} Package</div>
              )}
            </div>
            {estimate.valid_until && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 3 }}>Valid until</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{estimate.valid_until}</div>
              </div>
            )}
          </div>

          {/* Line items */}
          {openings.length > 0 && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12 }}>
                Items ({openings.length})
              </div>
              {openings.map((op, idx) => (
                <div key={op.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '10px 0', borderBottom: idx < openings.length - 1 ? '1px solid #EEF0F4' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>
                      {OPENING_TYPES[op.type]?.name || op.type}
                      {op.qty > 1 && <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}> × {op.qty}</span>}
                    </div>
                    {op.room && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{op.room}</div>
                    )}
                  </div>
                  {!showGBB && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', flexShrink: 0 }}>
                      {fmtCAD(op.total_cost)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* GBB 3-card view */}
          {showGBB && (
            <div style={{ padding: '20px 24px', borderBottom: hasNotes || hasTerms ? '1px solid #EEF0F4' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 14 }}>
                Your Options
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Good */}
                <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: goodSpecs.length ? 8 : 0 }}>Good</div>
                  {goodSpecs.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>• {s}</div>
                  ))}
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginTop: 10 }}>{fmtCAD(estimate.total_good!)}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>incl. {taxLabel}</div>
                </div>

                {/* Better — recommended */}
                <div style={{ border: '2px solid #3B6CFF', borderRadius: 12, padding: '14px 16px', background: '#F5F8FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: betterSpecs.length ? 8 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3B6CFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Better</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#3B6CFF', color: '#fff', borderRadius: 20, padding: '2px 8px' }}>Recommended</span>
                  </div>
                  {betterSpecs.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#3B6CFF', marginBottom: 3 }}>• {s}</div>
                  ))}
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#3B6CFF', marginTop: 10 }}>{fmtCAD(estimate.total_better!)}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>incl. {taxLabel}</div>
                </div>

                {/* Best */}
                <div style={{ border: '1.5px solid #D97706', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: bestSpecs.length ? 8 : 0 }}>Best</div>
                  {bestSpecs.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#92400E', marginBottom: 3 }}>• {s}</div>
                  ))}
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginTop: 10 }}>{fmtCAD(estimate.total_best!)}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>incl. {taxLabel}</div>
                </div>
              </div>
            </div>
          )}

          {/* Standard totals — only when not GBB */}
          {!showGBB && (
            <div style={{ padding: '16px 24px', borderBottom: hasNotes || hasTerms ? '1px solid #EEF0F4' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                <span>Subtotal</span>
                <span>{fmtCAD(estimate.subtotal)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                  <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                  <span>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                <span>{taxLabel}</span>
                <span>{fmtCAD(estimate.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #EEF0F4', paddingTop: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', letterSpacing: '-.02em' }}>{fmtCAD(estimate.total)}</span>
              </div>
            </div>
          )}

          {/* Scope notes */}
          {hasNotes && (
            <div style={{ padding: '16px 24px', borderBottom: hasTerms ? '1px solid #EEF0F4' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
            </div>
          )}

          {/* Terms & Conditions */}
          {hasTerms && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Terms &amp; Conditions</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile!.contract_terms}</div>
            </div>
          )}

        </div>

        <a
          href={`/api/pdf?id=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 16, padding: '14px 0', background: '#fff', color: '#2045B8', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </a>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#94A3B8' }}>
          Powered by ApexScale
        </div>
      </div>
    </div>
  )
}
