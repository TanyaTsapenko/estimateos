'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

const SANS = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif'
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", monospace'
const BG        = '#F5F6F8'
const BLUE      = '#2563EB'
const BLUE_SOFT = '#EEF3FF'
const BLUE_BDR  = '#BFDBFE'
const INK       = '#0F172A'
const INK_MID   = '#475467'
const INK_SOFT  = '#94A3B8'
const CARD: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 16, border: '0.5px solid #E5E7EB' }

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_address: string | null
  client_city: string | null; client_province: string | null; client_email: string | null; client_phone: string | null
  status: string; tier: string | null; subtotal: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  scope_notes: string | null; valid_until: string | null; created_at: string | null
  has_tiers: boolean | null
  total_good: number | null; total_better: number | null; total_best: number | null
  tax_rate: number | null; view_count: number | null
}
interface Opening {
  id: string; type: string; qty: number; total_cost: number; room: string | null
  install: string | null; shape: string | null; colour: string | null
  glass: string | null; frame: string | null; floor: string | null
}
interface Profile {
  company_name: string | null; address: string | null; city: string | null; province: string | null; postal_code: string | null
  phone: string | null; logo_url: string | null; contract_terms: string | null; pricing_mode: string | null
  deposit_percent: number | null
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

function SLabel({ children, blue }: { children: React.ReactNode; blue?: boolean }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: blue ? BLUE : INK_SOFT, marginBottom: 12 }}>
      {children}
    </div>
  )
}

