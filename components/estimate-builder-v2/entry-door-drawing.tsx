'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { DoorPanelLines } from '@/lib/v2/svgHelpers'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const SIDELITE_W = 30
const TRANSOM_H  = 36
const DOOR_FILL  = '#C5CBD4'

function liteFraction(g?: string): number {
  switch (g) {
    case '1/4 Lite': return 0.25
    case '1/2 Lite': return 0.50
    case '3/4 Lite': return 0.75
    case 'Full Lite': return 1.00
    default:         return 0
  }
}

type Seg = 'sidelite' | 'door'

function parseConfig(sub: string): { segs: Seg[]; transom: boolean } {
  switch (sub) {
    case 'Single + Left Sidelite':       return { segs: ['sidelite','door'],           transom: false }
    case 'Single + Right Sidelite':      return { segs: ['door','sidelite'],           transom: false }
    case 'Single + Double Sidelite':     return { segs: ['sidelite','door','sidelite'],transom: false }
    case 'Single + Transom':             return { segs: ['door'],                      transom: true  }
    case 'Single + Sidelites + Transom': return { segs: ['sidelite','door','sidelite'],transom: true  }
    default:                             return { segs: ['door'],                      transom: false }
  }
}

// ── Shared dim lines ───────────────────────────────────────────────

