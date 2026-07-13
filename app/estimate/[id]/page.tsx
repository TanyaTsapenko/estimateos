'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
// reads go through /api/public/estimate/[id] (service role, limited projection)
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { V2_TYPE_LABELS } from '@/lib/v2/openingTypes'
import { OpeningDrawing } from '@/components/estimate-builder-v2/opening-drawing'

const SECTION_TYPE_MAP: Record<string, string> = {
  'Casement': 'casement', 'Fixed': 'picture', 'Picture': 'picture',
  'Slider': 'slider', 'Awning': 'awning', 'Single Hung': 'singleHung',
}
function parseSections(raw: any): { type: string; width: number }[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

const SANS    = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif'
const PAGE_BG = '#F5F6F8'
const NAVY    = '#0A1628'
const BLUE    = '#2563EB'
const BLUE_D  = '#1D4ED8'
const BLUE_BG = '#EEF3FF'
const GRAY_BG = '#F8FAFC'
const BORDER  = '#E2E8F0'
const MUTED   = '#64748B'
const FAINT   = '#94A3B8'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_address: string | null
  client_city: string | null; client_province: string | null; client_email: string | null; client_phone: string | null
  status: string; subtotal: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  scope_notes: string | null; valid_until: string | null; created_at: string | null
  tax_rate: number | null; view_count: number | null
}
interface Opening {
  id: string; type: string; qty: number; total_cost: number; room: string | null
  install: string | null; shape: string | null; colour: string | null
  glass: string | null; frame: string | null; floor: string | null
  width_in: number | null; height_in: number | null
  material: string | null; grid_pattern: string | null
  brand: string | null; notes: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  glass_type: string | null; core_type: string | null
  custom_shape_label: string | null; custom_colour_label: string | null
  colour_palette_id: string | null; colour_name: string | null
  interior_photo_url: string | null; exterior_photo_url: string | null
  photo_3_url: string | null; photo_4_url: string | null
  glass_kind: string | null; low_e: boolean | null; tempered: boolean | null
  interior_colour_palette_id: string | null; interior_colour_name: string | null; interior_colour: string | null
  window_subtype: string | null; sections?: { type: string; width: number }[] | null
}
interface Profile {
  company_name: string | null; address: string | null; city: string | null; province: string | null; postal: string | null
  phone: string | null; logo_url: string | null; contract_terms: string | null
  deposit_percent: number | null
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso + 'T00:00:00'))
}

function humanize(s?: string | null): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: BLUE, marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  )
}

function GrpHdr({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: FAINT, marginTop: 10, marginBottom: 4, borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 3 }}>
      {children}
    </div>
  )
}

function SR({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
      <span style={{ fontSize: 11, color: FAINT, width: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: NAVY }}>{value}</span>
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ borderRadius: 4, border: `0.5px solid ${BLUE}`, padding: '2px 7px', marginRight: 4, marginBottom: 4, display: 'inline-block', fontSize: 10, color: BLUE, fontWeight: 700 }}>
      {label}
    </span>
  )
}

