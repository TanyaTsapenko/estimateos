'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
// reads go through /api/public/estimate/[id] (service role, limited projection)
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { getColourLabel, getShapeLabel, getGlassLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { OpeningDrawing } from '@/components/estimate-builder-v2/opening-drawing'

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
  const validUntil  = estimate.valid_until ? fmtDate(estimate.valid_until) : null
  const issuedDate  = estimate.created_at ? fmtDate(estimate.created_at.slice(0, 10)) : null
  const depositPct  = profile?.deposit_percent ?? 30
  const depositAmt  = Math.round(estimate.total * depositPct) / 100
  const balanceAmt  = estimate.total - depositAmt
  const hasClientDetails = !!(estimate.client_email || estimate.client_phone || estimate.client_address)

  const statusPill = estimate.status === 'signed'
    ? <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(5,150,105,0.25)', border: '1px solid rgba(16,185,129,0.4)', color: '#6EE7B7' }}>✓ Signed</span>
    : <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: BLUE, color: '#fff' }}>Sent</span>

  const SHAPE_LABELS:   Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
  const COLOUR_LABELS:  Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
  const FRAME_LABELS:   Record<string, string> = { none: 'Good condition', repair: 'Needs repair', rotted: 'Rotted frame' }
  const FLOOR_LABELS:   Record<string, string> = { first: 'Ground floor', second: '2nd floor', third: '3rd floor' }
  const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
  const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }
  const GRID_LABELS: Record<string, string> = { none: 'No grid', colonial: 'Colonial grid', prairie: 'Prairie grid', diamond: 'Diamond grid', custom: 'Custom grid' }
  const DIRECTION_LABELS: Record<string, string> = { left: 'Opens left', right: 'Opens right', both: 'Opens both sides' }
  const GLASS_TYPE_LABELS: Record<string, string> = { full: 'Full glass', half: 'Half glass' }
  const CORE_LABELS: Record<string, string> = { hollow: 'Hollow core', solid: 'Solid core' }
  return (
    <div style={{ minHeight: '100vh', fontFamily: SANS, background: BG }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @media print {
          .print-hide { display: none !important; }
          @page { margin: 10mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .opening-diagram { width: 200px !important; padding: 16px !important; }
          .opening-diagram svg { width: 170px !important; height: 170px !important; }
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
                <div key={op.id} style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderBottom: '0.5px solid #E5E7EB' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>
                      {OPENING_TYPES[op.type]?.name || op.type}{(op as any).window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''} × {op.qty}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: MONO }}>{fmtCAD(op.total_cost)}</div>
                  </div>
                  {/* Body */}
                  <div style={{ display: 'flex' }}>
                    {/* Diagram */}
                    <div className="opening-diagram" style={{ width: 140, borderRight: '0.5px solid #F1F5F9', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flexShrink: 0 }}>
                      <OpeningDrawing op={op} />
                    </div>
                    {/* Specs */}
                    <div style={{ flex: 1, padding: '10px 12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px 12px', marginBottom: 8 }}>
                        {op.colour && op.colour !== 'white' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 70 }}>Ext. Colour</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{getColourLabel(op)}</span></div>}
                        {getInteriorColourLabel(op) && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 70 }}>Int. Colour</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{getInteriorColourLabel(op)}</span></div>}
                        {getGlassLabel(op) && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 70 }}>Glass</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{getGlassLabel(op)}</span></div>}
                        {op.install && op.install !== 'retrofit' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Install</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{INSTALL_LABELS[op.install] || op.install}</span></div>}
                        {op.frame && op.frame !== 'none' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Frame</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{FRAME_LABELS[op.frame] || op.frame}</span></div>}
                        {op.floor && op.floor !== 'first' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Floor</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{FLOOR_LABELS[op.floor] || op.floor}</span></div>}
                        {op.shape && op.shape !== 'rect' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Shape</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{getShapeLabel(op)}</span></div>}
                        {op.material && op.material !== 'vinyl' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Material</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{MATERIAL_LABELS[op.material] || op.material}</span></div>}
                        {op.brand && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Brand</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{op.brand}</span></div>}
                        {op.width_in && op.height_in && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: INK_SOFT, minWidth: 50 }}>Size</span><span style={{ fontSize: 11, fontWeight: 600, color: INK }}>{op.width_in}" × {op.height_in}"</span></div>}
                      </div>
                      {(() => {
                        const pills: React.ReactNode[] = []
                        if (op.has_screen) pills.push(<span key="screen" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>Screen ✓</span>)
                        if (op.tilt_clean) pills.push(<span key="tilt" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>Tilt-in ✓</span>)
                        if (op.opening_direction) pills.push(<span key="dir" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{DIRECTION_LABELS[op.opening_direction]}</span>)
                        if (op.panels_count) pills.push(<span key="panels" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{op.panels_count} panels</span>)
                        if (op.bay_angle) pills.push(<span key="angle" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{op.bay_angle}°</span>)
                        if (op.transom_panes) pills.push(<span key="tpanes" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{op.transom_panes} panes</span>)
                        if (op.sidelight_left) pills.push(<span key="sll" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>← SL {op.sidelight_left}"</span>)
                        if (op.sidelight_right) pills.push(<span key="slr" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>→ SL {op.sidelight_right}"</span>)
                        if (op.transom_above) pills.push(<span key="ta" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>Transom above</span>)
                        if (op.glass_type) pills.push(<span key="gt" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{GLASS_TYPE_LABELS[op.glass_type]}</span>)
                        if (op.core_type) pills.push(<span key="ct" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{CORE_LABELS[op.core_type]}</span>)
                        if (op.grid_pattern && op.grid_pattern !== 'none') pills.push(<span key="grid" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: BLUE, border: '0.5px solid #BFDBFE' }}>{GRID_LABELS[op.grid_pattern]}</span>)
                        if (op.room) pills.push(<span key="room" style={{ background: '#F0FDF4', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#16A34A', border: '0.5px solid #BBF7D0' }}>{op.room}</span>)
                        if (op.notes) pills.push(<span key="notes" style={{ background: '#FFF7ED', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#C2410C', border: '0.5px solid #FED7AA', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MessageSquare size={12}/>{op.notes}</span>)
                        if (pills.length === 0) return null
                        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '0.5px solid #F1F5F9', paddingTop: 8 }}>{pills}</div>
                      })()}
                    </div>
                  </div>
                </div>
              ))}

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
