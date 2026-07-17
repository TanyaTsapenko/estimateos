'use client'
import { C } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

const FLOW_STEPS = ['Client', 'Openings', 'Details']

function Check({ size = 11, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4 10-10" />
    </svg>
  )
}

function PillStepper({ cur }: { cur: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: '#F4F6FB', padding: 5, borderRadius: 14, border: '1px solid rgba(15,23,42,0.08)' }}>
      {FLOW_STEPS.map((s, i) => {
        const done = i < cur, active = i === cur
        return (
          <button key={i} style={{
            flex: active ? 2 : 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            height: 42, padding: '0 10px', borderRadius: 10, border: 'none',
            background: active ? C.blue : 'transparent',
            color: active ? '#fff' : done ? C.blueDeep : '#8A94A6',
            boxShadow: active ? '0 4px 12px rgba(59,108,255,0.28)' : 'none',
            transition: 'flex .28s cubic-bezier(.4,0,.2,1), background .2s, color .2s',
            cursor: 'default',
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: active ? 'rgba(255,255,255,0.22)' : done ? C.blue : 'transparent',
              border: (!active && !done) ? '1.5px solid rgba(15,23,42,0.13)' : 'none',
              fontSize: 11, fontWeight: 600,
            }}>
              {done ? <Check /> : <span style={{ color: active ? '#fff' : '#B3BAC6' }}>{i + 1}</span>}
            </span>
            {active && (
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function BuilderHeader({ count, total, onBack, step, title = 'New estimate' }: {
  count: number
  total: number
  onBack: () => void
  step?: number
  title?: string
}) {
  return (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0, paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
      <div style={{ padding: '10px 16px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <EBIcon name="back" size={20} color={C.inkMid} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>{title}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{count} {count === 1 ? 'opening' : 'openings'}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
        </div>
      </div>
      {step != null && (
        <div style={{ padding: '0 16px 12px' }}>
          <PillStepper cur={step - 1} />
        </div>
      )}
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
