'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'

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

function PanelIndicator({ style, b: { x1, y1, x2, y2 } }: { style: PanelStyle; b: Box }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

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
      <line x1={x1+3} y1={my} x2={x2-3} y2={my} stroke={FRAME} strokeWidth="1.5"/>
      <line x1={x1+4} y1={y1+4} x2={x2-4} y2={my-2} stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
      <line x1={x2-4} y1={y1+4} x2={x1+4} y2={my-2} stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
      <path d={`M${mx} ${y2-4} L${mx-5} ${y2-11} L${mx} ${y2-8} L${mx+5} ${y2-11}Z`} fill={MOV}/>
      <line x1={mx} y1={y2-8} x2={mx} y2={my+3} stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2"/>
    </g>
  )
  if (style === 'doubleHung') return (
    <g>
      <line x1={x1+3} y1={my} x2={x2-3} y2={my} stroke={FRAME} strokeWidth="1.5"/>
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
  bayAngle, centerWindowType, sideUnit, heightIn, widthIn,
}: {
  bayAngle?: string
  centerWindowType?: string
  sideUnit?: string
  heightIn?: number
  widthIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"`  : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const lean = LEAN_MAP[bayAngle ?? '45°'] ?? 12

  // Panel x boundaries
  const lx1 = 10, lx2 = 58          // left side panel  (48px wide)
  const cx1 = 58, cx2 = 158         // center panel    (100px wide)
  const rx1 = 158, rx2 = 205        // right side panel (47px wide)

  // Y bounds (center panel defines the height; outer edges lean DOWN by `lean`)
  const yT = 22, yB = 218

  const leftPts  = `${lx1},${yT+lean} ${lx2},${yT} ${lx2},${yB} ${lx1},${yB+lean}`
  const rightPts = `${rx1},${yT} ${rx2},${yT+lean} ${rx2},${yB+lean} ${rx1},${yB}`

  const leftStyle:   PanelStyle = styleFromUnit(sideUnit, false)
  const rightStyle:  PanelStyle = styleFromUnit(sideUnit, true)
  const centerStyle: PanelStyle = centerWindowType === 'Casement' ? 'casement-l' : 'fixed'

  const dimY = yB + lean + 12
  const vbH  = yB + lean + 40   // viewBox height expands with lean

  return (
    <svg viewBox={`0 0 232 ${vbH}`} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Left side panel */}
      <polygon points={leftPts} fill={GLASS} stroke={FRAME} strokeWidth="2" strokeLinejoin="round"/>
      <PanelIndicator style={leftStyle}   b={{ x1: lx1+4, y1: yT+lean+4, x2: lx2-4, y2: yB-4 }}/>

      {/* Center panel */}
      <rect x={cx1} y={yT} width={cx2-cx1} height={yB-yT} fill={GLASS} stroke={FRAME} strokeWidth="2"/>
      <PanelIndicator style={centerStyle} b={{ x1: cx1+4, y1: yT+4,      x2: cx2-4, y2: yB-4 }}/>

      {/* Right side panel */}
      <polygon points={rightPts} fill={GLASS} stroke={FRAME} strokeWidth="2" strokeLinejoin="round"/>
      <PanelIndicator style={rightStyle}  b={{ x1: rx1+4, y1: yT+4,      x2: rx2-4, y2: yB-4 }}/>

      {/* Width dim — spans full outer width */}
      <line x1={lx1} y1={dimY} x2={rx2} y2={dimY} stroke={SEC} strokeWidth="1"/>
      <line x1={lx1} y1={dimY-5} x2={lx1} y2={dimY+5} stroke={SEC} strokeWidth="1.5"/>
      <line x1={rx2} y1={dimY-5} x2={rx2} y2={dimY+5} stroke={SEC} strokeWidth="1.5"/>
      <text x="107" y={dimY+16} textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>

      {/* Height dim — center panel height only */}
      <line x1="211" y1={yT} x2="211" y2={yB} stroke={SEC} strokeWidth="1"/>
      <line x1="207" y1={yT} x2="215" y2={yT} stroke={SEC} strokeWidth="1.5"/>
      <line x1="207" y1={yB} x2="215" y2={yB} stroke={SEC} strokeWidth="1.5"/>
      <text x="217" y={Math.round((yT + yB) / 2) + 4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </svg>
  )
}

// ── Bow drawing ────────────────────────────────────────────────────
export function BowDrawing({
  sub, panelType, heightIn, widthIn,
}: {
  sub: string
  panelType?: string
  heightIn?: number
  widthIn?: number
}) {
  const wL = widthIn  ? `${widthIn}"`  : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'

  // Parse panel count from sub e.g. "5 lite" → 5
  const N = Math.max(2, parseInt(sub) || 5)

  const totalW = 190        // x 10 to 200
  const pw     = totalW / N
  const yT     = 22, yB = 215
  const endLean = 10        // lean only on outermost panels

  const panels = Array.from({ length: N }, (_, i) => {
    const x1 = 10 + i * pw
    const x2 = x1 + pw
    const isLeft  = i === 0
    const isRight = i === N - 1
    const flipHinge = i >= N / 2
    const style: PanelStyle = panelType === 'Casement'
      ? (flipHinge ? 'casement-r' : 'casement-l')
      : 'fixed'

    if (isLeft) {
      const pts = `${x1},${yT+endLean} ${x2},${yT} ${x2},${yB} ${x1},${yB+endLean}`
      return (
        <g key={i}>
          <polygon points={pts} fill={GLASS} stroke={FRAME} strokeWidth="2" strokeLinejoin="round"/>
          <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+endLean+3, x2: x2-3, y2: yB-3 }}/>
        </g>
      )
    }
    if (isRight) {
      const pts = `${x1},${yT} ${x2},${yT+endLean} ${x2},${yB+endLean} ${x1},${yB}`
      return (
        <g key={i}>
          <polygon points={pts} fill={GLASS} stroke={FRAME} strokeWidth="2" strokeLinejoin="round"/>
          <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+3, x2: x2-3, y2: yB-3 }}/>
        </g>
      )
    }
    return (
      <g key={i}>
        <rect x={x1} y={yT} width={pw} height={yB-yT} fill={GLASS} stroke={FRAME} strokeWidth="2"/>
        <PanelIndicator style={style} b={{ x1: x1+3, y1: yT+3, x2: x2-3, y2: yB-3 }}/>
      </g>
    )
  })

  return (
    <svg viewBox="0 0 232 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto' }}>

      {panels}

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
