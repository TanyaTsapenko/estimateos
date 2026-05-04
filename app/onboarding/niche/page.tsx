'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NICHES = [
  { key: 'hvac',    icon: '❄️', label: 'HVAC',           sub: 'Heating, Cooling' },
  { key: 'roofing', icon: '🏠', label: 'Roofing',        sub: 'Shingles, Metal' },
  { key: 'plumbing',icon: '🔧', label: 'Plumbing',       sub: 'Pipes, Fixtures' },
  { key: 'reno',    icon: '🔨', label: 'Renovation',     sub: 'Kitchen, Bath' },
  { key: 'elec',    icon: '⚡', label: 'Electrical',     sub: 'Panel, Wiring' },
  { key: 'wd',      icon: '🪟', label: 'Windows & Doors', sub: 'Replacement' },
]

export default function NichePage() {
  const router = useRouter()
  const supabase = createClient()
  const [selected, setSelected] = useState('wd')
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    await supabase.from('profiles').update({ trade: selected }).eq('id', user.id)
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="pills"><div className="pill done" /><div className="pill active" /></div>
        </div>
        <div className="h-title">
          <div className="h-eye">Step 2 of 2 · Your Trade</div>
          <div className="h-big">What&apos;s your trade?</div>
          <div className="h-sub">We&apos;ll customize your estimator</div>
        </div>
      </div>
      <div className="card">
        <div className="info-box">💡 You can add more trades later in Settings.</div>
        <div className="niche-grid">
          {NICHES.map(n => (
            <div key={n.key} className={`nc${selected === n.key ? ' sel' : ''}`} onClick={() => setSelected(n.key)}>
              <div className="ck">✓</div>
              <div style={{ fontSize: 26, marginBottom: 5 }}>{n.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--jet)' }}>{n.label}</div>
              <div style={{ fontSize: 9, color: 'var(--ash)', marginTop: 1 }}>{n.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="nav">
        <button className="btn-back" onClick={() => router.push('/onboarding/company')}>← Back</button>
        <button className="btn-next" onClick={handleStart} disabled={loading}>
          {loading ? 'Starting...' : 'Start Estimating →'}
        </button>
      </div>
    </div>
  )
}