function MRow({ label, value, mono, blue, last }: { label: string; value: string; mono?: boolean; blue?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 13, color: INK_SOFT }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: blue ? BLUE : INK, fontFamily: mono ? MONO : SANS }}>{value}</span>
    </div>
  )
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
      // Track view
      if (est.status !== 'signed' && est.status !== 'declined') {
        supabase.from('estimates').update({
          viewed_at: new Date().toISOString(),
          view_count: (est.view_count || 0) + 1,
        }).eq('id', id).then(() => {})
      }
      if (est.status === 'signed') setDocStatus('signed')
      else if (est.status === 'declined') setDocStatus('declined')
      else setDocStatus('active')

      const [{ data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimate_openings').select('id, type, qty, total_cost, room, install, shape, colour, glass, frame, floor').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, address, city, province, postal_code, phone, logo_url, contract_terms, pricing_mode, deposit_percent').eq('id', (est as any).user_id).single(),
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, fontFamily: SANS }}>
      <div style={{ fontSize: 13, color: INK_SOFT }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const showGBB    = !!(estimate.has_tiers && estimate.total_good && estimate.total_better && estimate.total_best)
  const goodSpecs   = aggregateSpecs(openings, priceListItems, 'tier_good')
  const betterSpecs = aggregateSpecs(openings, priceListItems, 'tier_better')
  const bestSpecs   = aggregateSpecs(openings, priceListItems, 'tier_best')
  const validUntil  = estimate.valid_until ? fmtDate(estimate.valid_until) : null
  const issuedDate  = estimate.created_at ? fmtDate(estimate.created_at.slice(0, 10)) : null
  const depositPct  = profile?.deposit_percent ?? 30
  const depositAmt  = Math.round(estimate.total * depositPct / 100)
  const balanceAmt  = estimate.total - depositAmt
  const hasClientDetails = !!(estimate.client_email || estimate.client_phone || estimate.client_address)

  const tiers: Array<{
    label: string; specs: string[]; price: number; border: string
    bg: string; lc: string; pc: string; badge?: string
  }> = [
    { label: 'Good',   specs: goodSpecs,   price: estimate.total_good!,   border: '1.5px solid #E5E7EB', bg: '#fff',    lc: INK_SOFT, pc: INK  },
    { label: 'Better', specs: betterSpecs, price: estimate.total_better!, border: `2px solid ${BLUE}`,   bg: BLUE_SOFT, lc: BLUE,     pc: BLUE, badge: 'Recommended' },
    { label: 'Best',   specs: bestSpecs,   price: estimate.total_best!,   border: '1.5px solid #D97706', bg: '#fff',    lc: '#D97706', pc: INK  },
  ]

  const statusPill = estimate.status === 'signed'
    ? <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(5,150,105,0.25)', border: '1px solid rgba(16,185,129,0.4)', color: '#6EE7B7' }}>✓ Signed</span>
    : <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: BLUE, color: '#fff' }}>Sent</span>

  const SHAPE_LABELS:   Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
  const COLOUR_LABELS:  Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
  const GLASS_LABELS:   Record<string, string> = { clear: 'Clear', lowe: 'Low-E', frosted: 'Frosted', tinted: 'Tinted', tempered: 'Tempered' }
  const FRAME_LABELS:   Record<string, string> = { none: 'Good condition', repair: 'Needs repair', rotted: 'Rotted frame' }
  const FLOOR_LABELS:   Record<string, string> = { first: 'Ground floor', second: '2nd floor', third: '3rd floor' }
  const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }

  return (
    <div style={{ minHeight: '100vh', fontFamily: SANS, background: BG }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @media print {
          .print-hide { display: none !important; }
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div id="estimate-content">

        {/* ── DARK HEADER ── */}
        <div style={{ background: 'linear-gradient(135deg, #080E1C 0%, #0E1F3D 50%, #0C2847 100%)', padding: '28px 24px 48px' }}>

          {/* Company name */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 24 }}>
            {profile?.company_name || ''}
          </div>

          {/* Kicker */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
            Prepared for
          </div>

          {/* Client name */}
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4 }}>
            {estimate.client_name || 'Client'}
          </div>

          {/* Address */}
          {estimate.client_address && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: -8, marginBottom: 10 }}>
              {estimate.client_address}
            </div>
          )}

          {/* Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: estimate.client_address ? 0 : 10 }}>
            {statusPill}
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: BLUE, color: '#fff', fontFamily: MONO }}>
              {estimate.estimate_number}
            </span>
            {validUntil && (
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.55)' }}>
                Valid until {validUntil}
              </span>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ background: BG, borderRadius: '24px 24px 0 0', marginTop: -24, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 110 }}>

          {/* 1 — Estimate meta */}
          <div style={CARD}>
            <SLabel>Estimate Details</SLabel>
            <MRow label="Estimate number" value={estimate.estimate_number} mono blue />
            {issuedDate && <MRow label="Date issued" value={issuedDate} />}
            {validUntil && <MRow label="Valid until" value={validUntil} />}
            {profile?.company_name && <MRow label="Prepared by" value={profile.company_name} last />}
          </div>

          {/* 2 — Total */}
          <div style={{ ...CARD, border: `1.5px solid ${BLUE_BDR}` }}>
            <SLabel>Estimate Total</SLabel>
            <div style={{ fontSize: 40, fontWeight: 800, color: BLUE, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {fmtCAD(estimate.total)}
            </div>
            <div style={{ fontSize: 12, color: INK_SOFT, marginTop: 6 }}>inc. {taxLabel}</div>
          </div>

          {/* 3 — Client details */}
          {hasClientDetails && (
            <div style={CARD}>
              <SLabel>Client Details</SLabel>
              {estimate.client_name    && <MRow label="Name"    value={estimate.client_name} />}
              {estimate.client_email   && <MRow label="Email"   value={estimate.client_email} />}
              {estimate.client_phone   && <MRow label="Phone"   value={estimate.client_phone} />}
              {estimate.client_address && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '9px 0' }}>
                  <span style={{ fontSize: 13, color: INK_SOFT, flexShrink: 0 }}>Address</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: INK, textAlign: 'right' }}>{estimate.client_address}</span>
                </div>
              )}
            </div>
          )}

          {/* 4 — Items */}
          {openings.length > 0 && (
            <div style={CARD}>
              <SLabel>Items ({openings.length})</SLabel>
              {openings.map((op, i) => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < openings.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>
                      {OPENING_TYPES[op.type]?.name || op.type}
                      {op.qty > 1 && <span style={{ fontSize: 13, color: INK_SOFT, fontWeight: 400 }}> × {op.qty}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {op.shape && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{SHAPE_LABELS[op.shape] || op.shape}</span>}
                      {op.colour && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{COLOUR_LABELS[op.colour] || op.colour}</span>}
                      {op.glass && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{GLASS_LABELS[op.glass] || op.glass}</span>}
                      {op.frame && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{FRAME_LABELS[op.frame] || op.frame}</span>}
                      {op.install && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{INSTALL_LABELS[op.install] || op.install}</span>}
                      {op.floor && <span style={{ background: '#F1F5F9', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#475569' }}>{FLOOR_LABELS[op.floor] || op.floor}</span>}
                      {op.room && <span style={{ background: '#EFF4FF', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#2563EB' }}>{op.room}</span>}
                    </div>
                  </div>
                  {!showGBB && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: INK, fontFamily: MONO, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                  )}
                </div>
              ))}

              {!showGBB && (
                <div style={{ borderTop: '1.5px solid #E5E7EB', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: INK_SOFT, marginBottom: 6 }}>
                    <span>Subtotal</span><span style={{ fontFamily: MONO }}>{fmtCAD(estimate.subtotal)}</span>
                  </div>
                  {estimate.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 6 }}>
                      <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                      <span style={{ fontFamily: MONO }}>−{fmtCAD(estimate.discount_amount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: INK_SOFT, marginBottom: 12 }}>
                    <span>{taxLabel}</span><span style={{ fontFamily: MONO }}>{fmtCAD(estimate.tax_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1.5px solid ${INK}`, paddingTop: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Total</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: BLUE, fontFamily: MONO }}>{fmtCAD(estimate.total)}</span>
                  </div>
                </div>
              )}

              {showGBB && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  {tiers.map(({ label, specs, price, border, bg, lc, pc, badge }) => (
                    <div key={label} style={{ border, borderRadius: 12, padding: '14px 16px', background: bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: specs.length ? 8 : 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: lc, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                        {badge && <span style={{ fontSize: 10, fontWeight: 700, background: BLUE, color: '#fff', borderRadius: 20, padding: '2px 8px' }}>{badge}</span>}
                      </div>
                      {specs.map((s, i) => <div key={i} style={{ fontSize: 12, color: lc, marginBottom: 3 }}>• {s}</div>)}
                      <div style={{ fontSize: 22, fontWeight: 800, color: pc, marginTop: 10, fontFamily: MONO }}>{fmtCAD(price)}</div>
                      <div style={{ fontSize: 11, color: INK_SOFT, marginTop: 2 }}>inc. {taxLabel}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5 — Payment schedule */}
          <div style={{ ...CARD, border: `1.5px solid ${BLUE_BDR}` }}>
            <SLabel blue>Payment Schedule</SLabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: INK_SOFT }}>Deposit on signing ({depositPct}%)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: MONO }}>{fmtCAD(depositAmt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
              <span style={{ fontSize: 13, color: INK_SOFT }}>Balance on completion</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: BLUE, fontFamily: MONO }}>{fmtCAD(balanceAmt)}</span>
            </div>
          </div>

          {/* 6 — Notes */}
          {estimate.scope_notes && (
            <div style={CARD}>
              <SLabel>Notes</SLabel>
              <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
            </div>
          )}

          {/* 7 — Terms */}
          {profile?.contract_terms && (
            <div style={CARD}>
              <SLabel>Terms &amp; Conditions</SLabel>
              <div style={{ fontSize: 12.5, color: INK_SOFT, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{profile.contract_terms}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 11, color: INK_SOFT, padding: '4px 0 8px' }}>
            Powered by ApexScale · useapexscale.com
          </div>

        </div>
      </div>

      {/* ── DOWNLOAD BUTTON ── */}
      <div className="print-hide" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px', background: `linear-gradient(to top, ${BG} 60%, transparent)` }}>
        <button
          onClick={() => window.location.href = `/api/estimate-pdf?id=${id}`}
          style={{ display: 'block', width: '100%', maxWidth: 480, margin: '0 auto', height: 54, borderRadius: 14, background: BLUE, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: SANS, boxShadow: '0 4px 20px rgba(37,99,235,0.28)' }}
        >
          Download PDF
        </button>
      </div>

    </div>
  )
}
