'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { doorHinges, doorKnob } from './entry-door-drawing'
import { DoorPanelLines, glassColor } from '@/lib/v2/svgHelpers'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const CX = 100, MY = 115
const DOOR_FILL = '#C5CBD4'

function liteFraction(g?: string): number {
  switch (g) {
    case '1/4 Lite': return 0.25
    case '1/2 Lite': return 0.50
    case '3/4 Lite': return 0.75
    case 'Full Lite': return 1.00
    default:         return 0
  }
}

// ── Shared helpers ─────────────────────────────────────────────────

function DimLines({ wL, hL }: { wL: string; hL: string }) {
  return (
    <>
      <line x1={X1} y1="227" x2={X2} y2="227" stroke={SEC} strokeWidth="1"/>
      <line x1={X1} y1="222" x2={X1} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <line x1={X2} y1="222" x2={X2} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <text x={CX} y="244" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1={Y1} x2="197" y2={Y2} stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1={Y1} x2="201" y2={Y1} stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1={Y2} x2="201" y2={Y2} stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y={MY+4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </>
  )
}

// Door-style swing indicator: edge arc + hinge rects + knob
function SwingArc({ x1, y1, x2, y2, hingeLeft, color = MOV, dash }: {
  x1: number; y1: number; x2: number; y2: number
  hingeLeft: boolean; color?: string; dash?: string
}) {
  const arc = hingeLeft
    ? `M${x1+3} ${y2-3} Q${x1+3} ${y1+3} ${x2-3} ${y1+3}`
    : `M${x2-3} ${y2-3} Q${x2-3} ${y1+3} ${x1+3} ${y1+3}`
  return (
    <g>
      {doorHinges(x1, y1, x2, y2, hingeLeft)}
      {doorKnob(x1, y1, x2, y2, !hingeLeft)}
      <path d={arc} stroke={color} strokeWidth="1" strokeDasharray={dash ?? '5 3'} fill="none"/>
    </g>
  )
}

// ── Storm Door ─────────────────────────────────────────────────────

export function StormDoorDrawing({ sub, hingeSide, widthIn, heightIn, uid, glassType, frameColor }: {
  sub: string
  hingeSide?: string
  widthIn?: number
  heightIn?: number
  uid: string
  glassType?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const sN = sub.toLowerCase().replace(/[\s]+/g, '')
  const hs = (hingeSide ?? '').toLowerCase()
  const reversible = hs.includes('reversible')
  const hingeLeft  = reversible ? true : !hs.includes('right')
  const patId = `scrn-${uid}`

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      <defs>
        <pattern id={patId} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <line x1="0" y1="5" x2="5" y2="0" stroke={SEC} strokeWidth="0.8"/>
        </pattern>
      </defs>

      {/* Panel fill by subtype */}
      {sN === 'halfglass' ? (
        <>
          <rect x={X1} y={Y1}  width={X2-X1} height={MY-Y1} fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
          <rect x={X1} y={MY}  width={X2-X1} height={Y2-MY} fill={DOOR_FILL}             stroke={FR} strokeWidth="2.5"/>
          <line x1={X1} y1={MY} x2={X2} y2={MY} stroke={FR} strokeWidth="1.5"/>
        </>
      ) : sN === 'screen' ? (
        <>
          <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
          <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={`url(#${patId})`}      stroke="none"/>
        </>
      ) : (
        /* Full glass */
        <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
      )}

      {/* Swing arc(s) */}
      {reversible ? (
        <>
          <SwingArc x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={true}  color={SEC} dash="3 3"/>
          <SwingArc x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={false} color={SEC} dash="3 3"/>
        </>
      ) : (
        <SwingArc x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={hingeLeft}/>
      )}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Interior Door ──────────────────────────────────────────────────

export function InteriorDoorDrawing({ sub, doorSwing, glassInsert, doorStyle, widthIn, heightIn, frameColor }: {
  sub: string
  doorSwing?: string
  glassInsert?: string
  doorStyle?: string
  widthIn?: number
  heightIn?: number
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const swing = (doorSwing ?? '').toLowerCase()
  const hingeLeft = !swing.includes('right')

  const frac = liteFraction(glassInsert)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL
  const innerH = (Y2 - Y1) - 12
  const glassH = frac * innerH
  const glassY1 = Y1 + 6

  // ── Single ───────────────────────────────────────────────────────
  if (sub === 'Single') return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={panelFill} stroke={FR} strokeWidth="2.5"/>
      {frac > 0 && !fullGlass && (
        <rect x={X1+8} y={glassY1} width={X2-X1-16} height={glassH} fill={GLASS} stroke={FR} strokeWidth="1.2"/>
      )}
      {!fullGlass && <DoorPanelLines x1={X1} y1={Y1} x2={X2} y2={Y2} doorStyle={doorStyle ?? 'Flush'} frameColor={frameColor}/>}
      <SwingArc x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={hingeLeft}/>
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )

  // ── Double ───────────────────────────────────────────────────────
  if (sub === 'Double') return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={panelFill} stroke={FR} strokeWidth="2.5"/>
      {frac > 0 && !fullGlass && <>
        <rect x={X1+8}  y={glassY1} width={CX-X1-16} height={glassH} fill={GLASS} stroke={FR} strokeWidth="1.2"/>
        <rect x={CX+8}  y={glassY1} width={X2-CX-16} height={glassH} fill={GLASS} stroke={FR} strokeWidth="1.2"/>
      </>}
      {!fullGlass && <DoorPanelLines x1={X1} y1={Y1} x2={X2} y2={Y2} doorStyle={doorStyle ?? 'Flush'} frameColor={frameColor}/>}
      <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FR} strokeWidth="1.5"/>
      <SwingArc x1={X1} y1={Y1} x2={CX} y2={Y2} hingeLeft={true}/>
      <SwingArc x1={CX} y1={Y1} x2={X2} y2={Y2} hingeLeft={false}/>
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )

  // ── Pocket ───────────────────────────────────────────────────────
  if (sub === 'Pocket') {
    const slidesLeft = hingeLeft  // left doorSwing → slides left
    return (
      <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

        {/* Wall/pocket indicator on the pocket side */}
        {slidesLeft
          ? <rect x={X1-8} y={Y1-6} width="10" height={Y2-Y1+12} rx="1" fill={SEC} opacity="0.35"/>
          : <rect x={X2-2} y={Y1-6} width="10" height={Y2-Y1+12} rx="1" fill={SEC} opacity="0.35"/>}

        {/* Door panel */}
        <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FR} strokeWidth="2.5"/>

        {/* Handle — on the leading edge (side the door slides toward) */}
        <rect
          x={slidesLeft ? X1+4  : X2-10}
          y={MY-10} width="6" height="20" rx="2" fill={SEC}/>

        {/* Horizontal slide arrow */}
        <line
          x1={slidesLeft ? CX+10 : CX-10}
          y1={MY}
          x2={slidesLeft ? X1+18 : X2-18}
          y2={MY}
          stroke={MOV} strokeWidth="1" strokeDasharray="4 2"/>
        {slidesLeft
          ? <path d={`M${X1+18} ${MY-6} L${X1+10} ${MY} L${X1+18} ${MY+6} Z`} fill={MOV}/>
          : <path d={`M${X2-18} ${MY-6} L${X2-10} ${MY} L${X2-18} ${MY+6} Z`} fill={MOV}/>}

        <DimLines wL={wL} hL={hL}/>
      </svg>
    )
  }

  // ── Bifold ───────────────────────────────────────────────────────
  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      {/* Two panels */}
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FR} strokeWidth="2.5"/>
      <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FR} strokeWidth="1.5"/>

      {/* Fold indicators: diagonals from outer bottom corners to top center pivot */}
      <line x1={X1+5} y1={Y2-5} x2={CX}   y2={Y1+5} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2"/>
      <line x1={X2-5} y1={Y2-5} x2={CX}   y2={Y1+5} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2"/>

      {/* Pivot arc at top center */}
      <path d={`M${CX-18} ${Y1+5} Q${CX} ${Y1+20} ${CX+18} ${Y1+5}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2" fill="none"/>

      {/* Pivot point */}
      <circle cx={CX} cy={Y1+5} r="3" fill={SEC}/>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
