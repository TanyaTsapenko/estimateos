'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { shapeElements } from './shape-outline-drawing'
import { GridOverlay, glassColor, GlassPatternDefs, GlassEffects } from '@/lib/v2/svgHelpers'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const CX = 100

// ── Shared helpers ────────────────────────────────────────────────

function DashedX({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1+4} y1={y1+4} x2={x2-4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      <line x1={x2-4} y1={y1+4} x2={x1+4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
    </g>
  )
}

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

// ── Casement ──────────────────────────────────────────────────────

function CasementHandleOnly({ x1, y1, x2, y2, side }: {
  x1: number; y1: number; x2: number; y2: number; side: 'left' | 'right'
}) {
  const my = (y1 + y2) / 2
  return side === 'left'
    ? <rect x={x2-8} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
    : <rect x={x1+3} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
}

function CasementHinge({ x1, y1, x2, y2, side }: {
  x1: number; y1: number; x2: number; y2: number; side: 'left' | 'right'
}) {
  const my = (y1 + y2) / 2
  if (side === 'left') {
    return (
      <g>
        <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <rect x={x2-8} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
      <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
      <rect x={x1+3} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
    </g>
  )
}

export function CasementDrawing({ shape, sub, activePanel, widthIn, heightIn, uid, grid, grilleType, glassType, screen }: {
  shape?: string
  sub: string
  activePanel?: string
  widthIn?: number
  heightIn?: number
  uid: string
  grid?: string
  grilleType?: string
  glassType?: string
  screen?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const s = (shape ?? '').trim()
  const clipId = `cd-${uid}`
  const [clipEl, fillEl] = shapeElements(s, glassColor(glassType))
  const sN = sub.toLowerCase().replace(/[\s-]+/g, '')
  const isDouble = sN === 'doublecasement'
  const isFrench = sN === 'frenchcasement'
  const isFixed  = sN === 'fixedcasement'

  const ap = (activePanel ?? 'both').toLowerCase()
  const leftActive  = ap === 'left'  || ap === 'both'
  const rightActive = ap === 'right' || ap === 'both'

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      <defs><clipPath id={clipId}>{clipEl}</clipPath></defs>
      <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>
      {fillEl}
      <g clipPath={`url(#${clipId})`}>
        <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} screen={screen} uid={uid}/>
        {isFixed ? (
          <DashedX x1={X1} y1={Y1} x2={X2} y2={Y2}/>
        ) : isDouble || isFrench ? (
          <>
            {leftActive
              ? <CasementHinge    x1={X1} y1={Y1} x2={CX} y2={Y2} side="left"/>
              : <CasementHandleOnly x1={X1} y1={Y1} x2={CX} y2={Y2} side="left"/>}
            {rightActive
              ? <CasementHinge    x1={CX} y1={Y1} x2={X2} y2={Y2} side="right"/>
              : <CasementHandleOnly x1={CX} y1={Y1} x2={X2} y2={Y2} side="right"/>}
            {isDouble && <line x1={CX} y1={Y1} x2={CX} y2={Y2} stroke={FRAME} strokeWidth="2"/>}
          </>
        ) : sN === 'rightcasement' ? (
          <CasementHinge x1={X1} y1={Y1} x2={X2} y2={Y2} side="right"/>
        ) : (
          <CasementHinge x1={X1} y1={Y1} x2={X2} y2={Y2} side="left"/>
        )}
        <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} grilleType={grilleType} uid={uid}/>
      </g>
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Slider ────────────────────────────────────────────────────────

type SliderPanel = 'sliding' | 'fixed'

const SLIDER_CONFIGS: Record<string, SliderPanel[]> = {
  'xo':            ['sliding', 'fixed'],
  'ox':            ['fixed', 'sliding'],
  'xx':            ['sliding', 'sliding'],
  'endvent':       ['sliding', 'fixed', 'sliding'],
  'doubleendvent': ['sliding', 'fixed', 'fixed', 'sliding'],
  'liftout':       ['fixed', 'fixed'],
}

function SlidingPanel({ x1, y1, x2, y2, dir }: {
  x1: number; y1: number; x2: number; y2: number; dir: 'left' | 'right'
}) {
  const my = (y1 + y2) / 2
  if (dir === 'right') {
    return (
      <g>
        <line x1={x1+5} y1={my} x2={x2-10} y2={my} stroke={MOV} strokeWidth="1" strokeDasharray="4 2"/>
        <path d={`M${x2-10} ${my-5} L${x2-3} ${my} L${x2-10} ${my+5} Z`} fill={MOV}/>
        <rect x={x1+4} y={my-7} width="5" height="14" rx="1.5" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      <line x1={x1+10} y1={my} x2={x2-5} y2={my} stroke={MOV} strokeWidth="1" strokeDasharray="4 2"/>
      <path d={`M${x1+10} ${my-5} L${x1+3} ${my} L${x1+10} ${my+5} Z`} fill={MOV}/>
      <rect x={x2-9} y={my-7} width="5" height="14" rx="1.5" fill={SEC}/>
    </g>
  )
}

export function SliderDrawing({ sub, widthIn, heightIn, uid, grid, grilleType, glassType, screen }: {
  sub: string
  widthIn?: number
  heightIn?: number
  uid?: string
  grid?: string
  grilleType?: string
  glassType?: string
  screen?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const sN = sub.toLowerCase().replace(/[\s-]+/g, '')
  const panels = SLIDER_CONFIGS[sN] ?? SLIDER_CONFIGS['xo']
  const N = panels.length
  const pw = (X2 - X1) / N

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>}
      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={glassColor(glassType)} stroke={FRAME} strokeWidth="2.5"/>
      {uid && <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} screen={screen} uid={uid}/>}

      {panels.map((panel, i) => {
        const px1 = X1 + pw * i
        const px2 = px1 + pw
        const dir: 'left' | 'right' = i < N / 2 ? 'right' : 'left'
        return (
          <g key={i}>
            {i > 0 && <line x1={px1} y1={Y1} x2={px1} y2={Y2} stroke={FRAME} strokeWidth="1.5"/>}
            {panel === 'sliding'
              ? <SlidingPanel x1={px1} y1={Y1} x2={px2} y2={Y2} dir={dir}/>
              : <DashedX     x1={px1} y1={Y1} x2={px2} y2={Y2}/>}
          </g>
        )
      })}
      {uid && <GridOverlay x1={X1} y1={Y1} x2={X2} y2={Y2} grid={grid} grilleType={grilleType} uid={uid}/>}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Hopper ────────────────────────────────────────────────────────

// meetY = where the two MOV diagonals converge (higher = more open)
const HOPPER_MEET: Record<string, number> = {
  '30°': Y1 + 100,
  '45°': Y1 + 55,
  '90°': Y1 + 10,
}

export function HopperDrawing({ openingAngle, widthIn, heightIn, glassType, uid }: {
  openingAngle?: string
  widthIn?: number
  heightIn?: number
  glassType?: string
  uid?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const meetY = HOPPER_MEET[openingAngle ?? '45°'] ?? HOPPER_MEET['45°']

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType}/>}
      <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={glassColor(glassType)} stroke={FRAME} strokeWidth="2.5"/>
      {uid && <GlassEffects x1={X1} y1={Y1} x2={X2} y2={Y2} glassType={glassType} uid={uid}/>}

      {/* Handle at top center (physical position on closed sash) */}
      <rect x={CX - 6} y={Y1 + 5} width="12" height="5" rx="1.5" fill={SEC}/>
      {/* Hinge at bottom */}
      <line x1={X1 + 5} y1={Y2 - 5} x2={X2 - 5} y2={Y2 - 5} stroke={SEC} strokeWidth="1.5"/>
      {/* MOV diagonals from hinge corners up — steeper = more open */}
      <line x1={X1 + 5} y1={Y2 - 5} x2={CX} y2={meetY} stroke={MOV} strokeWidth="1.2"/>
      <line x1={X2 - 5} y1={Y2 - 5} x2={CX} y2={meetY} stroke={MOV} strokeWidth="1.2"/>
      {/* Dashed arc showing the sweep path */}
      <path d={`M${X1 + 5} ${Y2 - 5} Q${CX} ${meetY} ${X2 - 5} ${Y2 - 5}`}
        stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
