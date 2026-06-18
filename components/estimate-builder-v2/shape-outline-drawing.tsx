'use client'
import type { ReactElement } from 'react'
import { GLASS, FRAME, SEC, DIM } from '@/components/WindowDiagram'

// Drawing bounds (consistent with winDims in WindowDiagram)
const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const CX = 100, CY = 115, RX = 90, RY = 105

// ── Shape geometry helpers ─────────────────────────────────────────

type Pair = [ReactElement, ReactElement]

function rectPair(): Pair {
  return [
    <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1}/>,
    <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>,
  ]
}

function pathPair(d: string): Pair {
  return [
    <path d={d}/>,
    <path d={d} fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>,
  ]
}

function polyPair(pts: string): Pair {
  return [
    <polygon points={pts}/>,
    <polygon points={pts} fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>,
  ]
}

function shapeElements(shape: string): Pair {
  const s = shape.toLowerCase().replace(/[\s-]+/g, '')

  // Custom or empty → rectangle
  if (s === '' || s.startsWith('custom')) return rectPair()

  switch (s) {
    case 'rectangle':
    case 'rectangular':
      return rectPair()

    case 'arch':
    case 'arched':
      // Rect base + full round arch (springs from y=110 on both sides)
      return pathPair(
        `M${X1} ${Y2} L${X1} 110 Q${X1} ${Y1} ${CX} ${Y1} Q${X2} ${Y1} ${X2} 110 L${X2} ${Y2} Z`
      )

    case 'halfarch':
      // Shallower arch — springs from y=155
      return pathPair(
        `M${X1} ${Y2} L${X1} 155 Q${X1} ${Y1} ${CX} ${Y1} Q${X2} ${Y1} ${X2} 155 L${X2} ${Y2} Z`
      )

    case 'halfround':
    case 'halfcircle':
      // Pure elliptic arc — flat base at y=Y2, curves up to (CX, Y2-RY)
      return pathPair(`M${X1} ${Y2} A${RX} ${RY} 0 0 0 ${X2} ${Y2} Z`)

    case 'circle':
      return [
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY}/>,
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>,
      ]

    case 'octagon': {
      const c = 55  // corner cut
      return polyPair(
        `${X1+c},${Y1} ${X2-c},${Y1} ${X2},${Y1+c} ${X2},${Y2-c} ` +
        `${X2-c},${Y2} ${X1+c},${Y2} ${X1},${Y2-c} ${X1},${Y1+c}`
      )
    }

    case 'triangle':
      return polyPair(`${CX},${Y1} ${X2},${Y2} ${X1},${Y2}`)

    case 'trapezoid':
      // Narrower at top (35px inset each side)
      return polyPair(`${X1+35},${Y1} ${X2-35},${Y1} ${X2},${Y2} ${X1},${Y2}`)

    case 'pentagon':
      // Regular pentagon, top vertex at (CX,Y1); other points pre-calculated for rx≈95
      return polyPair(`${CX},${Y1} ${X2},91 156,${Y2} 44,${Y2} ${X1},91`)

    case 'gothic':
      // Pointed arch — cubic bezier curves meeting sharply at top center
      return pathPair(
        `M${X1} ${Y2} L${X1} 160 C${X1} 50 90 ${Y1} ${CX} ${Y1} ` +
        `C110 ${Y1} ${X2} 50 ${X2} 160 L${X2} ${Y2} Z`
      )

    case 'eyebrow':
      // Very shallow arch — sides start at y=50, gentle curve peaks ~y=25
      return pathPair(`M${X1} ${Y2} L${X1} 50 Q${CX} ${Y1} ${X2} 50 L${X2} ${Y2} Z`)

    default:
      return rectPair()
  }
}

// ── Main component ─────────────────────────────────────────────────

export function ShapeOutlineDrawing({
  shape,
  transomPanes,
  widthIn,
  heightIn,
  uid,
}: {
  shape?: string
  transomPanes?: string
  widthIn?: number
  heightIn?: number
  uid: string
}) {
  const wL = widthIn  ? `${widthIn}"`  : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'

  const s    = (shape ?? '').trim()
  const sN   = s.toLowerCase().replace(/[\s-]+/g, '')
  const isCustom = sN === '' || sN.startsWith('custom')
  const [clipEl, fillEl] = shapeElements(s)
  const clipId = `so-${uid}`

  // Transom pane dividers — only for rectangle shape
  const isRect  = sN === '' || sN === 'rectangle' || sN === 'rectangular'
  const paneN   = transomPanes ? (parseInt(transomPanes) || 1) : 1
  const dividers = isRect && paneN > 1

  const panelW = (X2 - X1) / (dividers ? paneN : 1)

  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>

      <defs>
        <clipPath id={clipId}>{clipEl}</clipPath>
      </defs>

      {/* Shape fill + outline */}
      {fillEl}

      {/* Interior indicators — clipped to shape outline */}
      <g clipPath={`url(#${clipId})`}>
        {dividers
          ? Array.from({ length: paneN }, (_, i) => {
              const px1 = X1 + panelW * i
              const px2 = px1 + panelW
              return (
                <g key={i}>
                  {i > 0 && (
                    <line x1={px1} y1={Y1} x2={px1} y2={Y2} stroke={FRAME} strokeWidth="1.5"/>
                  )}
                  <line x1={px1+3} y1={Y1+3} x2={px2-3} y2={Y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
                  <line x1={px2-3} y1={Y1+3} x2={px1+3} y2={Y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
                </g>
              )
            })
          : <>
              <line x1={X1+5} y1={Y1+5} x2={X2-5} y2={Y2-5} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
              <line x1={X2-5} y1={Y1+5} x2={X1+5} y2={Y2-5} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
            </>
        }
      </g>

      {/* "Custom" label centred inside shape */}
      {isCustom && (
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
          fontFamily="system-ui" fontSize="16" fontWeight="700" fill={SEC}>
          Custom
        </text>
      )}

      {/* Standard window dimension lines */}
      <line x1="10" y1="226" x2="190" y2="226" stroke={SEC} strokeWidth="1"/>
      <line x1="10" y1="221" x2="10" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <line x1="190" y1="221" x2="190" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <text x="100" y="243" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1="10" x2="197" y2="220" stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1="10" x2="201" y2="10" stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1="220" x2="201" y2="220" stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y="119" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </svg>
  )
}
