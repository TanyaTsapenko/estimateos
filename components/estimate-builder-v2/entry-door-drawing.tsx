'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'

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
    case 'Single + Left Sidelite':       return { segs: ['sidelite','door'],                  transom: false }
    case 'Single + Right Sidelite':      return { segs: ['door','sidelite'],                  transom: false }
    case 'Single + Double Sidelite':     return { segs: ['sidelite','door','sidelite'],        transom: false }
    case 'Single + Transom':             return { segs: ['door'],                              transom: true  }
    case 'Single + Sidelites + Transom': return { segs: ['sidelite','door','sidelite'],        transom: true  }
    case 'Double Door':                  return { segs: ['door','door'],                       transom: false }
    case 'Double Door + Sidelites':      return { segs: ['sidelite','door','door','sidelite'], transom: false }
    case 'Double Door + Transom':        return { segs: ['door','door'],                       transom: true  }
    default:                             return { segs: ['door'],                              transom: false }
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

// ── Door panel (active, shows swing) ──────────────────────────────

function DoorPanel({ x1, y1, x2, y2, hingeLeft, glassInsert }: {
  x1: number; y1: number; x2: number; y2: number; hingeLeft: boolean; glassInsert?: string
}) {
  const my = (y1 + y2) / 2
  const frac = liteFraction(glassInsert)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL
  const innerH = (y2 - y1) - 12
  const glassH = frac * innerH
  const glassY1 = y1 + 6

  if (hingeLeft) {
    return (
      <g>
        <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={panelFill} stroke={FRAME} strokeWidth="2.5"/>
        {frac > 0 && !fullGlass && (
          <rect x={x1+8} y={glassY1} width={x2-x1-16} height={glassH} fill={GLASS} stroke={FRAME} strokeWidth="1.2"/>
        )}
        <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={panelFill} stroke={FRAME} strokeWidth="2.5"/>
      {frac > 0 && !fullGlass && (
        <rect x={x1+8} y={glassY1} width={x2-x1-16} height={glassH} fill={GLASS} stroke={FRAME} strokeWidth="1.2"/>
      )}
      <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
      <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
      <rect x={x1+4} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
    </g>
  )
}

// ── Door panel (inactive — no swing arc) ──────────────────────────

function DoorPanelInactive({ x1, y1, x2, y2, handleLeft, glassInsert }: {
  x1: number; y1: number; x2: number; y2: number; handleLeft: boolean; glassInsert?: string
}) {
  const my = (y1 + y2) / 2
  const frac = liteFraction(glassInsert)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL
  const innerH = (y2 - y1) - 12
  const glassH = frac * innerH
  const glassY1 = y1 + 6
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={panelFill} stroke={FRAME} strokeWidth="2.5"/>
      {frac > 0 && !fullGlass && (
        <rect x={x1+8} y={glassY1} width={x2-x1-16} height={glassH} fill={GLASS} stroke={FRAME} strokeWidth="1.2"/>
      )}
      {handleLeft
        ? <rect x={x1+4}  y={my-10} width="6" height="20" rx="2" fill={SEC}/>
        : <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>}
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

export function EntryDoorDrawing({ sub, doorSwing, glassInsert, widthIn, heightIn }: {
  sub: string
  doorSwing?: string
  glassInsert?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const { segs, transom } = parseConfig(sub)

  const swing = (doorSwing ?? '').toLowerCase()
  const singleHingeLeft = !swing.includes('right')

  const doorCount     = segs.filter(s => s === 'door').length
  const sideliteCount = segs.filter(s => s === 'sidelite').length
  const doorW  = (X2 - X1 - sideliteCount * SIDELITE_W) / Math.max(doorCount, 1)
  const doorY1 = transom ? Y1 + TRANSOM_H : Y1
  const doorY2 = Y2

  let cx = X1
  let doorsSeen = 0
  const panels = segs.map((seg, i) => {
    const w = seg === 'sidelite' ? SIDELITE_W : doorW
    const px1 = cx, px2 = cx + w
    cx += w

    if (seg === 'sidelite') return <Sidelite key={i} x1={px1} y1={doorY1} x2={px2} y2={doorY2}/>

    // For double-door subtypes: left door hinges left, right door hinges right
    const hingeLeft = doorCount === 2 ? doorsSeen === 0 : singleHingeLeft
    doorsSeen++
    return <DoorPanel key={i} x1={px1} y1={doorY1} x2={px2} y2={doorY2} hingeLeft={hingeLeft} glassInsert={glassInsert}/>
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

export function DoubleEntryDrawing({ doubleDoorSwing, astragalType, glassInsert, widthIn, heightIn }: {
  doubleDoorSwing?: string
  astragalType?: string
  glassInsert?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const swing = (doubleDoorSwing ?? '').toLowerCase()
  const leftActive  = !swing.includes('right active')
  const halfW = (X2 - X1) / 2
  const cx = X1 + halfW
  const hasAstragal = astragalType && astragalType !== 'None'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Left panel */}
      {leftActive
        ? <DoorPanel         x1={X1} y1={Y1} x2={cx} y2={Y2} hingeLeft={true}  glassInsert={glassInsert}/>
        : <DoorPanelInactive x1={X1} y1={Y1} x2={cx} y2={Y2} handleLeft={false} glassInsert={glassInsert}/>}

      {/* Right panel */}
      {!leftActive
        ? <DoorPanel         x1={cx} y1={Y1} x2={X2} y2={Y2} hingeLeft={false} glassInsert={glassInsert}/>
        : <DoorPanelInactive x1={cx} y1={Y1} x2={X2} y2={Y2} handleLeft={true}  glassInsert={glassInsert}/>}

      {/* Astragal center line */}
      {hasAstragal && (
        <line x1={cx} y1={Y1+2} x2={cx} y2={Y2-2}
          stroke={SEC} strokeWidth={astragalType === 'Security Astragal' ? 3 : 2}/>
      )}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
