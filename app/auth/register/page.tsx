'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const GLOW = 'radial-gradient(ellipse at 100% 0%, rgba(59,108,255,0.35) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(32,69,184,0.2) 0%, transparent 55%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6, fontFamily: F }

const PW_COLORS = ['#EF4444', '#F59E0B', '#FBBF24', '#22C55E']
const PW_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

function pwScore(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: i + 1 === step ? 20 : 8, height: 8, borderRadius: 4, background: i + 1 === step ? '#fff' : i + 1 < step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', transition: 'all 0.3s' }} />
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const score = pwScore(password)

  async function handleRegister() {
    setError('')
    if (!firstName.trim()) return setError('First name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (!agreed) return setError('Please agree to the Terms of Service')
    setLoading(true)
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding')
  }

  async function handleGoogle() {
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (e) { setError(e.message); setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* HEADER */}
      <div style={{ background: HDR, padding: '52px 24px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: GLOW, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/auth')} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Estimate<span style={{ color: '#3B6CFF' }}>OS</span></span>
          </div>
          <StepDots step={1} total={3} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Step 1 of 3 · Your account</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 6 }}>Let&apos;s get<br />you started</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Takes 2 minutes · Free for 14 days</div>
        </div>
      </div>

      {/* CARD */}
      <div style={{ background: '#F4F4F2', borderRadius: '20px 20px 0 0', marginTop: -20, flex: 1, padding: '28px 20px 48px', position: 'relative', zIndex: 2 }}>
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>First Name</label>
            <input placeholder="Andriy" value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Last Name</label>
            <input placeholder="Koval" value={lastName} onChange={e => setLastName(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Email</label>
          <input type="email" placeholder="andriy@arcticclimate.ca" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={lbl}>Password</label>
          <input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={inp} />
          {/* Strength bars */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: score >= i ? PW_COLORS[score - 1] : '#E8E8E8', transition: 'background 0.3s' }} />
            ))}
          </div>
          {password && (
            <div style={{ fontSize: 11, color: score > 0 ? PW_COLORS[score - 1] : '#9CA3AF', marginTop: 4, fontWeight: 600 }}>
              {PW_LABELS[score - 1] || ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0 20px' }}>
          <div
            onClick={() => setAgreed(!agreed)}
            style={{ width: 20, height: 20, borderRadius: 6, border: agreed ? 'none' : '1.5px solid #E8E8E8', background: agreed ? '#2045B8' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}>
            {agreed && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
            I agree to the <strong style={{ color: '#0A1628' }}>Terms of Service</strong> and <strong style={{ color: '#0A1628' }}>Privacy Policy</strong>. Data stored securely in Canada.
          </div>
        </div>

        <button onClick={handleRegister} disabled={loading} style={{ width: '100%', height: 52, background: loading ? '#8892b0' : '#2045B8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: F, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16 }}>
          {loading ? 'Creating account…' : 'Create Account →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, padding: '13px 16px', fontFamily: F, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
          Already have an account?{' '}
          <span onClick={() => router.push('/auth/login')} style={{ color: '#2045B8', fontWeight: 700, cursor: 'pointer' }}>Sign in</span>
        </div>
      </div>
    </div>
  )
}
