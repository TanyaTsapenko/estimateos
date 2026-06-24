'use client'
import type { JSX } from 'react'
import { FRAME } from '@/components/WindowDiagram'

export function GridOverlay({ x1, y1, x2, y2, grid, grilleType, uid }: {
  x1: number; y1: number; x2: number; y2: number
  grid?: string; grilleType?: string; uid: string
}) {
  const pat = grid ?? 'None'
  if (pat === 'None') return null

  const isSDL = (grilleType ?? 'None') === 'SDL'
  const sw = isSDL ? 3 : 1.5
  const w = x2 - x1
  const h = y2 - y1
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  if (pat === 'Colonial') {
    return (
      <g stroke={FRAME} strokeWidth={sw} strokeLinecap="round">
        <line x1={mx}   y1={y1} x2={mx}   y2={y2}/>
        <line x1={x1}   y1={y1 + h / 3}   x2={x2} y2={y1 + h / 3}/>
        <line x1={x1}   y1={y1 + 2*h / 3} x2={x2} y2={y1 + 2*h / 3}/>
      </g>
    )
  }
  if (pat === 'Georgian') {
    return (
      <g stroke={FRAME} strokeWidth={sw} strokeLinecap="round">
        <line x1={x1 + w / 3}   y1={y1} x2={x1 + w / 3}   y2={y2}/>
        <line x1={x1 + 2*w / 3} y1={y1} x2={x1 + 2*w / 3} y2={y2}/>
        <line x1={x1} y1={y1 + h / 3}   x2={x2} y2={y1 + h / 3}/>
        <line x1={x1} y1={y1 + 2*h / 3} x2={x2} y2={y1 + 2*h / 3}/>
      </g>
    )
  }
  if (pat === 'Prairie') {
    const fi = Math.min(w * 0.25, h * 0.22)
    return (
      <g stroke={FRAME} strokeWidth={sw} strokeLinecap="round" fill="none">
        <rect x={x1 + fi} y={y1 + fi} width={w - 2*fi} height={h - 2*fi}/>
        {/* corner connectors — TL */}
        <line x1={x1 + fi} y1={y1}    x2={x1 + fi} y2={y1 + fi}/>
        <line x1={x1}      y1={y1+fi} x2={x1 + fi} y2={y1 + fi}/>
        {/* TR */}
        <line x1={x2 - fi} y1={y1}    x2={x2 - fi} y2={y1 + fi}/>
        <line x1={x2}      y1={y1+fi} x2={x2 - fi} y2={y1 + fi}/>
        {/* BL */}
        <line x1={x1 + fi} y1={y2}    x2={x1 + fi} y2={y2 - fi}/>
        <line x1={x1}      y1={y2-fi} x2={x1 + fi} y2={y2 - fi}/>
        {/* BR */}
        <line x1={x2 - fi} y1={y2}    x2={x2 - fi} y2={y2 - fi}/>
        <line x1={x2}      y1={y2-fi} x2={x2 - fi} y2={y2 - fi}/>
      </g>
    )
  }
  if (pat === 'Diamond') {
    const clipId = `gd-${uid}`
    const step = Math.round(Math.min(w, h) / 3.5)
    const ext = Math.max(w, h) + 10
    const lines: JSX.Element[] = []
    const count = Math.ceil((w + h) / step) + 3
    for (let k = -1; k <= count; k++) {
      const d = k * step
      // forward diagonal (/)
      lines.push(<line key={`a${k}`} x1={x1 + d - ext} y1={y2 + ext} x2={x1 + d + ext} y2={y1 - ext}/>)
      // back diagonal (\)
      lines.push(<line key={`b${k}`} x1={x1 + d - ext} y1={y1 - ext} x2={x1 + d + ext} y2={y2 + ext}/>)
    }
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x1} y={y1} width={w} height={h}/>
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`} stroke={FRAME} strokeWidth={sw} strokeLinecap="round">
          {lines}
        </g>
      </g>
    )
  }
  return null
}

export function DoorPanelLines({ x1, y1, x2, y2, doorStyle }: {
  x1: number; y1: number; x2: number; y2: number; doorStyle: string
}) {
  if (!doorStyle || doorStyle === 'Flush') return null
  const w = x2 - x1
  const h = y2 - y1
  const p = 10
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  if (doorStyle === '2-Panel') {
    const pw = w - 2*p
    const ph = (h - 2*p) / 2 - 4
    return (
      <g stroke={FRAME} strokeWidth={1} fill="none">
        <rect x={x1+p} y={y1+p}  width={pw} height={ph} rx="2"/>
        <rect x={x1+p} y={my+2}  width={pw} height={ph} rx="2"/>
      </g>
    )
  }
  if (doorStyle === '4-Panel') {
    const pw = (w - 2*p) / 2 - 3
    const ph = (h - 2*p) / 2 - 4
    return (
      <g stroke={FRAME} strokeWidth={1} fill="none">
        <rect x={x1+p}  y={y1+p} width={pw} height={ph} rx="2"/>
        <rect x={mx+3}  y={y1+p} width={pw} height={ph} rx="2"/>
        <rect x={x1+p}  y={my+2} width={pw} height={ph} rx="2"/>
        <rect x={mx+3}  y={my+2} width={pw} height={ph} rx="2"/>
      </g>
    )
  }
  if (doorStyle === '6-Panel') {
    const pw = (w - 2*p) / 2 - 3
    const ph = (h - 2*p) / 3 - 4
    return (
      <g stroke={FRAME} strokeWidth={1} fill="none">
        {([0, 1, 2] as const).flatMap(r => ([0, 1] as const).map(c => (
          <rect key={`${r}-${c}`}
            x={x1+p + c*(pw+6)}
            y={y1+p + r*(ph+6)}
            width={pw} height={ph} rx="2"
          />
        )))}
      </g>
    )
  }
  if (doorStyle === 'Shaker') {
    const sp = 14
    return (
      <g stroke={FRAME} strokeWidth={1.5} fill="none">
        <rect x={x1+sp} y={y1+sp} width={w-2*sp} height={h-2*sp} rx="1"/>
      </g>
    )
  }
  return null
}
