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
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

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

// ── Single Hung — SVG-string → <img> (bypasses CSS inheritance / viewBox conflicts) ──

function shuShapeStr(s: string, fill: string, fr: string): { clip: string; frame: string } {
  const n = s.toLowerCase().replace(/[\s-]+/g, '')
  const poly = (pts: string) => ({
    clip:  `<polygon points="${pts}"/>`,
    frame: `<polygon points="${pts}" fill="${fill}" stroke="${fr}" stroke-width="2.5" stroke-linejoin="round"/>`,
  })
  const path = (d: string) => ({
    clip:  `<path d="${d}"/>`,
    frame: `<path d="${d}" fill="${fill}" stroke="${fr}" stroke-width="2.5"/>`,
  })
  switch (n) {
    case 'arch': case 'arched':
      return path('M10 220 L10 110 Q10 10 100 10 Q190 10 190 110 L190 220 Z')
    case 'halfarch':
      return path('M10 220 L10 155 Q10 10 100 10 Q190 10 190 155 L190 220 Z')
    case 'halfround': case 'halfcircle':
      return path('M10 220 A90 210 0 0 1 190 220 Z')
    case 'circle':
      return {
        clip:  '<ellipse cx="100" cy="115" rx="90" ry="105"/>',
        frame: `<ellipse cx="100" cy="115" rx="90" ry="105" fill="${fill}" stroke="${fr}" stroke-width="2.5"/>`,
      }
    case 'octagon':
      return poly('65,10 135,10 190,65 190,165 135,220 65,220 10,165 10,65')
    case 'triangle':
      return poly('100,10 190,220 10,220')
    case 'trapezoid':
      return poly('45,10 155,10 190,220 10,220')
    case 'pentagon':
      return poly('100,10 190,91 156,220 44,220 10,91')
    case 'gothic':
      return path('M10 220 L10 160 C10 50 90 10 100 10 C110 10 190 50 190 160 L190 220 Z')
    case 'eyebrow':
      return path('M10 220 L10 50 Q100 10 190 50 L190 220 Z')
    default:
      return {
        clip:  '<rect x="10" y="10" width="180" height="210"/>',
        frame: `<rect x="10" y="10" width="180" height="210" rx="3" fill="${fill}" stroke="${fr}" stroke-width="2.5"/>`,
      }
  }
}