function DimLines({ wL, hL }: { wL: string; hL: string }) {
  const my = Math.round((Y1 + Y2) / 2)
  return (
    <>
      <line x1={X1} y1="227" x2={X2} y2="227" stroke={SEC} strokeWidth="1"/>
      <line x1={X1} y1="222" x2={X1} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <line x1={X2} y1="222" x2={X2} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <text x={(X1+X2)/2} y="244" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1={Y1} x2="197" y2={Y2} stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1={Y1} x2="201" y2={Y1} stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1={Y2} x2="201" y2={Y2} stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y={my+4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </>
  )
}

// ── Door slab helpers ─────────────────────────────────────────────

function doorSlabBase(x1: number, y1: number, x2: number, y2: number,
  panelFill: string, frac: number, fullGlass: boolean) {
  const innerH = (y2 - y1) - 12
  const glassH = frac * innerH
  const glassY1 = y1 + 6
  return (
    <>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={panelFill} stroke={FRAME} strokeWidth="2.5"/>
      {frac > 0 && !fullGlass && (
        <rect x={x1+8} y={glassY1} width={x2-x1-16} height={glassH} fill={GLASS} stroke={SEC} strokeWidth="1"/>
      )}
    </>
  )
}

export function doorHinges(x1: number, y1: number, x2: number, y2: number, hingeLeft: boolean) {
  const H  = y2 - y1
  const hy1 = y1 + Math.round(H * 0.20)
  const hy2 = y1 + Math.round(H * 0.67)
  const hx  = hingeLeft ? x1 + 2 : x2 - 7
  return (
    <>
      <rect x={hx} y={hy1} width="5" height="10" rx="1" fill={SEC}/>
      <rect x={hx} y={hy2} width="5" height="10" rx="1" fill={SEC}/>
    </>
  )
}

export function doorKnob(x1: number, y1: number, x2: number, y2: number, handleLeft: boolean) {
  const my = (y1 + y2) / 2
  if (handleLeft) return (
    <>
      <circle cx={x1+14} cy={my} r="4" fill={SEC}/>
      <rect x={x1+12} y={my-9} width="5" height="18" rx="2" fill={SEC}/>
    </>
  )
  return (
    <>
      <circle cx={x2-14} cy={my} r="4" fill={SEC}/>
      <rect x={x2-17} y={my-9} width="5" height="18" rx="2" fill={SEC}/>
    </>
  )
}

// ── Door panel (active, shows swing arc) ──────────────────────────

function DoorPanel({ x1, y1, x2, y2, hingeLeft, glassInsert, doorStyle }: {
  x1: number; y1: number; x2: number; y2: number; hingeLeft: boolean; glassInsert?: string; doorStyle?: string
}) {
  const frac = liteFraction(glassInsert)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL

  const arc = hingeLeft
    ? `M${x1+3} ${y2-3} Q${x1+3} ${y1+3} ${x2-3} ${y1+3}`
    : `M${x2-3} ${y2-3} Q${x2-3} ${y1+3} ${x1+3} ${y1+3}`

  return (
    <g>
      {doorSlabBase(x1, y1, x2, y2, panelFill, frac, fullGlass)}
      {!fullGlass && <DoorPanelLines x1={x1} y1={y1} x2={x2} y2={y2} doorStyle={doorStyle ?? 'Flush'}/>}
      {doorHinges(x1, y1, x2, y2, hingeLeft)}
      {doorKnob(x1, y1, x2, y2, !hingeLeft)}
      <path d={arc} stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
    </g>
  )
}

// ── Door panel (inactive — slab with hardware, no swing arc) ──────

function DoorPanelInactive({ x1, y1, x2, y2, handleLeft, glassInsert, doorStyle }: {
  x1: number; y1: number; x2: number; y2: number; handleLeft: boolean; glassInsert?: string; doorStyle?: string
}) {
  const frac = liteFraction(glassInsert)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL
  const hingeLeft = !handleLeft
  return (
    <g>
      {doorSlabBase(x1, y1, x2, y2, panelFill, frac, fullGlass)}
      {!fullGlass && <DoorPanelLines x1={x1} y1={y1} x2={x2} y2={y2} doorStyle={doorStyle ?? 'Flush'}/>}
      {doorHinges(x1, y1, x2, y2, hingeLeft)}
      {doorKnob(x1, y1, x2, y2, handleLeft)}
    </g>
  )
}

// ── Sidelite (fixed, no swing) ─────────────────────────────────────

function Sidelite({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={GLASS} stroke={FRAME} strokeWidth="2"/>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
      <line x1={x2-3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
    </g>
  )
}

// ── Entry Door ─────────────────────────────────────────────────────

export function EntryDoorDrawing({ sub, doorSwing, glassInsert, doorStyle, widthIn, heightIn }: {
  sub: string
  doorSwing?: string
  glassInsert?: string
  doorStyle?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const { segs, transom } = parseConfig(sub)

  const swing = (doorSwing ?? '').toLowerCase()
  const singleHingeLeft = !swing.includes('right')

  const sideliteCount = segs.filter(s => s === 'sidelite').length
  const doorW  = (X2 - X1 - sideliteCount * SIDELITE_W)
  const doorY1 = transom ? Y1 + TRANSOM_H : Y1
  const doorY2 = Y2

  let cx = X1
  const panels = segs.map((seg, i) => {
    const w = seg === 'sidelite' ? SIDELITE_W : doorW
    const px1 = cx, px2 = cx + w
    cx += w

    if (seg === 'sidelite') return <Sidelite key={i} x1={px1} y1={doorY1} x2={px2} y2={doorY2}/>
    return <DoorPanel key={i} x1={px1} y1={doorY1} x2={px2} y2={doorY2} hingeLeft={singleHingeLeft} glassInsert={glassInsert} doorStyle={doorStyle}/>
  })

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      {transom && (
        <Sidelite x1={X1} y1={Y1} x2={X2} y2={Y1 + TRANSOM_H}/>
      )}
      {panels}
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Double Entry Door ──────────────────────────────────────────────

export function DoubleEntryDrawing({ sub, doubleDoorSwing, astragalType, glassInsert, doorStyle, widthIn, heightIn }: {
  sub: string
  doubleDoorSwing?: string
  astragalType?: string
  glassInsert?: string
  doorStyle?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const swing = (doubleDoorSwing ?? '').toLowerCase()
  const leftActive   = !swing.includes('right active')
  const hasAstragal  = astragalType && astragalType !== 'None'
  const hasSidelites = sub.includes('Sidelites')
  const hasTransom   = sub.includes('Transom')

  const doorX1 = hasSidelites ? X1 + SIDELITE_W : X1
  const doorX2 = hasSidelites ? X2 - SIDELITE_W : X2
  const doorY1 = hasTransom   ? Y1 + TRANSOM_H  : Y1
  const cx     = (doorX1 + doorX2) / 2

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Transom */}
      {hasTransom && <Sidelite x1={X1} y1={Y1} x2={X2} y2={Y1 + TRANSOM_H}/>}

      {/* Sidelites */}
      {hasSidelites && <>
        <Sidelite x1={X1}          y1={doorY1} x2={X1 + SIDELITE_W} y2={Y2}/>
        <Sidelite x1={X2-SIDELITE_W} y1={doorY1} x2={X2}            y2={Y2}/>
      </>}

      {/* Left door panel */}
      {leftActive
        ? <DoorPanel         x1={doorX1} y1={doorY1} x2={cx} y2={Y2} hingeLeft={true}   glassInsert={glassInsert} doorStyle={doorStyle}/>
        : <DoorPanelInactive x1={doorX1} y1={doorY1} x2={cx} y2={Y2} handleLeft={false} glassInsert={glassInsert} doorStyle={doorStyle}/>}

      {/* Right door panel */}
      {!leftActive
        ? <DoorPanel         x1={cx} y1={doorY1} x2={doorX2} y2={Y2} hingeLeft={false}  glassInsert={glassInsert} doorStyle={doorStyle}/>
        : <DoorPanelInactive x1={cx} y1={doorY1} x2={doorX2} y2={Y2} handleLeft={true}  glassInsert={glassInsert} doorStyle={doorStyle}/>}

      {/* Astragal center line */}
      {hasAstragal && (
        <line x1={cx} y1={doorY1+2} x2={cx} y2={Y2-2}
          stroke={SEC} strokeWidth={astragalType === 'Security Astragal' ? 3 : 2}/>
      )}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
