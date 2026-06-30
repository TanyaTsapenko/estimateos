'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'
import { GridOverlay, glassColor } from '@/lib/v2/svgHelpers'

type PanelStyle = 'fixed' | 'casement-l' | 'casement-r' | 'awning' | 'singleHung' | 'doubleHung'

type Box = { x1: number; y1: number; x2: number; y2: number }

function styleFromUnit(unit: string | undefined, flipHinge = false): PanelStyle {
  switch (unit) {
    case 'Casement':    return flipHinge ? 'casement-r' : 'casement-l'
    case 'Awning':      return 'awning'
    case 'Single Hung': return 'singleHung'
    case 'Double Hung': return 'doubleHung'
    default:            return 'fixed'
  }
}

function PanelIndicator({ style, b: { x1, y1, x2, y2 }, fr }: { style: PanelStyle; b: Box; fr?: string }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const FR = fr ?? FRAME

  if (style === 'fixed') return (
    <g>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
      <line x1={x2-3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
    </g>
  )
  if (style === 'casement-l') return (
    <g>
      <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.2"/>
      <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
      <rect x={x2-8} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
    </g>
  )
  if (style === 'casement-r') return (
    <g>
      <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.2"/>
      <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`} stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
      <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
      <rect x={x1+3} y={my-6} width="5" height="12" rx="1.5" fill={SEC}/>
    </g>
  )
  if (style === 'awning') return (
    <g>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y1+3} stroke={SEC} strokeWidth="1.2"/>
      <line x1={x1+3} y1={y1+3} x2={mx} y2={y2-3} stroke={MOV} strokeWidth="1.2"/>
      <line x1={x2-3} y1={y1+3} x2={mx} y2={y2-3} stroke={MOV} strokeWidth="1.2"/>
      <rect x={mx-6} y={y2-7} width="12" height="5" rx="1.5" fill={SEC}/>
    </g>
  )
  if (style === 'singleHung') return (
    <g>
      <line x1={x1+3} y1={my} x2={x2-3} y2={my} stroke={FR} strokeWidth="1.5"/>
      <line x1={x1+4} y1={y1+4} x2={x2-4} y2={my-2} stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
      <line x1={x2-4} y1={y1+4} x2={x1+4} y2={my-2} stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
      <path d={`M${mx} ${y2-4} L${mx-5} ${y2-11} L${mx} ${y2-8} L${mx+5} ${y2-11}Z`} fill={MOV}/>
      <line x1={mx} y1={y2-8} x2={mx} y2={my+3} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
    </g>
  )
  if (style === 'doubleHung') return (
    <g>
      <line x1={x1+3} y1={my} x2={x2-3} y2={my} stroke={FR} strokeWidth="1.5"/>
      <path d={`M${mx} ${y1+4} L${mx-5} ${y1+11} L${mx} ${y1+8} L${mx+5} ${y1+11}Z`} fill={MOV}/>
      <line x1={mx} y1={y1+8} x2={mx} y2={my-3} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
      <path d={`M${mx} ${y2-4} L${mx-5} ${y2-11} L${mx} ${y2-8} L${mx+5} ${y2-11}Z`} fill={MOV}/>
      <line x1={mx} y1={y2-8} x2={mx} y2={my+3} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
    </g>
  )
  return null
}

const LEAN_MAP: Record<string, number> = {
  '30°': 5, '45°': 12, '60°': 20, '90°': 30, 'Custom': 12,
}

// ── Bay drawing ────────────────────────────────────────────────────
export function BayDrawing({
  bayAngle, centerWindowType, sideUnit, sub, heightIn, widthIn, grid, grilleType, uid, glassType, frameColor,
}: {
  bayAngle?: string
  centerWindowType?: string
  sideUnit?: string
  sub?: string
  heightIn?: number
  widthIn?: number
  grid?: string
  grilleType?: string
  uid?: string
  glassType?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"`  : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const lean = LEAN_MAP[bayAngle ?? '45°'] ?? 12

  // Parse lite count from sub e.g. "3 lite" → 3; clamp 3–5
  const liteCount = Math.max(3, Math.min(5, parseInt(sub ?? '3') || 3))
  const numCenter = liteCount - 2

  // Fixed layout constants
  const sideW = 48   // left side panel width
  const rSideW = 47  // right side panel width
  const lx1 = 10, lx2 = lx1 + sideW
  const rx2 = 205, rx1 = rx2 - rSideW
  const centerTotalW = rx1 - lx2  // 100px
  const centerPanelW = centerTotalW / numCenter

  const yT = 22, yB = 218

  const leftPts  = `${lx1},${yT+lean} ${lx2},${yT} ${lx2},${yB} ${lx1},${yB+lean}`
  const rightPts = `${rx1},${yT} ${rx2},${yT+lean} ${rx2},${yB+lean} ${rx1},${yB}`

  const leftStyle:  PanelStyle = styleFromUnit(sideUnit, false)
  const rightStyle: PanelStyle = styleFromUnit(sideUnit, true)

  const dimY = yB + lean + 12
  const vbH  = yB + lean + 40

  return (
    <svg viewBox={`0 0 232 ${vbH}`} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Left side panel */}
      <polygon points={leftPts} fill={glassColor(glassType)} stroke={FR} strokeWidth="2" strokeLinejoin="round"/>
      <PanelIndicator style={leftStyle} b={{ x1: lx1+4, y1: yT+lean+4, x2: lx2-4, y2: yB-4 }} fr={FR}/>

      {/* Center panels */}
      {Array.from({ length: numCenter }, (_, i) => {
        const cx1 = lx2 + i * centerPanelW
        const cx2 = cx1 + centerPanelW
        const flipHinge = i >= numCenter / 2
        const centerStyle: PanelStyle = centerWindowType === 'Casement'
          ? (flipHinge ? 'casement-r' : 'casement-l')
          : 'fixed'
        return (
          <g key={i}>
            <rect x={cx1} y={yT} width={centerPanelW} height={yB-yT} fill={glassColor(glassType)} stroke={FR} strokeWidth="2"/>
            <PanelIndicator style={centerStyle} b={{ x1: cx1+4, y1: yT+4, x2: cx2-4, y2: yB-4 }} fr={FR}/>
            {uid && i === 0 && (
              <GridOverlay x1={lx2} y1={yT} x2={rx1} y2={yB} grid={grid} grilleType={grilleType} uid={uid} frameColor={frameColor}/>
            )}
            {/* Mullion between center panels */}
            {i > 0 && <line x1={cx1} y1={yT} x2={cx1} y2={yB} stroke={FR} strokeWidth="1.5"/>}
          </g>
        )
      })}

      {/* Right side panel */}
      <polygon points={rightPts} fill={glassColor(glassType)} stroke={FR} strokeWidth="2" strokeLinejoin="round"/>
      <PanelIndicator style={rightStyle} b={{ x1: rx1+4, y1: yT+4, x2: rx2-4, y2: yB-4 }} fr={FR}/>

      {/* Width dim */}
      <line x1={lx1} y1={dimY} x2={rx2} y2={dimY} stroke={SEC} strokeWidth="1"/>
      <line x1={lx1} y1={dimY-5} x2={lx1} y2={dimY+5} stroke={SEC} strokeWidth="1.5"/>
      <line x1={rx2} y1={dimY-5} x2={rx2} y2={dimY+5} stroke={SEC} strokeWidth="1.5"/>
      <text x="107" y={dimY+16} textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>

      {/* Height dim */}
      <line x1="211" y1={yT} x2="211" y2={yB} stroke={SEC} strokeWidth="1"/>
      <line x1="207" y1={yT} x2="215" y2={yT} stroke={SEC} strokeWidth="1.5"/>
      <line x1="207" y1={yB} x2="215" y2={yB} stroke={SEC} strokeWidth="1.5"/>
      <text x="217" y={Math.round((yT + yB) / 2) + 4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </svg>
  )
}

// ── Bow drawing ────────────────────────────────────────────────────
export function BowDrawing({
  sub, panelType, sideUnit, heightIn, widthIn, grid, grilleType, uid, glassType, frameColor,
}: {
  sub: string
  panelType?: string
  sideUnit?: string
  heightIn?: number
  widthIn?: number
  grid?: string
  grilleType?: string
  uid?: string
  glassType?: string
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"`  : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME

  const N = Math.max(2, parseInt(sub) || 5)

  const totalW = 190
  const pw     = totalW / N
  const yT     = 22, yB = 215
  const endLean = 10

  const panels = Array.from({ length: N }, (_, i) => {
    const x1 = 10 + i * pw
    const x2 = x1 + pw
    const isLeft  = i === 0
    const isRight = i === N - 1
    const flipHinge = i >= N / 2

    // Outer panels use sideUnit; center panels use panelType
    const unitStr = (isLeft || isRight) ? (sideUnit ?? 'Fixed') : (panelType ?? 'Fixed')
    const style: PanelStyle = unitStr === 'Casement'
      ? (flipHinge ? 'casement-r' : 'casement-l')
      : styleFromUnit(unitStr)

    if (isLeft) {
      const pts = `${x1},${yT+endLean} ${x2},${yT} ${x2},${yB} ${x1},${yB+endLean}`
      return (
        <g key={i}>
          <polygon points={pts} fill={glassColor(glassType)} stroke={FR} strokeWidth="2" strokeLinejoin="round"/>
          <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+endLean+3, x2: x2-3, y2: yB-3 }} fr={FR}/>
        </g>
      )
    }
    if (isRight) {
      const pts = `${x1},${yT} ${x2},${yT+endLean} ${x2},${yB+endLean} ${x1},${yB}`
      return (
        <g key={i}>
          <polygon points={pts} fill={glassColor(glassType)} stroke={FR} strokeWidth="2" strokeLinejoin="round"/>
          <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+3, x2: x2-3, y2: yB-3 }} fr={FR}/>
        </g>
      )
    }
    return (
      <g key={i}>
        <rect x={x1} y={yT} width={pw} height={yB-yT} fill={glassColor(glassType)} stroke={FR} strokeWidth="2"/>
        <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+3, x2: x2-3, y2: yB-3 }} fr={FR}/>
      </g>
    )
  })

  // Center glass bounds for grid overlay (skip angled end panels)
  const gridX1 = 10 + pw
  const gridX2 = 10 + (N - 1) * pw

  return (
    <svg viewBox="0 0 232 255" width={232} height={255} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto' }}>

      {panels}
      {uid && N > 2 && (
        <GridOverlay x1={gridX1} y1={yT} x2={gridX2} y2={yB} grid={grid} grilleType={grilleType} uid={uid} frameColor={frameColor}/>
      )}

      {/* Width dim */}
      <line x1="10" y1="232" x2="200" y2="232" stroke={SEC} strokeWidth="1"/>
      <line x1="10"  y1="227" x2="10"  y2="237" stroke={SEC} strokeWidth="1.5"/>
      <line x1="200" y1="227" x2="200" y2="237" stroke={SEC} strokeWidth="1.5"/>
      <text x="105" y="248" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>

      {/* Height dim */}
      <line x1="208" y1={yT} x2="208" y2={yB} stroke={SEC} strokeWidth="1"/>
      <line x1="204" y1={yT} x2="212" y2={yT} stroke={SEC} strokeWidth="1.5"/>
      <line x1="204" y1={yB} x2="212" y2={yB} stroke={SEC} strokeWidth="1.5"/>
      <text x="214" y={Math.round((yT + yB) / 2) + 4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </svg>
  )
}