function shuGridStr(grid: string | undefined, grilleType: string | undefined, fr: string): string {
  const pat = grid ?? 'None'
  if (pat === 'None') return ''
  const sw = (grilleType ?? 'None') === 'SDL' ? 3 : 1.5
  const [x1, y1, x2, y2] = [10, 10, 190, 220]
  const w = x2 - x1, h = y2 - y1
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const ln = (ax1: number, ay1: number, ax2: number, ay2: number) =>
    `<line x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}" stroke="${fr}" stroke-width="${sw}" stroke-linecap="round"/>`
  if (pat === 'Colonial')
    return ln(mx, y1, mx, y2) + ln(x1, y1+h/3, x2, y1+h/3) + ln(x1, y1+2*h/3, x2, y1+2*h/3)
  if (pat === 'Georgian')
    return ln(x1+w/3, y1, x1+w/3, y2) + ln(x1+2*w/3, y1, x1+2*w/3, y2) +
           ln(x1, y1+h/3, x2, y1+h/3) + ln(x1, y1+2*h/3, x2, y1+2*h/3)
  if (pat === 'Prairie') {
    const fi = Math.min(w*0.25, h*0.22)
    return `<rect x="${x1+fi}" y="${y1+fi}" width="${w-2*fi}" height="${h-2*fi}" stroke="${fr}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
      ln(x1+fi, y1, x1+fi, y1+fi) + ln(x1, y1+fi, x1+fi, y1+fi) +
      ln(x2-fi, y1, x2-fi, y1+fi) + ln(x2, y1+fi, x2-fi, y1+fi) +
      ln(x1+fi, y2, x1+fi, y2-fi) + ln(x1, y2-fi, x1+fi, y2-fi) +
      ln(x2-fi, y2, x2-fi, y2-fi) + ln(x2, y2-fi, x2-fi, y2-fi)
  }
  if (pat === 'Diamond') {
    const step = Math.round(Math.min(w, h) / 3.5)
    const ext = Math.max(w, h) + 10
    const count = Math.ceil((w + h) / step) + 3
    let lines = ''
    for (let k = -1; k <= count; k++) {
      const d = k * step
      lines += `<line x1="${x1+d-ext}" y1="${y2+ext}" x2="${x1+d+ext}" y2="${y1-ext}" stroke="${fr}" stroke-width="${sw}"/>`
      lines += `<line x1="${x1+d-ext}" y1="${y1-ext}" x2="${x1+d+ext}" y2="${y2+ext}" stroke="${fr}" stroke-width="${sw}"/>`
    }
    return `<defs><clipPath id="shu-grid-clip"><rect x="${x1}" y="${y1}" width="${w}" height="${h}"/></clipPath></defs>` +
           `<g clip-path="url(#shu-grid-clip)">${lines}</g>`
  }
  return ''
}

function singleHungSvgStr(
  s: string, fill: string, fr: string, se: string, mv: string, dim: string,
  wL: string, hL: string,
  glassType: string | undefined, screen: string | undefined,
  grid: string | undefined, grilleType: string | undefined,
  sub: string | undefined,
): string {
  const { clip, frame } = shuShapeStr(s, fill, fr)
  const isTiltIn = (sub ?? '').toLowerCase().replace(/[\s-]+/g, '') === 'tiltin'

  const hasFrost  = glassType === 'Frosted'
  const hasScreen = !!screen && screen !== 'None'
  const pats = hasFrost
    ? `<pattern id="shu-frost" x="0" y="0" width="6" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="6" y2="1.5" stroke="white" stroke-width="0.8" opacity="0.6"/></pattern>`
    : hasScreen
    ? `<pattern id="shu-mesh" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="4" y2="4" stroke="${se}" stroke-width="0.5"/><line x1="4" y1="0" x2="0" y2="4" stroke="${se}" stroke-width="0.5"/></pattern>`
    : ''
  const glassEffect = hasFrost
    ? `<rect x="10" y="10" width="180" height="210" fill="url(#shu-frost)"/>`
    : hasScreen
    ? `<rect x="10" y="10" width="180" height="210" fill="url(#shu-mesh)" fill-opacity="0.4"/>`
    : ''

  // Lower sash indicator: Standard = arrow (slides up), Tilt-In = X cross (tilts inward)
  const lowerIndicator = isTiltIn
    ? `<line x1="14" y1="117" x2="186" y2="215" stroke="${se}" stroke-width="1" stroke-dasharray="5 3"/>` +
      `<line x1="186" y1="117" x2="14" y2="215" stroke="${se}" stroke-width="1" stroke-dasharray="5 3"/>`
    : `<path d="M100 119 L95 126 L100 123 L105 126 Z" fill="${mv}"/>` +
      `<line x1="100" y1="123" x2="100" y2="213" stroke="${mv}" stroke-width="1.2" stroke-dasharray="3 2"/>`

  const gridStr = shuGridStr(grid, grilleType, fr)
  const dimLines =
    `<line x1="10" y1="226" x2="190" y2="226" stroke="${se}" stroke-width="1"/>` +
    `<line x1="10" y1="221" x2="10" y2="231" stroke="${se}" stroke-width="1.5"/>` +
    `<line x1="190" y1="221" x2="190" y2="231" stroke="${se}" stroke-width="1.5"/>` +
    `<text x="100" y="243" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="${dim}">${wL}</text>` +
    `<line x1="197" y1="10" x2="197" y2="220" stroke="${se}" stroke-width="1"/>` +
    `<line x1="193" y1="10" x2="201" y2="10" stroke="${se}" stroke-width="1.5"/>` +
    `<line x1="193" y1="220" x2="201" y2="220" stroke="${se}" stroke-width="1.5"/>` +
    `<text x="204" y="119" text-anchor="start" font-family="system-ui" font-size="10" font-weight="700" fill="${dim}">${hL}</text>`

  return (
    `<svg viewBox="0 0 215 255" xmlns="http://www.w3.org/2000/svg">` +
    (pats ? `<defs>${pats}</defs>` : '') +
    `<defs><clipPath id="shu-clip">${clip}</clipPath></defs>` +
    frame +
    `<g clip-path="url(#shu-clip)">` +
    glassEffect +
    `<line x1="13" y1="115" x2="187" y2="115" stroke="${fr}" stroke-width="1.5"/>` +
    lowerIndicator +
    gridStr +
    `</g>` +
    dimLines +
    `</svg>`
  )
}

export function SingleHungDrawing({ shape, sub, widthIn, heightIn, uid, grid, grilleType, glassType, screen, frameColor }: {
  shape?: string
  sub?: string
  widthIn?: number
  heightIn?: number
  uid: string
  grid?: string
  grilleType?: string
  glassType?: string
  screen?: string
  frameColor?: string
}) {
  const wL  = widthIn  ? `${widthIn}"` : 'W'
  const hL  = heightIn ? `${heightIn}"` : 'H'
  const s   = (shape ?? '').trim()
  const fill = glassColor(glassType)
  const fr   = frameColor ?? FRAME
  const svgStr = singleHungSvgStr(s, fill, fr, SEC, MOV, DIM, wL, hL, glassType, screen, grid, grilleType, sub)
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
  return <img src={src} style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }} alt=""/>
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
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

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
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

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
