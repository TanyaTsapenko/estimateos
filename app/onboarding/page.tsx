'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Square, Home, Layers, Grid3x3, Wind, MoreHorizontal } from 'lucide-react'

const NICHES = [
  { id: 'windows_doors', label: 'Windows & Doors', icon: Square },
  { id: 'roofing', label: 'Roofing', icon: Home },
  { id: 'siding', label: 'Siding', icon: Layers },
  { id: 'flooring', label: 'Flooring', icon: Grid3x3 },
  { id: 'hvac', label: 'HVAC', icon: Wind },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

const PROVINCES = ['BC','AB','SK','MB','ON','QC','NS','NB','PE','NL','YT','NT','NU']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [trade, setTrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = { width: '100%', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#0A1628', marginBottom: 14, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: 5, display: 'block' }

  async function handleFinish() {
    if (!trade) { setError('Please select your trade'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id?.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    const { error: err } = await supabase.from('profiles').upsert({
      id: userId,
      company_name: company,
      phone,
      province,
      trade,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/onboarding/welcome')
  }

  const dots = [1, 2]

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* HERO */}
      <div style={{ background: '#fff', padding: '40px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: 220, height: 220, borderRadius: '50%', background: '#2563EB', opacity: 0.07, position: 'absolute', top: -80, right: -60, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 120 120"><g transform="translate(28 28) scale(1.0625)"><path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/><path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/></g></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>ApexScale</span>
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
          {dots.map(d => (
            <div key={d} style={{ height: 3, borderRadius: 2, background: d === step ? '#2563EB' : '#DBEAFE', width: d === step ? 28 : 16, transition: 'all 0.3s' }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Step {step} of 2</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0A1628', lineHeight: 1.1, letterSpacing: '-0.6px' }}>
          {step === 1 ? <>Tell us about your <span style={{ color: '#2563EB' }}>company.</span></> : <>What&apos;s your <span style={{ color: '#2563EB' }}>trade?</span></>}
        </div>
      </div>
      {/* BODY */}
      <div style={{ background: '#F8F9FB', padding: 24 }}>
        {step === 1 ? (
          <>
            <label style={labelStyle}>Company name</label>
            <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Northview Windows & Doors" />
            <label style={labelStyle}>Phone number</label>
            <input style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(403) 555-0100" />
            <label style={labelStyle}>Province</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={province} onChange={e => setProvince(e.target.value)}>
              <option value="">Select province</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => setStep(2)} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Continue
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {NICHES.map(({ id, label, icon: Icon }) => (
                <div key={id} onClick={() => setTrade(id)} style={{ background: trade === id ? '#EFF6FF' : '#fff', border: `0.5px solid ${trade === id ? '#2563EB' : '#E5E7EB'}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer' }}>
                  <Icon size={22} color={trade === id ? '#2563EB' : '#9CA3AF'} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleFinish} disabled={loading} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Finish setup'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
