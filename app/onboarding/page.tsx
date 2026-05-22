'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8892b0', display: 'block', marginBottom: 6, fontFamily: F }

function IconWindowsDoors() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5"/>
      <line x1="9" y1="1.5" x2="9" y2="16.5"/>
      <line x1="1.5" y1="9" x2="16.5" y2="9"/>
    </svg>
  )
}
function IconRoofing() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,9 9,2 17,9"/>
      <polyline points="4,9 4,16 14,16 14,9"/>
    </svg>
  )
}
function IconSiding() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5"/>
      <line x1="1.5" y1="6.5" x2="16.5" y2="6.5"/>
      <line x1="1.5" y1="11.5" x2="16.5" y2="11.5"/>
    </svg>
  )
}
function IconFlooring() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1"/>
      <rect x="10" y="1.5" width="6.5" height="6.5" rx="1"/>
      <rect x="1.5" y="10" width="6.5" height="6.5" rx="1"/>
      <rect x="10" y="10" width="6.5" height="6.5" rx="1"/>
    </svg>
  )
}
function IconHVAC() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14 Q3 9 9 9 Q15 9 15 4"/>
      <circle cx="15" cy="4" r="1.5" fill="#2045B8" stroke="none"/>
      <circle cx="3" cy="14" r="1.5" fill="#2045B8" stroke="none"/>
    </svg>
  )
}
function IconOther() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="9" r="7.5"/>
      <path d="M5.5 9 Q6.5 6 9 6 Q11.5 6 12.5 9"/>
      <path d="M6.5 9 Q7.5 12 9 12 Q10.5 12 11.5 9"/>
    </svg>
  )
}

const NICHES = [
  { key: 'windows_doors', label: 'Windows & Doors', Icon: IconWindowsDoors, enabled: true },
  { key: 'roofing',       label: 'Roofing',          Icon: IconRoofing,      enabled: false },
  { key: 'siding',        label: 'Siding',            Icon: IconSiding,       enabled: false },
  { key: 'flooring',      label: 'Flooring',          Icon: IconFlooring,     enabled: false },
  { key: 'hvac',          label: 'HVAC',              Icon: IconHVAC,         enabled: false },
  { key: 'other',         label: 'Other trades',      Icon: IconOther,        enabled: false },
]

const HEARD_FROM = ['Google', 'Instagram', 'Word of mouth', 'YouTube', 'Trade show', 'Other']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [niche, setNiche] = useState('windows_doors')
  const [heardFrom, setHeardFrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleNext() {
    if (!companyName.trim()) return setError('Company name is required')
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const sanitize = (s: string) => s.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

    const { error: e } = await supabase.from('profiles').upsert({
      id: user.id,
      company_name: companyName.trim(),
      phone: phone.trim() || null,
      niche: sanitize(niche),
      heard_from: heardFrom ? sanitize(heardFrom) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding/welcome')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* HEADER */}
      <div style={{ background: HDR, padding: '52px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow top-right */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Glow bottom-left */}
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Top bar: logo + step indicator */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Estimate<span style={{ color: '#3B6CFF' }}>OS</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step 2 of 3</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === 2 ? '#3B6CFF' : i < 2 ? 'rgba(59,108,255,0.4)' : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Icon box */}
        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
          </svg>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 6 }}>Tell us about your business</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>We&apos;ll set up your workspace in seconds.</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ background: '#F4F4F2', borderRadius: '20px 20px 0 0', marginTop: -20, flex: 1, padding: '28px 20px 60px', position: 'relative', zIndex: 2 }}>

        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Company Name <span style={{ color: '#EF4444' }}>*</span></label>
          <input placeholder="Arctic Climate Solutions" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inp} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Phone</label>
          <input type="tel" placeholder="+1 (403) 555-0000" value={phone} onChange={e => setPhone(e.target.value)} style={inp} />
        </div>

        <label style={{ ...lbl, marginBottom: 12 }}>Your Trade</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {NICHES.map(({ key, label, Icon, enabled }) => {
            const selected = niche === key && enabled
            return (
              <div
                key={key}
                onClick={() => enabled && setNiche(key)}
                style={{
                  background: selected ? '#F0F4FF' : '#fff',
                  border: `1.5px solid ${selected ? '#2045B8' : '#E8E8E8'}`,
                  borderRadius: 13,
                  padding: '12px 12px 10px',
                  cursor: enabled ? 'pointer' : 'default',
                  opacity: enabled ? 1 : 0.42,
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {!enabled && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', background: '#F0F0EE', color: '#C0C0C0', borderRadius: 4, padding: '2px 5px' }}>
                    SOON
                  </div>
                )}
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: selected ? '#2045B8' : '#0A1628', lineHeight: 1.2 }}>{label}</div>
              </div>
            )
          })}
        </div>

        <label style={{ ...lbl, marginBottom: 10 }}>How did you hear about us?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {HEARD_FROM.map(opt => {
            const active = heardFrom === opt
            return (
              <button
                key={opt}
                onClick={() => setHeardFrom(active ? '' : opt)}
                style={{ background: active ? '#EEF2FF' : '#fff', border: `1.5px solid ${active ? '#2045B8' : '#E8E8E8'}`, borderRadius: 20, padding: '5px 13px', fontSize: 12, fontWeight: 500, color: active ? '#2045B8' : '#6B7280', cursor: 'pointer', fontFamily: F, transition: 'all 0.15s' }}>
                {opt}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={loading}
          style={{ width: '100%', height: 52, background: loading ? '#8892b0' : '#2045B8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: F, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
