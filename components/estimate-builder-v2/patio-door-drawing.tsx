'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { glassColor, GlassPatternDefs, GlassEffects } from '@/lib/v2/svgHelpers'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220

// Patio door convention: X = fixed, O = sliding (opposite of window slider)
const PATIO_CONFIGS: Record<string, ('fixed' | 'sliding')[]> = {
  'XO':   ['fixed', 'sliding'],
  'OX':   ['sliding', 'fixed'],
  'XOX':  ['fixed', 'sliding', 'fixed'],
  'OXXO': ['sliding', 'fixed', 'fixed', 'sliding'],
}

function DimLines({ wL, hL }: { wL: string; hL: string }) {
  return (
    <>
      <line x1={X1} y1="227" x2={X2} y2="227" stroke={SEC} strokeWidth="1"/>
      <line x1={X1} y1="222" x2={X1} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <line x1={X2} y1="222" x2={X2} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <text x={(X1+X2)/2} y="244" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1={Y1} x2="197" y2={Y2} stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1={Y1} x2="201" y2={Y1} stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1={Y2} x2="201" y2={Y2} stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y={Math.round((Y1+Y2)/2)+4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </>
  )
}

function FixedPanel({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1+4} y1={y1+4} x2={x2-4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      <line x1={x2-4} y1={y1+4} x2={x1+4} y2={y2-4} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
    </g>
  )
}

function SlidingPanel({ x1, y1, x2, y2, dir }: {
  x1: number; y1: number; x2: number; y2: number; dir: 'left' | 'right'
}) {
  const my = (y1 + y2) / 2
  if (dir === 'right') {
    return (
      <g>
        <line x1={x1+5} y1={my} x2={x2-10} y2={my} stroke={MOV} strokeWidth="1" strokeDasharray="4 2"/>
        <path d={`M${x2-10} ${my-6} L${x2-3} ${my} L${x2-10} ${my+6} Z`} fill={MOV}/>
        <rect x={x1+4} y={my-8} width="5" height="16" rx="1.5" fill={SEC}/>
      </g>
    )
  }
  return (
    <g>
      <line x1={x1+10} y1={my} x2={x2-5} y2={my} stroke={MOV} strokeWidth="1" strokeDasharray="4 2"/>
      <path d={`M${x1+10} ${my-6} L${x1+3} ${my} L${x1+10} ${my+6} Z`} fill={MOV}/>
      <rect x={x2-9} y={my-8} width="5" height="16" rx="1.5" fill={SEC}/>
    </g>
  )
}

export function PatioDoorDrawing({ sub, widthIn, heightIn, glassType, screen, uid }: {
  sub: string
  widthIn?: number
  heightIn?: number
  glassType?: string
  screen?: string
  uid?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const panels = PATIO_CONFIGS[sub] ?? PATIO_CONFIGS['XO']
  const N = panels.length
  const pw = (X2 - X1) / N

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {uid && <GlassPatternDefs uid={uid} glassType={glassType} screen={screen}/>}
      <rect x={X1} y={Y1} width={X2-X1} height={Y2-Y1} fill={glassColor(glassType)} stroke={FRAME} strokeWidth="2.5"/>
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
              : <FixedPanel   x1={px1} y1={Y1} x2={px2} y2={Y2}/>}
          </g>
        )
      })}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
