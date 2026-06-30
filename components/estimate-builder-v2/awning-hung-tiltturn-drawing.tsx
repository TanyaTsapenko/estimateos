'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { shapeElements } from './shape-outline-drawing'
import { GridOverlay, glassColor, GlassPatternDefs, GlassEffects } from '@/lib/v2/svgHelpers'

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

// ── Awning pane indicator (hinge at top, opens downward) ───────────

function AwningPane({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const cx = (x1 + x2) / 2
  const arcOff = y2 - y1 > 150 ? 25 : 16
  return (
    <>
      <line x1={x1+5} y1={y1+5} x2={x2-5} y2={y1+5} stroke={SEC} strokeWidth="1.5"/>
      <line x1={x1+5} y1={y1+5} x2={cx} y2={y2-5} stroke={MOV} strokeWidth="1.2"/>
      <line x1={x2-5} y1={y1+5} x2={cx} y2={y2-5} stroke={MOV} strokeWidth="1.2"/>
      <path d={`M${x1+5} ${y2-5} Q${cx} ${y2-arcOff} ${x2-5} ${y2-5}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      <rect x={cx-6} y={y2-12} width="12" height="5" rx="1.5" fill={SEC}/>
    </>
  )
}

// ── Fixed pane indicator (dashed X) ───────────────────────────────

function FixedPane({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <>
      <line x1={x1+4} y1={y1+4} x2={x2-4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      <line x1={x2-4} y1={y1+4} x2={x1+4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
    </>
  )
}

// ── Awning ─────────────────────────────────────────────────────────

export function AwningDrawing({ sub, widthIn, heightIn, uid, grid, grilleType, glassType, screen, frameColor }: {
  sub?: string
  widthIn?: number
  heightIn?: number
  uid?: string
  grid?: string
  grilleType?: string
  glassType?: string
  screen?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const sN = (sub ?? '').toLowerCase().replace(/[^a-z]/g, '')
  const isDouble      = sN === 'doubleawning'
  const isAwningFixed = sN === 'awningfixed'
  const isFixedAwning = sN === 'fixedawning'
  const isMulti = isDouble || isAwningFixed || isFixedAwning

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>}
      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
      {uid && <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} screen={screen} uid={uid}/>}

      {isMulti ? (
        <>
          {/* Horizontal panel divider */}
          <line x1={X1+3} y1={MY} x2={X2-3} y2={MY} stroke={FR} strokeWidth="1.5"/>
          {/* Top panel */}
          {(isDouble || isAwningFixed)
            ? <AwningPane x1={X1} y1={Y1} x2={X2} y2={MY}/>
            : <FixedPane  x1={X1} y1={Y1} x2={X2} y2={MY}/>}
          {/* Bottom panel */}
          {(isDouble || isFixedAwning)
            ? <AwningPane x1={X1} y1={MY} x2={X2} y2={Y2}/>
            : <FixedPane  x1={X1} y1={MY} x2={X2} y2={Y2}/>}
        </>
      ) : (
        <AwningPane x1={X1} y1={Y1} x2={X2} y2={Y2}/>
      )}

      {uid && <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} grilleType={grilleType} uid={uid} frameColor={frameColor}/>}
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Single Hung ─────────────────────────────────────────────────────

export function SingleHungDrawing({ shape, widthIn, heightIn, uid, grid, grilleType, glassType, screen, frameColor }: {
  shape?: string
  widthIn?: number
  heightIn?: number
  uid: string
  grid?: string
  grilleType?: string
  glassType?: string
  screen?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const s = (shape ?? '').trim()
  const clipId = `shu-${uid}`
  const [clipEl, fillEl] = shapeElements(s, glassColor(glassType), FR)

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      <defs><clipPath id={clipId}>{clipEl}</clipPath></defs>
      <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>
      {fillEl}

      <g clipPath={`url(#${clipId})`}>
        <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} screen={screen} uid={uid}/>
        {/* Horizontal rail divider */}
        <line x1={X1 + 3} y1={MY} x2={X2 - 3} y2={MY} stroke={FR} strokeWidth="1.5"/>
        {/* Upper sash — fixed (dashed X) */}
        <line x1={X1 + 4} y1={Y1 + 4} x2={X2 - 4} y2={MY - 2} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
        <line x1={X2 - 4} y1={Y1 + 4} x2={X1 + 4} y2={MY - 2} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
        {/* Lower sash — slides up (MOV arrow + shaft) */}
        <path d={`M${CX} ${Y2 - 4} L${CX - 5} ${Y2 - 11} L${CX} ${Y2 - 8} L${CX + 5} ${Y2 - 11}Z`} fill={MOV}/>
        <line x1={CX} y1={Y2 - 8} x2={CX} y2={MY + 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
        <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} grilleType={grilleType} uid={uid} frameColor={frameColor}/>
      </g>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Double Hung ─────────────────────────────────────────────────────

function SashFixed({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
      <line x1={x2-3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
    </g>
  )
}

export function DoubleHungDrawing({ topSashOperable, bottomSashOperable, widthIn, heightIn, uid, grid, glassType, screen, frameColor }: {
  topSashOperable?: boolean
  bottomSashOperable?: boolean
  widthIn?: number
  heightIn?: number
  uid?: string
  grid?: string
  glassType?: string
  screen?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const topOp    = topSashOperable    !== false
  const bottomOp = bottomSashOperable !== false

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>}
      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
      {uid && <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} screen={screen} uid={uid}/>}

      {/* Horizontal rail divider */}
      <line x1={X1 + 3} y1={MY} x2={X2 - 3} y2={MY} stroke={FR} strokeWidth="1.5"/>
      {/* Upper sash */}
      {topOp ? (
        <>
          <path d={`M${CX} ${Y1 + 4} L${CX - 5} ${Y1 + 11} L${CX} ${Y1 + 8} L${CX + 5} ${Y1 + 11}Z`} fill={MOV}/>
          <line x1={CX} y1={Y1 + 8} x2={CX} y2={MY - 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
        </>
      ) : (
        <SashFixed x1={X1} y1={Y1} x2={X2} y2={MY}/>
      )}
      {/* Lower sash */}
      {bottomOp ? (
        <>
          <path d={`M${CX} ${Y2 - 4} L${CX - 5} ${Y2 - 11} L${CX} ${Y2 - 8} L${CX + 5} ${Y2 - 11}Z`} fill={MOV}/>
          <line x1={CX} y1={Y2 - 8} x2={CX} y2={MY + 4} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
        </>
      ) : (
        <SashFixed x1={X1} y1={MY} x2={X2} y2={Y2}/>
      )}
      {uid && <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} uid={uid} frameColor={frameColor}/>}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Tilt & Turn ─────────────────────────────────────────────────────

function TiltTurnPanel({ x1, y1, x2, y2, hingeLeft, openMode }: {
  x1: number; y1: number; x2: number; y2: number; hingeLeft: boolean; openMode?: string
}) {
  const my = (y1 + y2) / 2
  const mx = (x1 + x2) / 2
  const om = (openMode ?? 'Tilt & Turn').toLowerCase().replace(/\s/g, '')
  const showTilt = om !== 'turnonly'
  const showTurn = om !== 'tiltonly'

  if (hingeLeft) {
    return (
      <g>
        {showTurn && <>
          {/* Hinge on left */}
          <line x1={x1 + 3} y1={y1 + 3} x2={x1 + 3} y2={y2 - 3} stroke={SEC} strokeWidth="1.5"/>
          {/* Turn arc from bottom-left → top-right (casement-l sweep) */}
          <path d={`M${x1 + 3} ${y2 - 3} Q${x2 - 3} ${y2 - 3} ${x2 - 3} ${y1 + 3}`}
            stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
          {/* Turn diagonal */}
          <line x1={x1 + 3} y1={y2 - 3} x2={x2 - 3} y2={y1 + 3} stroke={MOV} strokeWidth="1.2"/>
        </>}
        {showTilt && <>
          {/* Tilt diagonals from top corners to bottom center */}
          <line x1={x1 + 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
          <line x1={x2 - 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
        </>}
        {/* Handle on right */}
        <rect x={x2 - 8} y={my - 6} width="5" height="12" rx="1.5" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      {showTurn && <>
        {/* Hinge on right */}
        <line x1={x2 - 3} y1={y1 + 3} x2={x2 - 3} y2={y2 - 3} stroke={SEC} strokeWidth="1.5"/>
        {/* Turn arc from bottom-right → top-left (casement-r sweep) */}
        <path d={`M${x2 - 3} ${y2 - 3} Q${x1 + 3} ${y2 - 3} ${x1 + 3} ${y1 + 3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        {/* Turn diagonal */}
        <line x1={x2 - 3} y1={y2 - 3} x2={x1 + 3} y2={y1 + 3} stroke={MOV} strokeWidth="1.2"/>
      </>}
      {showTilt && <>
        {/* Tilt diagonals from top corners to bottom center */}
        <line x1={x1 + 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
        <line x1={x2 - 4} y1={y1 + 4} x2={mx} y2={y2 - 4} stroke={MOV} strokeWidth="1.2"/>
      </>}
      {/* Handle on left */}
      <rect x={x1 + 3} y={my - 6} width="5" height="12" rx="1.5" fill={SEC}/>
    </g>
  )
}

export function TiltTurnDrawing({ sub, openDir, openMode, widthIn, heightIn, uid, grid, glassType, frameColor }: {
  sub: string
  openDir?: string
  openMode?: string
  widthIn?: number
  heightIn?: number
  uid?: string
  grid?: string
  glassType?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const isDouble  = sub.toLowerCase().includes('double')
  const hingeLeft = (openDir ?? 'Right').toLowerCase() === 'left'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', aspectRatio: '215/255', display: 'block' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType}/>}
      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={glassColor(glassType)} stroke={FR} strokeWidth="2.5"/>
      {uid && <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} uid={uid}/>}

      {isDouble ? (
        <>
          <TiltTurnPanel x1={X1} y1={Y1} x2={CX} y2={Y2} hingeLeft={true}  openMode={openMode}/>
          <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FR} strokeWidth="2"/>
          <TiltTurnPanel x1={CX} y1={Y1} x2={X2} y2={Y2} hingeLeft={false} openMode={openMode}/>
        </>
      ) : (
        <TiltTurnPanel x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={hingeLeft} openMode={openMode}/>
      )}
      {uid && <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} uid={uid} frameColor={frameColor}/>}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
