'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Square, Home, Layers, Grid3x3, Wind, MoreHorizontal, FileText, Table, Smartphone, HelpCircle } from 'lucide-react'

const NICHES = [
  { id: 'windows_doors', label: 'Windows & Doors', icon: Square },
  { id: 'roofing', label: 'Roofing', icon: Home },
  { id: 'siding', label: 'Siding', icon: Layers },
  { id: 'flooring', label: 'Flooring', icon: Grid3x3 },
  { id: 'hvac', label: 'HVAC', icon: Wind },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

const PROVINCES = ['BC','AB','SK','MB','ON','QC','NS','NB','PE','NL','YT','NT','NU']

const ESTIMATION_METHODS = [
  { id: 'paper',   label: 'Paper / pen',            sub: 'Writing estimates by hand',    icon: FileText   },
  { id: 'excel',   label: 'Excel / Google Sheets',  sub: 'Spreadsheet templates',        icon: Table      },
  { id: 'app',     label: 'Another app',             sub: 'Jobber, ServiceTitan, etc.',   icon: Smartphone },
  { id: 'nothing', label: 'Nothing yet',             sub: 'Just getting started',         icon: HelpCircle },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [trade, setTrade] = useState('')
  const [estimationMethod, setEstimationMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const inputStyle = { width: '100%', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#0A1628', marginBottom: 14, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: 5, display: 'block' }

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length < 4) return digits
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  function handlePhoneChange(raw: string) {
    setPhone(formatPhone(raw))
    setPhoneError('')
  }

  function isValidPhone(val: string) {
    return val.replace(/\D/g, '').length === 10
  }

  async function handleFinish() {
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
      estimation_method: estimationMethod,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/onboarding/welcome')
  }

  const dots = [1, 2, 3]

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* HERO */}
      <div style={{ background: '#fff', padding: 'max(40px, calc(env(safe-area-inset-top) + 16px)) 24px 28px', position: 'relative', overflow: 'hidden' }}>
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
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Step {step} of 3</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0A1628', lineHeight: 1.1, letterSpacing: '-0.6px' }}>
          {step === 1 ? <>Tell us about your <span style={{ color: '#2563EB' }}>company.</span></>
          : step === 2 ? <>What&apos;s your <span style={{ color: '#2563EB' }}>trade?</span></>
          : <>How do you currently <span style={{ color: '#2563EB' }}>estimate?</span></>}
        </div>
      </div>
      {/* BODY */}
      <div style={{ background: '#F8F9FB', padding: 24 }}>
        {step === 1 ? (
          <>
            <label style={labelStyle}>Company name</label>
            <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Northview Windows & Doors" />
            <label style={labelStyle}>Phone number</label>
            <input
              style={{ ...inputStyle, marginBottom: phoneError ? 4 : 14, border: phoneError ? '1px solid #EF4444' : '0.5px solid #E5E7EB' }}
              type="tel" value={phone} placeholder="(403) 555-0100"
              onChange={e => handlePhoneChange(e.target.value)}
              onBlur={() => { if (phone && !isValidPhone(phone)) setPhoneError('Please enter a valid Canadian phone number') }}
              maxLength={14}
            />
            {phoneError && <p style={{ color: '#EF4444', fontSize: 12, margin: '0 0 14px' }}>{phoneError}</p>}
            <label style={labelStyle}>Province</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={province} onChange={e => setProvince(e.target.value)}>
              <option value="">Select province</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => {
              if (phone && !isValidPhone(phone)) { setPhoneError('Please enter a valid Canadian phone number'); return }
              setStep(2)
            }} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Continue
            </button>
          </>
        ) : step === 2 ? (
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
            <button onClick={() => { if (!trade) { setError('Please select your trade'); return } setStep(3) }} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Continue
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {ESTIMATION_METHODS.map(({ id, label, sub, icon: Icon }) => (
                <div key={id} onClick={() => setEstimationMethod(id)}
                  style={{ background: estimationMethod === id ? '#EFF6FF' : '#fff', border: `0.5px solid ${estimationMethod === id ? '#2563EB' : '#E5E7EB'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={20} color={estimationMethod === id ? '#2563EB' : '#9CA3AF'} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleFinish} disabled={loading} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Finish setup'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
