import React from 'react'

const BLADE_FRONT = 'M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z'
const BLADE_BACK  = 'M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z'

const FILLS = {
  light: { gradId: 'apexGradLight', stops: ['#2563EB', '#1D4ED8'], backFill: '#2563EB', backOpacity: 0.4 },
  dark:  { gradId: 'apexGradDark',  stops: ['#FFFFFF', '#93B4FB'], backFill: '#FFFFFF', backOpacity: 0.45 },
}

interface MarkProps { theme?: 'light' | 'dark' | 'solid' | 'mono'; size?: number; style?: React.CSSProperties }
interface LogoProps extends MarkProps { variant?: 'lockup' | 'mark' | 'appicon' }
interface AppIconProps { size?: number; radius?: number }

export function ApexMark({ theme = 'light', size = 40, style }: MarkProps) {
  if (theme === 'solid' || theme === 'mono') {
    const color = theme === 'solid' ? '#2563EB' : '#0B1220'
    const backOpacity = theme === 'solid' ? 0.45 : 0.4
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" style={style} aria-label="ApexScale">
        <path d={BLADE_BACK}  fill={color} opacity={backOpacity} />
        <path d={BLADE_FRONT} fill={color} />
      </svg>
    )
  }
  const f = FILLS[theme] || FILLS.light
  const uid = `${f.gradId}-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={style} aria-label="ApexScale">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={f.stops[0]} />
          <stop offset="1" stopColor={f.stops[1]} />
        </linearGradient>
      </defs>
      <path d={BLADE_BACK}  fill={f.backFill} opacity={f.backOpacity} />
      <path d={BLADE_FRONT} fill={`url(#${uid})`} />
    </svg>
  )
}

export function ApexAppIcon({ size = 120, radius }: AppIconProps) {
  const r = radius != null ? radius : Math.round(size * 0.234)
  const inset = size * 0.234
  const markSize = size - inset * 2
  const uid = `apexAppBg-${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="ApexScale">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={r} fill={`url(#${uid})`} />
      <g transform={`translate(${inset} ${inset})`}>
        <g transform={`scale(${markSize / 64})`}>
          <path d={BLADE_BACK}  fill="#FFFFFF" opacity="0.55" />
          <path d={BLADE_FRONT} fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  )
}

export function ApexScaleLogo({ variant = 'lockup', theme = 'light', size = 40, style }: LogoProps) {
  if (variant === 'mark')    return <ApexMark theme={theme} size={size} style={style} />
  if (variant === 'appicon') return <ApexAppIcon size={size} />

  const isDark = theme === 'dark'
  const inkColor   = isDark ? '#FFFFFF' : '#0B1220'
  const scaleColor = isDark ? 'rgba(255,255,255,0.8)' : '#0B1220'
  const markTheme  = isDark ? 'dark' : (theme === 'mono' ? 'mono' : 'light')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.4, ...style }}>
      <ApexMark theme={markTheme} size={size} />
      <span style={{
        fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
        fontSize: size * 0.78,
        letterSpacing: '-0.035em',
        color: inkColor,
        lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700 }}>Apex</span>
        <span style={{ fontWeight: 300, color: scaleColor }}>Scale</span>
      </span>
    </span>
  )
}

export default ApexScaleLogo
