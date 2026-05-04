'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'

const TIERS = [
  { key: 'good',   label: 'Good',   mult: 1.0, desc: 'Base price' },
  { key: 'better', label: 'Better', mult: 1.2, desc: '+20% materials/labour' },
  { key: 'best',   label: 'Best',   mult: 1.4, desc: '+40% premium' },
]

export default function PriceListPage() {
  const router = useRouter()
  const [tier, setTier] = useState('better')
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(OPENING_TYPES).map(k => [k, true]))
  )

  const mult = TIERS.find(t => t.key === tier)?.mult || 1.2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-back" style={{ minWidth: 'unset', padding: '6px 10px' }}
              onClick={() => router.push('/dashboard')}>←</button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Your pricing</div>
          <div className="h-big">Price List</div>
          <div className="h-sub">Toggle what you offer · Prices auto-apply to estimates</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 8 }}>Default tier</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TIERS.map(t => (
            <div key={t.key}
              onClick={() => setTier(t.key)}
              style={{
                flex: 1, border: `1.5px solid ${tier === t.key ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer',
                background: tier === t.key ? 'rgba(217,119,6,.06)' : '#fff', transition: 'all .15s',
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tier === t.key ? '#92400e' : 'var(--jet)' }}>{t.label}</div>
              <div style={{ fontSize: 9, color: tier === t.key ? 'var(--amber)' : 'var(--ash)', marginTop: 2 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div className="sl" style={{ marginBottom: 10 }}>Opening types · toggle to include in estimates</div>

        <div className="tog-list">
          {Object.entries(OPENING_TYPES).map(([key, val]) => (
            <div key={key} className="tog-row">
              <div style={{ fontSize: 18 }}>{val.icon}</div>
              <div className="tog-info">
                <div className="tog-name">{val.name}</div>
                <div className="tog-sub">Base {fmtCAD(val.base + val.lab)} · {tier} {fmtCAD((val.base + val.lab) * mult)}</div>
              </div>
              <div className={`sw${enabled[key] ? ' on' : ''}`} onClick={() => setEnabled(p => ({ ...p, [key]: !p[key] }))}>
                <div className="swk" />
              </div>
            </div>
          ))}
        </div>

        <div className="info-box">
          💡 Prices shown are per-unit defaults. You can adjust quantities, size, and add-ons for each opening when creating an estimate.
        </div>

        <div style={{ height: 80 }} />
      </div>

      <BottomNav />
    </div>
  )
}
