'use client'
import { useState } from 'react'
import { C, getType, type Opening } from '@/lib/v2/openingTypes'
import { TAX_RATES } from '@/lib/pricing'
import { type ClientInfo } from './client-step'
import { MiniDiagram } from './diagram'
import { type TrimState } from './trim-section'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'
import { EBIcon } from './icons'
import { CasementDrawing, SliderDrawing, HopperDrawing } from './casement-slider-hopper-drawing'
import { AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing } from './awning-hung-tiltturn-drawing'
import { EntryDoorDrawing, DoubleEntryDrawing } from './entry-door-drawing'
import { FrenchDoorDrawing, GardenDoorDrawing } from './french-garden-drawing'
import { PatioDoorDrawing } from './patio-door-drawing'
import { StormDoorDrawing, InteriorDoorDrawing } from './storm-interior-drawing'
import { ShapeOutlineDrawing } from './shape-outline-drawing'
import { BayDrawing, BowDrawing } from './bay-bow-drawing'
import { CombinationDrawing } from './section-builder'

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.inkSoft, marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ── Drawing thumbnail ──────────────────────────────────────────────
function DrawingThumb({ op, compact }: { op: Opening; compact?: boolean }) {
  const v = op.vals
  const pf = (k: string) => v[k] !== undefined ? parseFloat(String(v[k])) || undefined : undefined
  const w = compact ? 32 : 44
  const maxH = compact ? 36 : 56

  let node: React.ReactNode
  switch (op.typeId) {
    case 'casement':
      node = <CasementDrawing sub={op.sub} shape={v.shape as string|undefined} activePanel={v.activePanel as string|undefined} widthIn={pf('width')} heightIn={pf('height')} uid={op.tempId} />; break
    case 'slider':
      node = <SliderDrawing sub={op.sub} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'endVent':
      node = <SliderDrawing sub={op.sub.toLowerCase().includes('double') ? 'doubleendvent' : 'endvent'} widthIn={pf('width')} heightIn={pf('height')} uid={op.tempId} />; break
    case 'hopper':
      node = <HopperDrawing openingAngle={v.openingAngle as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'awning':
      node = <AwningDrawing widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'singleHung':
      node = <SingleHungDrawing shape={v.shape as string|undefined} widthIn={pf('width')} heightIn={pf('height')} uid={op.tempId} />; break
    case 'doubleHung':
      node = <DoubleHungDrawing topSashOperable={v.topSashOperable as boolean|undefined} bottomSashOperable={v.bottomSashOperable as boolean|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'tiltTurn':
      node = <TiltTurnDrawing sub={op.sub} openDir={v.openDir as string|undefined} openMode={v.openMode as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'bay':
      node = <BayDrawing sub={op.sub} bayAngle={v.bayAngle as string|undefined} centerWindowType={v.centerWindowType as string|undefined} sideUnit={v.sideUnit as string|undefined} widthIn={pf('owidth')} heightIn={pf('oheight')} uid={op.tempId} />; break
    case 'bow':
      node = <BowDrawing sub={op.sub} panelType={v.panelType as string|undefined} sideUnit={v.sideUnit as string|undefined} widthIn={pf('owidth')} heightIn={pf('oheight')} uid={op.tempId} />; break
    case 'combination':
      node = <CombinationDrawing sections={op.sections || []} heightIn={pf('oheight')} />; break
    case 'picture':
    case 'transom':
    case 'special':
      node = <ShapeOutlineDrawing shape={op.typeId === 'special' ? op.sub : v.shape as string|undefined} transomPanes={op.typeId === 'transom' ? v.transomPanes as string|undefined : undefined} widthIn={pf('width')} heightIn={pf('height')} uid={op.tempId} />; break
    case 'entry':
      node = <EntryDoorDrawing sub={op.sub} doorSwing={v.doorSwing as string|undefined} glassInsert={v.glassInsert as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'doubleEntry':
      node = <DoubleEntryDrawing sub={op.sub} doubleDoorSwing={v.doubleDoorSwing as string|undefined} astragalType={v.astragalType as string|undefined} glassInsert={v.glassInsert as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'french':
      node = <FrenchDoorDrawing sub={op.sub} doorSwing={v.doorSwing as string|undefined} activePanel={v.activePanel as string|undefined} astragal={v.astragal as string|undefined} glassSize={v.glassSize as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'garden':
      node = <GardenDoorDrawing doorSwing={v.doorSwing as string|undefined} glassSize={v.glassSize as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'patio':
      node = <PatioDoorDrawing sub={op.sub} widthIn={pf('width')} heightIn={pf('height')} />; break
    case 'storm':
      node = <StormDoorDrawing sub={op.sub} hingeSide={v.hingeSide as string|undefined} widthIn={pf('width')} heightIn={pf('height')} uid={op.tempId} />; break
    case 'interior':
      node = <InteriorDoorDrawing sub={op.sub} doorSwing={v.doorSwing as string|undefined} glassInsert={v.glassInsert as string|undefined} widthIn={pf('width')} heightIn={pf('height')} />; break
  }
  return (
    <div style={{ width: w, height: maxH, flexShrink: 0, overflow: 'hidden', borderRadius: 7, background: C.bg, pointerEvents: 'none', alignSelf: 'flex-start' }}>
      {node ? (
        <div style={{ width: 215, height: 255, transformOrigin: 'top left', transform: `scale(${w / 215})` }}>
          {node}
        </div>
      ) : (
        <div style={{ width: w, height: maxH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MiniDiagram typeId={op.typeId} size={compact ? 20 : 28} color={C.blue} />
        </div>
      )}
    </div>
  )
}

// ── Opening spec lines ─────────────────────────────────────────────
function specLines(op: Opening): { base: string; opts: string[] } {
  const v = op.vals
  const bool = (k: string) => v[k] === true

  const material = [v.material, v.doorMaterial, v.stormDoorMaterial].find(m => m && m !== '') as string | undefined
  const pane     = v.pane as string | undefined
  const base = [material, pane].filter(Boolean).join(' · ')

  const opts: string[] = []

  const extColour = (v.extColour || v.doorExt) as string | undefined
  const intColour = (v.intColour || v.doorInt) as string | undefined
  const singleColour = v.colour as string | undefined
  if (singleColour) opts.push(singleColour)
  if (extColour) opts.push(`Ext: ${extColour}`)
  if (intColour && intColour !== extColour) opts.push(`Int: ${intColour}`)

  const glassType = v.glassType as string | undefined
  if (glassType && glassType !== 'Clear') opts.push(glassType)
  if (bool('lowE')) opts.push('Low-E')
  if (bool('argon')) opts.push('Argon')
  if (bool('tempered')) opts.push('Tempered')
  if (bool('laminatedGlass')) opts.push('Laminated')

  const grid = v.grid as string | undefined
  if (grid && grid !== 'None') opts.push(`${grid} grid`)
  const grilleType = v.grilleType as string | undefined
  if (grilleType && grilleType !== 'None') opts.push(`${grilleType} grille`)

  const install = v.install as string | undefined
  if (install && install !== 'Retrofit') opts.push(install)
  const floor = v.floor as string | undefined
  if (floor) opts.push(floor.toLowerCase().includes('floor') ? floor : `${floor} floor`)
  if (bool('egress')) opts.push('Egress')

  const screen = v.screen as string | undefined
  if (screen && screen !== 'None') opts.push(`${screen} screen`)
  if (bool('deadbolt')) opts.push('Deadbolt')
  if (bool('multipointLock')) opts.push('Multipoint lock')
  const petDoor = v.petDoor as string | undefined
  if (petDoor && petDoor !== 'None') opts.push(`Pet door ${petDoor}`)

  return { base, opts }
}

// ── Photo count ────────────────────────────────────────────────────
const PHOTO_KEYS = ['interiorPhotoUrl', 'exteriorPhotoUrl', 'photo3Url', 'photo4Url'] as const
function photoCount(op: Opening): number {
  return PHOTO_KEYS.filter(k => op.vals[k]).length
}

function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

export type SaveParams = {
  discountType: 'fixed' | 'percent'
  discountValue: number | null
  discountAmount: number
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
}

type Props = {
  clientInfo: ClientInfo
  openings: Opening[]
  prices: number[]
  trimCost?: number
  trimState?: TrimState
  scopeNotes?: string
  onEditOpenings: () => void
  onSave: (p: SaveParams) => void
  saving?: boolean
}

export function ReviewStep({ clientInfo, openings, prices, trimCost = 0, trimState, scopeNotes, onEditOpenings, onSave, saving = false }: Props) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')

  const [taxRate, taxLabel] = TAX_RATES[(clientInfo.province ?? '').toUpperCase()] ?? [0.05, 'GST (5%)']

  const isCollapsible = openings.length > 3
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(openings.length <= 3 ? openings.map((_, i) => i) : [])
  )
  const toggleExpand = (i: number) =>
    setExpanded(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  const subtotal = prices.reduce((s, p) => s + p, 0) + trimCost
  const discountAmt = discountValue
    ? discountType === 'percent'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const afterDiscount = subtotal - discountAmt
  const taxAmount = afterDiscount * taxRate
  const total = afterDiscount + taxAmount

  const handleSave = () => {
    onSave({
      discountType,
      discountValue: discountValue ? parseFloat(discountValue) : null,
      discountAmount: discountAmt,
      subtotal,
      taxRate,
      taxAmount,
      total,
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Client card ── */}
      <div>
        <SectionLabel>Client</SectionLabel>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 99, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {clientInfo.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{clientInfo.name}</div>
            {clientInfo.address && (
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>{clientInfo.address}</div>
            )}
            {(clientInfo.phone || clientInfo.email) && (
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
                {[clientInfo.phone, clientInfo.email].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── What's included ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionLabel>What&apos;s included ({openings.length})</SectionLabel>
          <button
            onClick={onEditOpenings}
            style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
          >
            Edit
          </button>
        </div>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
          {openings.map((op, i) => {
            const t = getType(op.typeId)
            const w = op.vals.width || op.vals.owidth
            const h = op.vals.height || op.vals.oheight
            const dimStr = w && h ? `${w}×${h}"` : ''
            const room = op.vals.room as string | undefined
            const qty = (op.vals.qty as number) || 1
            const unitPrice = prices[i] / qty
            const { base, opts } = specLines(op)
            const photos = photoCount(op)
            const isOpen = expanded.has(i)
            const borderBottom = i < openings.length - 1 ? `1px solid ${C.border}` : 'none'

            // Collapsed one-liner (only when collapsible and not open)
            if (isCollapsible && !isOpen) {
              return (
                <button
                  key={i}
                  onClick={() => toggleExpand(i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: borderBottom as string, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <DrawingThumb op={op} compact />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {qty > 1 ? `${qty}× ` : ''}{t.name}
                    {op.sub && <span style={{ fontWeight: 500, color: C.inkSoft }}> · {op.sub}</span>}
                    {dimStr && <span style={{ fontWeight: 500, color: C.inkSoft }}> · {dimStr}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, flexShrink: 0 }}>{money(prices[i])}</div>
                  <EBIcon name="chev-d" size={14} color={C.inkSoft} />
                </button>
              )
            }

            // Expanded row
            return (
              <div key={i} style={{ borderBottom }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
                  <DrawingThumb op={op} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                      {qty > 1 ? `${qty}× ` : ''}{t.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[op.sub, dimStr, room].filter(Boolean).join(' · ')}
                    </div>
                    {base && (
                      <div style={{ fontSize: 12, color: C.inkMid, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {base}
                      </div>
                    )}
                    {opts.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                        {opts.map((chip, idx) => (
                          <span key={idx} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99, background: '#EEF3FF', color: '#1D4ED8' }}>{chip}</span>
                        ))}
                      </div>
                    )}
                    {photos > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                        <CameraIcon />
                        <span style={{ fontSize: 11, color: C.inkSoft }}>{photos}/4 photos</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{money(prices[i])}</div>
                    {qty > 1 && (
                      <div style={{ fontSize: 11, color: C.inkSoft }}>{money(unitPrice)} ea</div>
                    )}
                    {isCollapsible && (
                      <button
                        onClick={() => toggleExpand(i)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                        aria-label="Collapse"
                      >
                        <EBIcon name="chev-u" size={14} color={C.inkSoft} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Estimate Notes ── */}
      {scopeNotes && scopeNotes.trim() && (
        <div>
          <SectionLabel>Estimate Notes</SectionLabel>
          <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '12px 14px' }}>
            <span style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{scopeNotes}</span>
          </div>
        </div>
      )}

      {/* ── Trim & Finishing ── */}
      {trimState && hasTrim({ trim_casing: trimState.casing, trim_casing_size: trimState.casingSize, trim_jamb: trimState.jamb, trim_jamb_extension_depth: trimState.jambExtensionDepth, trim_jamb_extension_depth_custom: trimState.jambExtensionDepthCustom, trim_brickmold: trimState.brickmold, trim_brickmold_colour_name: trimState.brickmoldColourName, trim_rosettes: trimState.rosettes, trim_caping: trimState.caping, trim_nail_fin: trimState.nailFin, trim_drip_cap: trimState.dripCap, trim_blue_skin: trimState.blueSkin }) && (
        <div>
          <SectionLabel>Trim &amp; Finishing</SectionLabel>
          <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trimSummaryLines({ trim_casing: trimState.casing, trim_casing_size: trimState.casingSize, trim_jamb: trimState.jamb, trim_jamb_extension_depth: trimState.jambExtensionDepth, trim_jamb_extension_depth_custom: trimState.jambExtensionDepthCustom, trim_brickmold: trimState.brickmold, trim_brickmold_colour_name: trimState.brickmoldColourName, trim_rosettes: trimState.rosettes, trim_caping: trimState.caping, trim_nail_fin: trimState.nailFin, trim_drip_cap: trimState.dripCap, trim_blue_skin: trimState.blueSkin }).map(line => (
              <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.inkMid }}>{line.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{line.value}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.inkFaint, borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 2 }}>
              Included — no extra charge
            </div>
          </div>
        </div>
      )}

      {/* ── Discount ── */}
      <div>
        <SectionLabel>Discount (optional)</SectionLabel>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '13px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 9, border: `1px solid ${C.borderStrong}`, overflow: 'hidden', flexShrink: 0 }}>
            <button
              onClick={() => setDiscountType('fixed')}
              style={{ width: 42, height: 40, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                background: discountType === 'fixed' ? C.blue : 'transparent',
                color: discountType === 'fixed' ? '#fff' : C.inkMid }}
            >$</button>
            <button
              onClick={() => setDiscountType('percent')}
              style={{ width: 42, height: 40, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                background: discountType === 'percent' ? C.blue : 'transparent',
                color: discountType === 'percent' ? '#fff' : C.inkMid }}
            >%</button>
          </div>
          <input
            type="number"
            min="0"
            placeholder={discountType === 'fixed' ? '0.00' : '0'}
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 15, fontWeight: 600, color: C.ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ── Summary ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '14px 14px 12px' }}>
        {trimCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.inkMid, fontWeight: 500 }}>Trim & Finishing</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(trimCost)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: C.inkMid, fontWeight: 500 }}>Subtotal</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(subtotal)}</span>
        </div>
        {discountAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: C.green, fontWeight: 500 }}>
              Discount{discountType === 'percent' && discountValue ? ` (${discountValue}%)` : ''}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums' }}>−{money(discountAmt)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, color: C.inkMid, fontWeight: 500 }}>{taxLabel}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(taxAmount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{money(total)}</span>
        </div>
      </div>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', height: 52, borderRadius: 13, border: 'none',
          background: saving ? C.borderStrong : C.blue,
          color: saving ? C.inkFaint : '#fff',
          fontSize: 15, fontWeight: 700,
          boxShadow: saving ? 'none' : '0 6px 20px rgba(59,108,255,0.35)',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', marginTop: 4, transition: 'background 0.15s' }}
      >
        {saving ? 'Saving…' : 'Save estimate →'}
      </button>
    </div>
  )
}
