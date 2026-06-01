'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Square, Home, Layers, LayoutGrid, Wind, MoreHorizontal } from 'lucide-react'

const F = 'system-ui, -apple-system, sans-serif'

const inp: React.CSSProperties = {
  width: '100%', height: 48, padding: '0 14px',
  background: '#FFFFFF', border: '0.5px solid #E5E7EB', borderRadius: 12,
  fontSize: 15, fontFamily: F, color: '#0A1628', outline: 'none',
  boxSizing: 'border-box', display: 'block',
}
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: '#9CA3AF',
  display: 'block', marginBottom: 7,
}

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

const NICHES: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: 'windows_doors', label: 'Windows & Doors', Icon: Square },
  { key: 'roofing',       label: 'Roofing',          Icon: Home },
  { key: 'siding',        label: 'Siding',            Icon: Layers },
  { key: 'flooring',      label: 'Flooring',          Icon: LayoutGrid },
  { key: 'hvac',          label: 'HVAC',              Icon: Wind },
  { key: 'other',         label: 'Other',             Icon: MoreHorizontal },
]

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 120 120">
          <g transform="translate(28 28) scale(1.0625)">
            <path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/>
            <path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/>
          </g>
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>ApexScale</span>
    </div>
  )
}

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2].map(n => (
        <div key={n} style={{
          height: 6, borderRadius: 99,
          width: step === n ? 28 : 16,
          background: step === n ? '#2563EB' : '#DBEAFE',
          transition: 'width 200ms ease, background 200ms ease',
        }} />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<1 | 2>(1)
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone]             = useState('')
  const [province, setProvince]       = useState('AB')
  const [trade, setTrade]             = useState('windows_doors')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  function goStep2() {
    if (!companyName.trim()) return setError('Company name is required')
    setError('')
    setStep(2)
  }

  async function finish() {
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const userId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

    const { error: e } = await supabase.from('profiles').upsert({
      id:           userId,
      company_name: companyName.trim(),
      phone:        phone.trim() || null,
      province:     province,
      trade:        trade,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'id' })

    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding/welcome')
  }

  const chevron = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: F, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', padding: '48px 24px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -60, right: -60, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <Logo />
            <StepDots step={step} />
          </div>

          {step === 1 ? (
            <>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Step 1 of 2</div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
                Tell us about your <span style={{ color: '#2563EB' }}>company.</span>
              </h1>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Step 2 of 2</div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
                What&apos;s your <span style={{ color: '#2563EB' }}>trade?</span>
              </h1>
            </>
          )}
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>

        {step === 1 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Company name</label>
              <input
                type="text" value={companyName} placeholder="Northview Windows"
                onChange={e => setCompanyName(e.target.value)}
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Phone</label>
              <input
                type="tel" value={phone} placeholder="+1 (403) 555-0000"
                onChange={e => setPhone(e.target.value)}
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={lbl}>Province</label>
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                style={{
                  ...inp, appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: chevron, backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center', backgroundSize: '16px',
                  paddingRight: 36, cursor: 'pointer',
                }}
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}

            <button
              onClick={goStep2}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: 'none',
                background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
              }}
            >
              Continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Niche grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {NICHES.map(({ key, label, Icon }) => {
                const active = trade === key
                return (
                  <button
                    key={key}
                    onClick={() => setTrade(key)}
                    style={{
                      background: active ? '#EFF6FF' : '#FFFFFF',
                      border: `0.5px solid ${active ? '#2563EB' : '#E5E7EB'}`,
                      borderRadius: 14, padding: '16px 14px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, cursor: 'pointer', fontFamily: F,
                      transition: 'border-color 150ms, background 150ms',
                    }}
                  >
                    <Icon size={22} color={active ? '#2563EB' : '#9CA3AF'} strokeWidth={1.7} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#2563EB' : '#0A1628' }}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>

            {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}

            <button
              onClick={finish} disabled={loading}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: 'none',
                background: loading ? '#93C5FD' : '#2563EB', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
              }}
            >
              {loading ? 'Setting up…' : 'Finish setup →'}
            </button>

            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%', height: 44, borderRadius: 12,
                background: 'transparent', border: 'none',
                color: '#6B7280', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: F, marginTop: 8,
              }}
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
