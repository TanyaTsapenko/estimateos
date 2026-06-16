'use client'
import { C } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

export function BuilderHeader({ client, count, total, onBack }: {
  client?: string
  count: number
  total: number
  onBack: () => void
}) {
  return (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0, paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
      <div style={{ padding: '10px 16px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <EBIcon name="back" size={20} color={C.inkMid} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.inkSoft }}>New estimate</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client || 'Client'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{count} {count === 1 ? 'opening' : 'openings'}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
        </div>
      </div>
    </div>
  )
}

export function BottomBar({ onBack, onContinue, ctaLabel = 'Continue', backLabel = 'Back' }: {
  onBack: () => void
  onContinue: () => void
  ctaLabel?: string
  backLabel?: string
}) {
  return (
    <div style={{ flexShrink: 0, padding: '12px 16px', paddingBottom: 'max(26px, calc(12px + env(safe-area-inset-bottom)))', background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
      <button onClick={onBack} style={{ height: 48, padding: '0 20px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, color: C.inkMid, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        ← {backLabel}
      </button>
      <button onClick={onContinue} style={{ flex: 1, height: 48, borderRadius: 12, border: 'none', background: C.blue, color: '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(59,108,255,0.35)', cursor: 'pointer' }}>
        {ctaLabel} →
      </button>
    </div>
  )
}

export function SectionTitle({ icon, label, count, open, onToggle }: {
  icon: string; label: string; count?: number; open: boolean; onToggle: () => void
}) {
  return (
    <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 2px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: open ? C.blueSoft : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <EBIcon name={icon} size={16} color={open ? C.blue : C.inkMid} />
      </div>
      <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 800, color: C.ink, letterSpacing: '0.01em' }}>{label}</span>
      {count != null && <span style={{ fontSize: 11, fontWeight: 700, color: C.inkFaint }}>{count}</span>}
      <EBIcon name={open ? 'chev-u' : 'chev-d'} size={17} color={C.inkSoft} />
    </button>
  )
}
