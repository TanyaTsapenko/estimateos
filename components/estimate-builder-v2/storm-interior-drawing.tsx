'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const CX = 100, MY = 115
const DOOR_FILL = '#C5CBD4'

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

// Swing arc for a single door panel (entry-style casement arc)
function SwingArc({ x1, y1, x2, y2, hingeLeft, color = MOV, dash }: {
  x1: number; y1: number; x2: number; y2: number
  hingeLeft: boolean; color?: string; dash?: string
}) {
  const my = (y1 + y2) / 2
  if (hingeLeft) return (
    <g>
      <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
      <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`}
        stroke={color} strokeWidth="1.2" strokeDasharray={dash ?? '4 2'} fill="none"/>
      <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={color} strokeWidth="1.2" strokeDasharray={dash}/>
      <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
    </g>
  )
  return (
    <g>
      <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
      <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`}
        stroke={color} strokeWidth="1.2" strokeDasharray={dash ?? '4 2'} fill="none"/>
      <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={color} strokeWidth="1.2" strokeDasharray={dash}/>
      <rect x={x1+4} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
    </g>
  )
}

// ── Storm Door ─────────────────────────────────────────────────────

export function StormDoorDrawing({ sub, hingeSide, widthIn, heightIn, uid }: {
  sub: string
  hingeSide?: string
  widthIn?: number
  heightIn?: number
  uid: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const sN = sub.toLowerCase().replace(/[\s]+/g, '')
  const hs = (hingeSide ?? '').toLowerCase()
  const reversible = hs.includes('reversible')
  const hingeLeft  = reversible ? true : !hs.includes('right')
  const patId = `scrn-${uid}`

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <defs>
        <pattern id={patId} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <line x1="0" y1="5" x2="5" y2="0" stroke={SEC} strokeWidth="0.8"/>
        </pattern>
      </defs>

      {/* Panel fill by subtype */}
      {sN === 'halfglass' ? (
        <>
          <rect x={X1} y={Y1}  width={X2-X1} height={MY-Y1} fill={GLASS}     stroke={FRAME} strokeWidth="2.5"/>
          <rect x={X1} y={MY}  width={X2-X1} height={Y2-MY} fill={DOOR_FILL} stroke={FRAME} strokeWidth="2.5"/>
          <line x1={X1} y1={MY} x2={X2} y2={MY} stroke={FRAME} strokeWidth="1.5"/>
        </>
      ) : sN === 'screen' ? (
        <>
          <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={GLASS}            stroke={FRAME} strokeWidth="2.5"/>
          <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={`url(#${patId})`} stroke="none"/>
        </>
      ) : (
        /* Full glass */
        <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
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

export function InteriorDoorDrawing({ sub, doorSwing, widthIn, heightIn }: {
  sub: string
  doorSwing?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const swing = (doorSwing ?? '').toLowerCase()
  const hingeLeft = !swing.includes('right')

  // ── Single ───────────────────────────────────────────────────────
  if (sub === 'Single') return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FRAME} strokeWidth="2.5"/>
      <SwingArc x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={hingeLeft}/>
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )

  // ── Double ───────────────────────────────────────────────────────
  if (sub === 'Double') return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FRAME} strokeWidth="2.5"/>
      <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FRAME} strokeWidth="1.5"/>
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
        style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

        {/* Wall/pocket indicator on the pocket side */}
        {slidesLeft
          ? <rect x={X1-8} y={Y1-6} width="10" height={Y2-Y1+12} rx="1" fill={SEC} opacity="0.35"/>
          : <rect x={X2-2} y={Y1-6} width="10" height={Y2-Y1+12} rx="1" fill={SEC} opacity="0.35"/>}

        {/* Door panel */}
        <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FRAME} strokeWidth="2.5"/>

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
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Two panels */}
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={DOOR_FILL} stroke={FRAME} strokeWidth="2.5"/>
      <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FRAME} strokeWidth="1.5"/>

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
