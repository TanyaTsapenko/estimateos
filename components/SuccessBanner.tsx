'use client'
import { useEffect, useState } from 'react'

type Variant = 'success' | 'error' | 'neutral'
type Mode    = 'inline'  | 'floating'

export interface SuccessBannerProps {
  message:     string
  submessage?: string
  variant?:    Variant
  mode?:       Mode
  onDismiss?:  () => void
}

const PALETTE = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', icon: '#16A34A' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: '#DC2626' },
  neutral: { bg: '#0A1628', border: 'transparent', text: '#fff',     icon: '#64748B' },
} as const

export function SuccessBanner({
  message,
  submessage,
  variant    = 'success',
  mode       = 'floating',
  onDismiss,
}: SuccessBannerProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const p = PALETTE[variant]

  const posStyle: React.CSSProperties = mode === 'floating'
    ? {
        position:  'fixed',
        top:        16,
        left:       '50%',
        transform:  `translateX(-50%) translateY(${visible ? 0 : -10}px)`,
        zIndex:     1200,
        maxWidth:   440,
        width:      'calc(100% - 32px)',
        boxShadow:  '0 4px 16px rgba(0,0,0,0.12)',
      }
    : { transform: `translateY(${visible ? 0 : -6}px)`, marginBottom: 16 }

  return (
    <div style={{
      ...posStyle,
      background:    p.bg,
      border:        `1px solid ${p.border}`,
      borderRadius:  12,
      padding:       '12px 14px',
      display:       'flex',
      alignItems:    submessage ? 'flex-start' : 'center',
      gap:            10,
      opacity:        visible ? 1 : 0,
      transition:    'opacity 0.2s ease, transform 0.2s ease',
      boxSizing:     'border-box',
    }}>
      {variant !== 'neutral' && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: p.icon,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {variant === 'success'
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="#fff" strokeWidth="1.75" strokeLinecap="round"/></svg>
          }
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: p.text, lineHeight: 1.3 }}>{message}</div>
        {submessage && (
          <div style={{ fontSize: 12, color: p.text, opacity: 0.7, marginTop: 2 }}>{submessage}</div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: p.text, opacity: 0.5, lineHeight: 1, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
