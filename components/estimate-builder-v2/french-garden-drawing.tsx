'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const SIDELITE_W = 28
const TRANSOM_H  = 36
const DOOR_FILL = '#C5CBD4'   // solid panel color (vs GLASS blue for glazed areas)

// ── Helpers ────────────────────────────────────────────────────────

function liteFraction(glassSize?: string): number {
  switch (glassSize) {
    case '1/4 Lite': return 0.25
    case '1/2 Lite': return 0.50
    case '3/4 Lite': return 0.75
    case 'Full Lite': return 1.00
    default:         return 0
  }
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

// ── Door panel ─────────────────────────────────────────────────────

function FrenchDoorPanel({ x1, y1, x2, y2, hingeLeft, showSwing, glassSize, fr }: {
  x1: number; y1: number; x2: number; y2: number
  hingeLeft: boolean; showSwing: boolean; glassSize?: string; fr?: string
}) {
  const my = (y1 + y2) / 2
  const FR = fr ?? FRAME
  const frac = liteFraction(glassSize)
  const fullGlass = frac >= 1
  const panelFill = fullGlass ? GLASS : DOOR_FILL

  // Glass lite rect bounds (inset from frame) — top-anchored per door convention
  const innerH = (y2 - y1) - 12
  const glassH = frac * innerH
  const glassY1 = y1 + 6

  return (
    <g>
      {/* Door panel background */}
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={panelFill} stroke={FR} strokeWidth="2.5"/>
      {/* Partial glass lite */}
      {frac > 0 && !fullGlass && (
        <rect x={x1+8} y={glassY1} width={x2-x1-16} height={glassH}
          fill={GLASS} stroke={FR} strokeWidth="1.2"/>
      )}

      {/* Swing arc + hinge */}
      {showSwing && hingeLeft && <>
        <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      </>}
      {showSwing && !hingeLeft && <>
        <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <rect x={x1+4} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      </>}

      {/* Inactive panel — handle only, no swing */}
      {!showSwing && (hingeLeft
        ? <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
        : <rect x={x1+4}  y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      )}
    </g>
  )
}

// ── Sidelite ───────────────────────────────────────────────────────

function Sidelite({ x1, y1, x2, y2, fr }: { x1: number; y1: number; x2: number; y2: number; fr?: string }) {
  const FR = fr ?? FRAME
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={GLASS} stroke={FR} strokeWidth="2"/>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
      <line x1={x2-3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
    </g>
  )
}

// ── French Door ────────────────────────────────────────────────────

export function FrenchDoorDrawing({ sub, doorSwing, activePanel, astragal, glassSize, widthIn, heightIn, frameColor }: {
  sub: string
  doorSwing?: string
  activePanel?: string
  astragal?: string
  glassSize?: string
  widthIn?: number
  heightIn?: number
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const swing = (doorSwing ?? '').toLowerCase()
  const singleHingeLeft = !swing.includes('right')

  const isSingle   = sub === 'Single french'
  const isSidelite = sub === 'French + sidelites'

  // For double/sidelite: two door panels, outer-hinged
  // activePanel controls which door(s) show swing arc
  const ap = activePanel ?? 'Both'
  const leftActive  = ap === 'Left'  || ap === 'Both'
  const rightActive = ap === 'Right' || ap === 'Both'

  // X layout
  const doorW = isSidelite
    ? (X2 - X1 - 2 * SIDELITE_W) / 2
    : isSingle ? X2 - X1 : (X2 - X1) / 2

  // Astragal center x (between the two door panels)
  const cx = isSidelite ? X1 + SIDELITE_W + doorW : X1 + doorW

  const hasAstragal = !isSingle && astragal && astragal !== 'None'
  const astragalDash = astragal === 'Removable Astragal' ? '6 3' : undefined

  return (
    <svg viewBox="0 0 215 255" width={215} height={255} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {isSingle ? (
        <FrenchDoorPanel
          x1={X1} y1={Y1} x2={X2} y2={Y2}
          hingeLeft={singleHingeLeft} showSwing={true} glassSize={glassSize} fr={FR}/>
      ) : isSidelite ? (
        <>
          <Sidelite x1={X1} y1={Y1} x2={X1+SIDELITE_W} y2={Y2} fr={FR}/>
          <FrenchDoorPanel
            x1={X1+SIDELITE_W} y1={Y1} x2={cx} y2={Y2}
            hingeLeft={true} showSwing={leftActive} glassSize={glassSize} fr={FR}/>
          <FrenchDoorPanel
            x1={cx} y1={Y1} x2={X2-SIDELITE_W} y2={Y2}
            hingeLeft={false} showSwing={rightActive} glassSize={glassSize} fr={FR}/>
          <Sidelite x1={X2-SIDELITE_W} y1={Y1} x2={X2} y2={Y2} fr={FR}/>
        </>
      ) : (
        /* Double french */
        <>
          <FrenchDoorPanel
            x1={X1} y1={Y1} x2={cx} y2={Y2}
            hingeLeft={true} showSwing={leftActive} glassSize={glassSize} fr={FR}/>
          <FrenchDoorPanel
            x1={cx} y1={Y1} x2={X2} y2={Y2}
            hingeLeft={false} showSwing={rightActive} glassSize={glassSize} fr={FR}/>
        </>
      )}

      {/* Astragal center line */}
      {hasAstragal && (
        <line x1={cx} y1={Y1+2} x2={cx} y2={Y2-2}
          stroke={SEC}
          strokeWidth={astragalDash ? 1.5 : 2.5}
          strokeDasharray={astragalDash}/>
      )}

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}

// ── Garden Door ────────────────────────────────────────────────────

export function GardenDoorDrawing({ doorSwing, glassSize, sidelights, transomAbove, widthIn, heightIn, frameColor }: {
  doorSwing?: string
  glassSize?: string
  sidelights?: string
  transomAbove?: string
  widthIn?: number
  heightIn?: number
  frameColor?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = frameColor ?? FRAME
  const swing = (doorSwing ?? '').toLowerCase()
  const hingeLeft = !swing.includes('right')

  const sl = (sidelights ?? 'None').toLowerCase()
  const hasLeft  = sl === 'left'  || sl === 'both'
  const hasRight = sl === 'right' || sl === 'both'
  const hasTransom = !!transomAbove && transomAbove !== 'None'

  const doorX1 = hasLeft  ? X1 + SIDELITE_W : X1
  const doorX2 = hasRight ? X2 - SIDELITE_W : X2
  const doorY1 = hasTransom ? Y1 + TRANSOM_H : Y1

  return (
    <svg viewBox="0 0 215 255" width={215} height={255} fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      {/* Transom (spans full X1–X2 width) */}
      {hasTransom && transomAbove === 'Arched' ? (
        <path
          d={`M${X1} ${Y1+TRANSOM_H} L${X1} ${Math.round(Y1+TRANSOM_H*0.5)} Q${100} ${Y1} ${X2} ${Math.round(Y1+TRANSOM_H*0.5)} L${X2} ${Y1+TRANSOM_H} Z`}
          fill={GLASS} stroke={FR} strokeWidth="2"
        />
      ) : hasTransom ? (
        <Sidelite x1={X1} y1={Y1} x2={X2} y2={Y1+TRANSOM_H} fr={FR}/>
      ) : null}

      {/* Sidelights (below transom if any) */}
      {hasLeft  && <Sidelite x1={X1}           y1={doorY1} x2={X1+SIDELITE_W} y2={Y2} fr={FR}/>}
      {hasRight && <Sidelite x1={X2-SIDELITE_W} y1={doorY1} x2={X2}           y2={Y2} fr={FR}/>}

      {/* Main door panel */}
      <FrenchDoorPanel
        x1={doorX1} y1={doorY1} x2={doorX2} y2={Y2}
        hingeLeft={hingeLeft} showSwing={true} glassSize={glassSize} fr={FR}/>

      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
