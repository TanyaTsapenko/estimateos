'use client'
import type { JSX } from 'react'
import { GLASS, FRAME } from '@/components/WindowDiagram'

export function glassColor(glassType?: string): string {
  switch (glassType) {
    case 'Frosted':  return 'rgba(255,255,255,0.85)'
    case 'Tinted':   return 'rgba(100,130,160,0.5)'
    case 'Obscure':  return 'rgba(200,210,220,0.9)'
    default:         return GLASS
  }
}

export function GlassPatternDefs({ uid, glassType, screen }: {
  uid: string; glassType?: string; screen?: string
}): JSX.Element | null {
  const hasFrost  = glassType === 'Frosted'
  const hasScreen = !!screen && screen !== 'None'
  if (!hasFrost && !hasScreen) return null
  return (
    <defs>
      {hasFrost && (
        <pattern id={`frost-${uid}`} x="0" y="0" width="6" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1.5" x2="6" y2="1.5" stroke="white" strokeWidth="0.8" opacity="0.6"/>
        </pattern>
      )}
      {hasScreen && (
        <pattern id={`mesh-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="4" y2="4" stroke="#94A0B4" strokeWidth="0.5"/>
          <line x1="4" y1="0" x2="0" y2="4" stroke="#94A0B4" strokeWidth="0.5"/>
        </pattern>
      )}
    </defs>
  )
}

export function GlassEffects({ x1, y1, x2, y2, glassType, screen, uid }: {
  x1: number; y1: number; x2: number; y2: number
  glassType?: string; screen?: string; uid: string
}): JSX.Element | null {
  const hasFrost  = glassType === 'Frosted'
  const hasScreen = !!screen && screen !== 'None'
  if (!hasFrost && !hasScreen) return null
  const w = x2 - x1, h = y2 - y1
  return (
    <>
      {hasFrost  && <rect x={x1} y={y1} width={w} height={h} fill={`url(#frost-${uid})`}/>}
      {hasScreen && <rect x={x1} y={y1} width={w} height={h} fill={`url(#mesh-${uid})`} opacity="0.4"/>}
    </>
  )
}

export function GridOverlay({ x1, y1, x2, y2, grid, grilleType, uid, frameColor }: {
  x1: number; y1: number; x2: number; y2: number
  grid?: string; grilleType?: string; uid: string; frameColor?: string
}) {
  const pat = grid ?? 'None'
  if (pat === 'None') return null

  const FR = frameColor ?? FRAME
  const isSDL = (grilleType ?? 'None') === 'SDL'
  const sw = isSDL ? 3 : 1.5
  const w = x2 - x1
  const h = y2 - y1
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  if (pat === 'Colonial') {
    return (
      <g stroke={FR} strokeWidth={sw} strokeLinecap="round">
        <line x1={mx}   y1={y1} x2={mx}   y2={y2}/>
        <line x1={x1}   y1={y1 + h / 3}   x2={x2} y2={y1 + h / 3}/>
        <line x1={x1}   y1={y1 + 2*h / 3} x2={x2} y2={y1 + 2*h / 3}/>
      </g>
    )
  }
  if (pat === 'Georgian') {
    return (
      <g stroke={FR} strokeWidth={sw} strokeLinecap="round">
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
      <g stroke={FR} strokeWidth={sw} strokeLinecap="round" fill="none">
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
      lines.push(<line key={`a${k}`} x1={x1 + d - ext} y1={y2 + ext} x2={x1 + d + ext} y2={y1 - ext}/>)
      lines.push(<line key={`b${k}`} x1={x1 + d - ext} y1={y1 - ext} x2={x1 + d + ext} y2={y2 + ext}/>)
    }
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x1} y={y1} width={w} height={h}/>
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`} stroke={FR} strokeWidth={sw} strokeLinecap="round">
          {lines}
        </g>
      </g>
    )
  }
  return null
}

export function DoorPanelLines({ x1, y1, x2, y2, doorStyle, frameColor }: {
  x1: number; y1: number; x2: number; y2: number; doorStyle: string; frameColor?: string
}) {
  if (!doorStyle || doorStyle === 'Flush') return null
  const FR = frameColor ?? FRAME
  const w = x2 - x1
  const h = y2 - y1
  const p = 10
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  if (doorStyle === '2-Panel') {
    const pw = w - 2*p
    const ph = (h - 2*p) / 2 - 4
    return (
      <g stroke={FR} strokeWidth={1} fill="none">
        <rect x={x1+p} y={y1+p}  width={pw} height={ph} rx="2"/>
        <rect x={x1+p} y={my+2}  width={pw} height={ph} rx="2"/>
      </g>
    )
  }
  if (doorStyle === '4-Panel') {
    const pw = (w - 2*p) / 2 - 3
    const ph = (h - 2*p) / 2 - 4
    return (
      <g stroke={FR} strokeWidth={1} fill="none">
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
      <g stroke={FR} strokeWidth={1} fill="none">
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
      <g stroke={FR} strokeWidth={1.5} fill="none">
        <rect x={x1+sp} y={y1+sp} width={w-2*sp} height={h-2*sp} rx="1"/>
      </g>
    )
  }
  return null
}
