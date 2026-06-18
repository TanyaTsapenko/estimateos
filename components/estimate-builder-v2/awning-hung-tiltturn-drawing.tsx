'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { shapeElements } from './shape-outline-drawing'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const CX = 100, MY = 115  // (Y1 + Y2) / 2

// ── Shared helpers ─────────────────────────────────────────────────

function DimLines({ wL, hL }: { wL: string; hL: string }) {
  return (
    <>
      <line x1="10" y1="226" x2="190" y2="226" stroke={SEC} strokeWidth="1"/>
      <line x1="10" y1="221" x2="10" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <line x1="190" y1="221" x2="190" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <text x="100" y="243" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1="10" x2="197" y2="220" stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1="10" x2="201" y2="10" stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1="220" x2="201" y2="220" stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y="119" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </>
  )
}

// ── Awning ─────────────────────────────────────────────────────────

export function AwningDrawing({ widthIn, heightIn }: {
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>

      {/* Hinge at top */}
      <line x1={X1 + 5} y1={Y1 + 5} x2={X2 - 5} y2={Y1 + 5} stroke={SEC} strokeWidth="1.5"/>
      {/* MOV diagonals from top corners to bottom center */}
      <line x1={X1 + 5} y1={Y1 + 5} x2={CX} y2={Y2 - 5} stroke={MOV} strokeWidth="1.2"/>
      <line x1={X2 - 5} y1={Y1 + 5} x2={CX} y2={Y2 - 5} stroke={MOV} strokeWidth="1.2"/>
      {/* Dashed arc from left bottom corner to right bottom corner */}
      <path d={`M${X1 + 5} ${Y2 - 5} Q${CX} ${Y2 - 25} ${X2 - 5} ${Y2 - 5}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      {/* Handle at bottom center */}
      <rect x={CX - 6} y={Y2 - 12} width="12" height="5" rx="1.5" fill={SEC}/>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Single Hung ─────────────────────────────────────────────────────

export function SingleHungDrawing({ shape, widthIn, heightIn, uid }: {
  shape?: string
  widthIn?: number
  heightIn?: number
  uid: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const s = (shape ?? '').trim()
  const clipId = `shu-${uid}`
  const [clipEl, fillEl] = shapeElements(s)

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <defs><clipPath id={clipId}>{clipEl}</clipPath></defs>
      {fillEl}

      <g clipPath={`url(#${clipId})`}>
        {/* Horizontal rail divider */}
        <line x1={X1 + 3} y1={MY} x2={X2 - 3} y2={MY} stroke={FRAME} strokeWidth="1.5"/>
        {/* Upper sash — fixed (dashed X) */}
        <line x1={X1 + 4} y1={Y1 + 4} x2={X2 - 4} y2={MY - 2} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
        <line x1={X2 - 4} y1={Y1 + 4} x2={X1 + 4} y2={MY - 2} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
        {/* Lower sash — slides up (MOV arrow + shaft) */}
        <path d={`M${CX} ${Y2 - 4} L${CX - 5} ${Y2 - 11} L${CX} ${Y2 - 8} L${CX + 5} ${Y2 - 11}Z`} fill={MOV}/>
        <line x1={CX} y1={Y2 - 8} x2={CX} y2={MY + 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
      </g>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Double Hung ─────────────────────────────────────────────────────

export function DoubleHungDrawing({ widthIn, heightIn }: {
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>

      {/* Horizontal rail divider */}
      <line x1={X1 + 3} y1={MY} x2={X2 - 3} y2={MY} stroke={FRAME} strokeWidth="1.5"/>
      {/* Upper sash — slides down */}
      <path d={`M${CX} ${Y1 + 4} L${CX - 5} ${Y1 + 11} L${CX} ${Y1 + 8} L${CX + 5} ${Y1 + 11}Z`} fill={MOV}/>
      <line x1={CX} y1={Y1 + 8} x2={CX} y2={MY - 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
      {/* Lower sash — slides up */}
      <path d={`M${CX} ${Y2 - 4} L${CX - 5} ${Y2 - 11} L${CX} ${Y2 - 8} L${CX + 5} ${Y2 - 11}Z`} fill={MOV}/>
      <line x1={CX} y1={Y2 - 8} x2={CX} y2={MY + 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Tilt & Turn ─────────────────────────────────────────────────────

function TiltTurnPanel({ x1, y1, x2, y2, hingeLeft }: {
  x1: number; y1: number; x2: number; y2: number; hingeLeft: boolean
}) {
  const my = (y1 + y2) / 2
  const mx = (x1 + x2) / 2

  if (hingeLeft) {
    return (
      <g>
        {/* Hinge on left */}
        <line x1={x1 + 3} y1={y1 + 3} x2={x1 + 3} y2={y2 - 3} stroke={SEC} strokeWidth="1.5"/>
        {/* Turn arc from bottom-left → top-right (casement-l sweep) */}
        <path d={`M${x1 + 3} ${y2 - 3} Q${x2 - 3} ${y2 - 3} ${x2 - 3} ${y1 + 3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        {/* Turn diagonal */}
        <line x1={x1 + 3} y1={y2 - 3} x2={x2 - 3} y2={y1 + 3} stroke={MOV} strokeWidth="1.2"/>
        {/* Tilt diagonals from top corners to bottom center */}
        <line x1={x1 + 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
        <line x1={x2 - 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
        {/* Handle on right */}
        <rect x={x2 - 8} y={my - 6} width="5" height="12" rx="1.5" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      {/* Hinge on right */}
      <line x1={x2 - 3} y1={y1 + 3} x2={x2 - 3} y2={y2 - 3} stroke={SEC} strokeWidth="1.5"/>
      {/* Turn arc from bottom-right → top-left (casement-r sweep) */}
      <path d={`M${x2 - 3} ${y2 - 3} Q${x1 + 3} ${y2 - 3} ${x1 + 3} ${y1 + 3}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      {/* Turn diagonal */}
      <line x1={x2 - 3} y1={y2 - 3} x2={x1 + 3} y2={y1 + 3} stroke={MOV} strokeWidth="1.2"/>
      {/* Tilt diagonals from top corners to bottom center */}
      <line x1={x1 + 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
      <line x1={x2 - 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
      {/* Handle on left */}
      <rect x={x1 + 3} y={my - 6} width="5" height="12" rx="1.5" fill={SEC}/>
    </g>
  )
}

export function TiltTurnDrawing({ sub, openDir, widthIn, heightIn }: {
  sub: string
  openDir?: string
  widthIn?: number
  heightIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const isDouble  = sub.toLowerCase().includes('double')
  const hingeLeft = (openDir ?? 'Right').toLowerCase() === 'left'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>

      {isDouble ? (
        <>
          <TiltTurnPanel x1={X1} y1={Y1} x2={CX} y2={Y2} hingeLeft={true}/>
          <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FRAME} strokeWidth="2"/>
          <TiltTurnPanel x1={CX} y1={Y1} x2={X2} y2={Y2} hingeLeft={false}/>
        </>
      ) : (
        <TiltTurnPanel x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={hingeLeft}/>
      )}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