export default function ClientEstimatePage() {
  const { id } = useParams<{ id: string }>()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [docStatus, setDocStatus] = useState<'loading' | 'signed' | 'declined' | 'active'>('loading')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/estimate/${id}`)
      if (!res.ok) return
      const { estimate: est, profile: prof, openings: ops } = await res.json()
      if (!est) return
      setEstimate(est)
      setOpenings(ops || [])
      setProfile(prof)
      if (est.status !== 'signed' && est.status !== 'declined') {
        fetch('/api/track-estimate-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateId: id }),
        }).catch(() => {})
      }
      if (est.status === 'signed') setDocStatus('signed')
      else if (est.status === 'declined') setDocStatus('declined')
      else setDocStatus('active')
    }
    load()
  }, [id])

  useEffect(() => {
    if (estimate) {
      document.title = `${estimate.estimate_number} — ${estimate.client_name || ''}`
    }
  }, [estimate])

  if (docStatus === 'loading' || !estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: PAGE_BG, fontFamily: SANS }}>
      <div style={{ fontSize: 13, color: MUTED }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: PAGE_BG, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: PAGE_BG, fontFamily: SANS, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const validUntil = estimate.valid_until ? fmtDate(estimate.valid_until) : null
  const issuedDate = estimate.created_at ? fmtDate(estimate.created_at.slice(0, 10)) : null
  const depositPct = profile?.deposit_percent ?? 0
  const depositAmt = estimate.total * (depositPct / 100)
  const balanceAmt = estimate.total - depositAmt
  const projectSite = [estimate.client_address, estimate.client_city, estimate.client_province].filter(Boolean).join(', ')

  return (
    <div style={{ minHeight: '100vh', fontFamily: SANS, background: PAGE_BG, paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .est-paper { max-width: 720px; margin: 0 auto; background: #fff; box-shadow: 0 1px 6px rgba(10,22,40,0.09); }
        .est-meta-row { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 18px; }
        @media (min-width: 520px) { .est-meta-row { grid-template-columns: 1fr 1fr 1fr; } }
        .est-card-body { display: flex; flex-direction: column; }
        @media (min-width: 520px) { .est-card-body { flex-direction: row; } }
        .est-drawing-col { width: 100%; border-bottom: 0.5px solid ${BORDER}; background: ${GRAY_BG}; display: flex; align-items: center; justify-content: center; padding: 16px; flex-shrink: 0; }
        @media (min-width: 520px) { .est-drawing-col { width: 200px; border-bottom: none; border-right: 0.5px solid ${BORDER}; padding: 12px; } }
        .est-bottom-half { display: flex; flex-direction: column; gap: 16px; margin-top: 14px; }
        @media (min-width: 520px) { .est-bottom-half { flex-direction: row; align-items: flex-start; } }
        @media print {
          .print-hide { display: none !important; }
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="est-paper">

        {/* ── HEADER ── */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `2px solid ${BLUE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt="" style={{ height: 38, objectFit: 'contain', display: 'block', marginBottom: 6 }} />
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{profile?.company_name || ''}</div>
            {profile?.phone && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{profile.phone}</div>}
            {profile?.address && (
              <div style={{ fontSize: 11, color: MUTED }}>
                {[profile.address, profile.city, profile.province, profile.postal].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ display: 'inline-block', background: BLUE, borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.14em', marginBottom: 8 }}>
              ESTIMATE
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{estimate.estimate_number}</div>
            {issuedDate  && <div style={{ fontSize: 11, color: MUTED }}>Date: {issuedDate}</div>}
            {validUntil  && <div style={{ fontSize: 11, color: MUTED }}>Valid until: {validUntil}</div>}
          </div>
        </div>

        <div style={{ padding: '20px 28px 32px' }}>

          {/* ── META ROW ── */}
          <div className="est-meta-row">
            <div style={{ background: GRAY_BG, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginBottom: 5 }}>Prepared for</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 2 }}>{estimate.client_name}</div>
              {estimate.client_address && (
                <div style={{ fontSize: 11, color: MUTED }}>
                  {[estimate.client_address, estimate.client_city, estimate.client_province].filter(Boolean).join(', ')}
                </div>
              )}
              {estimate.client_phone && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_phone}</div>}
              {estimate.client_email && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_email}</div>}
            </div>
            <div style={{ background: GRAY_BG, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginBottom: 5 }}>Project site</div>
              {projectSite
                ? <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{projectSite}</div>
                : <div style={{ fontSize: 11, color: MUTED }}>Same as above</div>}
            </div>
            <div style={{ background: GRAY_BG, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginBottom: 5 }}>Summary</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 2 }}>
                {openings.length} opening{openings.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>Total incl. tax: {fmtCAD(estimate.total)}</div>
              {depositPct > 0 && (
                <div style={{ fontSize: 11, color: MUTED }}>Deposit ({depositPct}%): {fmtCAD(depositAmt)}</div>
              )}
            </div>
          </div>

          {/* ── SCOPE OF WORK ── */}
          {openings.length > 0 && (
            <>
              <SecLabel>Scope of work</SecLabel>
              {openings.map((op, i) => {
                const typeName = V2_TYPE_LABELS[op.type] || OPENING_TYPES[op.type]?.name || humanize(op.type)
                const subLabel = getSubtypeLabel(op as any)
                const title    = [op.qty > 1 ? `${op.qty}×` : null, typeName, subLabel ? `(${subLabel})` : null].filter(Boolean).join(' ')
                const extColour = getColourLabel(op as any)
                const intColour = getInteriorColourLabel(op as any)
                const gridVal   = op.grid_pattern && op.grid_pattern !== 'none' ? humanize(op.grid_pattern) : null
                const floorVal  = op.floor && op.floor !== 'first' ? humanize(op.floor) : null
                const hasLocation = !!(op.room || floorVal)

                const glassChips: string[] = []
                if (op.glass_kind && op.glass_kind !== 'clear') glassChips.push(humanize(op.glass_kind))
                if (op.low_e)    glassChips.push('Low-E')
                if (op.tempered) glassChips.push('Tempered')

                const isCombo = op.type === 'combination' || op.type === 'window_combo'
                const comboSecs = isCombo ? parseSections(op.sections) : []

                return (
                  <div key={op.id} style={{ border: `0.5px solid ${BORDER}`, borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: GRAY_BG, padding: '8px 12px', borderBottom: `0.5px solid ${BORDER}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: FAINT, width: 22, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, flex: 1 }}>{title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, flexShrink: 0 }}>{fmtCAD(op.total_cost || 0)}</span>
                    </div>
                    {isCombo ? (
                      <>
                        <div style={{ background: GRAY_BG, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                          <div style={{ maxWidth: 340, width: '100%' }}>
                            <OpeningDrawing op={{ ...op, colour: null }} hideComboLabels />
                          </div>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
                            Qty {op.qty}{op.width_in && op.height_in ? ` · ${op.width_in}" × ${op.height_in}"` : ''}{comboSecs.length > 0 ? ` · ${comboSecs.length} sections` : ''}
                          </div>
                          {comboSecs.length > 0 && (
                            <>
                              <GrpHdr>Sections</GrpHdr>
                              {comboSecs.map((sec, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: idx < comboSecs.length - 1 ? `0.5px solid ${BORDER}` : 'none' }}>
                                  <span style={{ fontSize: 10, color: FAINT, width: 18, textAlign: 'right' as const, flexShrink: 0 }}>{idx + 1}.</span>
                                  <div style={{ width: 34, flexShrink: 0, pointerEvents: 'none' as const }}>
                                    <OpeningDrawing op={{ id: `${op.id}-s${idx}`, type: SECTION_TYPE_MAP[sec.type] ?? 'picture' }} />
                                  </div>
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{sec.type}</span>
                                    <span style={{ fontSize: 11, color: MUTED }}> · {sec.width}"</span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                          {hasLocation && (
                            <>
                              <GrpHdr>Location</GrpHdr>
                              <SR label="Room"  value={op.room} />
                              <SR label="Floor" value={floorVal} />
                            </>
                          )}
                          <GrpHdr>Product</GrpHdr>
                          {op.width_in && op.height_in && <SR label="Size" value={`${op.width_in}" × ${op.height_in}"`} />}
                          <SR label="Material"     value={humanize(op.material)} />
                          <SR label="Ext. colour"  value={extColour || undefined} />
                          <SR label="Int. colour"  value={intColour || undefined} />
                          <SR label="Grid"         value={gridVal || undefined} />
                          <SR label="Installation" value={humanize(op.install)} />
                          {glassChips.length > 0 && (
                            <>
                              <GrpHdr>Glass</GrpHdr>
                              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 2 }}>
                                {glassChips.map(c => <Chip key={c} label={c} />)}
                              </div>
                            </>
                          )}
                          {!!op.notes && (
                            <>
                              <GrpHdr>Notes</GrpHdr>
                              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, fontStyle: 'italic' }}>{op.notes}</div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="est-card-body">
                        <div className="est-drawing-col">
                          <OpeningDrawing op={{ ...op, colour: null }} />
                        </div>
                        <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                          {hasLocation && (
                            <>
                              <GrpHdr>Location</GrpHdr>
                              <SR label="Room"  value={op.room} />
                              <SR label="Floor" value={floorVal} />
                            </>
                          )}
                          <GrpHdr>Product</GrpHdr>
                          {op.width_in && op.height_in && <SR label="Size" value={`${op.width_in}" × ${op.height_in}"`} />}
                          <SR label="Material"     value={humanize(op.material)} />
                          <SR label="Ext. colour"  value={extColour || undefined} />
                          <SR label="Int. colour"  value={intColour || undefined} />
                          <SR label="Grid"         value={gridVal || undefined} />
                          <SR label="Installation" value={humanize(op.install)} />
                          {glassChips.length > 0 && (
                            <>
                              <GrpHdr>Glass</GrpHdr>
                              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 2 }}>
                                {glassChips.map(c => <Chip key={c} label={c} />)}
                              </div>
                            </>
                          )}
                          {!!op.notes && (
                            <>
                              <GrpHdr>Notes</GrpHdr>
                              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, fontStyle: 'italic' }}>{op.notes}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* ── PRICING + NOTES ── */}
          <div className="est-bottom-half">
            {!!estimate.scope_notes && (
              <div style={{ flex: 3, minWidth: 0 }}>
                <SecLabel>Notes</SecLabel>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
              </div>
            )}
            <div style={{ flex: 2, minWidth: 220, marginLeft: !estimate.scope_notes ? 'auto' : undefined }}>
              <SecLabel>Pricing</SecLabel>
              <div style={{ borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 5, marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: MUTED }}>Subtotal</span>
                <span style={{ fontSize: 12, color: NAVY }}>{fmtCAD(estimate.subtotal || 0)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 5, marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: MUTED }}>
                    Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}
                  </span>
                  <span style={{ fontSize: 12, color: NAVY }}>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              <div style={{ borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 5, marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: MUTED }}>{taxLabel} ({((estimate.tax_rate || 0) * 100).toFixed(0)}%)</span>
                <span style={{ fontSize: 12, color: NAVY }}>{fmtCAD(estimate.tax_amount || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: BLUE }}>{fmtCAD(estimate.total || 0)}</span>
              </div>
              {depositPct > 0 && (
                <div style={{ background: BLUE_BG, borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 11, color: BLUE_D, marginBottom: 3 }}>Deposit on signing ({depositPct}%)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BLUE_D }}>{fmtCAD(depositAmt)}</div>
                  <div style={{ fontSize: 10, color: BLUE_D, marginTop: 3 }}>Balance on completion: {fmtCAD(balanceAmt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── VALIDITY ── */}
          {validUntil && (
            <div style={{ background: GRAY_BG, borderRadius: 6, padding: 12, marginTop: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginBottom: 5 }}>Validity</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                This estimate is valid until {validUntil}. Pricing is subject to change after this date.
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 11, color: FAINT, paddingTop: 20, marginTop: 20, borderTop: `0.5px solid ${BORDER}` }}>
            {[profile?.company_name, estimate.estimate_number].filter(Boolean).join(' · ')} · Powered by ApexScale
          </div>

        </div>
      </div>

      {/* ── DOWNLOAD BUTTON ── */}
      <div className="print-hide" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px', background: `linear-gradient(to top, ${PAGE_BG} 60%, transparent)` }}>
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
