'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail, isValidPassword } from '@/lib/validation'

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

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [agreed, setAgreed]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [emailError, setEmailError]   = useState('')
  const [pwError, setPwError]         = useState('')

  const canSubmit = !loading && firstName.trim().length > 0 && isValidEmail(email) && isValidPassword(password) && agreed

  async function handleRegister() {
    setError(''); setEmailError(''); setPwError('')
    if (!firstName.trim())              return setError('First name is required')
    if (!email.trim())                  return setError('Email is required')
    if (!isValidEmail(email))           { setEmailError('Please enter a valid email address'); return }
    if (!isValidPassword(password))     { setPwError('Password must be at least 8 characters'); return }
    if (!agreed)                        return setError('Please agree to the Terms and Privacy Policy')
    setLoading(true)
    const { data: signUpData, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { first_name: firstName, last_name: lastName } },
    })
    if (e) { setError(e.message || 'Registration failed. Please try again.'); setLoading(false); return }

    if (signUpData.user?.id) {
      const profRes = await fetch('/api/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: signUpData.user.id, firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (!profRes.ok) console.error('[register] profile creation failed:', await profRes.text().catch(() => ''))
    }

    if (signUpData.session) {
      router.push('/onboarding')
    } else {
      router.push('/auth/check-email')
    }
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
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: F, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 24px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -60, right: -60, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <Logo />
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Create your account</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
              Free 14-day <span style={{ color: '#2563EB' }}>trial.</span> No card.
            </h1>
          </div>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>
        {/* Name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={lbl}>First name</label>
            <input type="text" value={firstName} placeholder="James" onChange={e => setFirstName(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Last name</label>
            <input type="text" value={lastName} placeholder="Morrison" onChange={e => setLastName(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Email</label>
          <input
            type="email" value={email} placeholder="james@northview.ca"
            onChange={e => { setEmail(e.target.value); setEmailError('') }}
            onBlur={() => { if (email && !isValidEmail(email)) setEmailError('Please enter a valid email address') }}
            style={emailError ? { ...inp, border: '1px solid #EF4444' } : inp}
          />
          {emailError && <p style={{ color: '#EF4444', fontSize: 12, margin: '4px 0 0' }}>{emailError}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Password</label>
          <input
            type="password" value={password} placeholder="Min 8 characters"
            onChange={e => { setPassword(e.target.value); setPwError('') }}
            onBlur={() => { if (password && !isValidPassword(password)) setPwError('Password must be at least 8 characters') }}
            style={pwError ? { ...inp, border: '1px solid #EF4444' } : inp}
          />
          {pwError && <p style={{ color: '#EF4444', fontSize: 12, margin: '4px 0 0' }}>{pwError}</p>}
        </div>

        {/* Terms checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
          <div
            onClick={() => setAgreed(!agreed)}
            style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              background: agreed ? '#2563EB' : '#FFFFFF',
              border: agreed ? 'none' : '0.5px solid #D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            {agreed && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="1.5 5 4 7.5 8.5 2.5"/>
              </svg>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
            By signing up you agree to our{' '}
            <span onClick={() => window.open('/terms', '_blank')} style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>Terms</span>
            {' '}and{' '}
            <span onClick={() => window.open('/privacy', '_blank')} style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <button
          onClick={handleRegister} disabled={!canSubmit}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: canSubmit ? '#2563EB' : '#93C5FD', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: F, boxShadow: canSubmit ? '0 4px 14px rgba(37,99,235,0.28)' : 'none',
          }}
        >
          {loading ? 'Creating account…' : 'Create account →'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        <button
          onClick={handleGoogle}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            background: '#FFFFFF', border: '0.5px solid #E5E7EB',
            color: '#0A1628', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: F,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 24 }}>
          Already have an account?{' '}
          <span onClick={() => router.push('/auth/login')} style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>
            Sign in
          </span>
        </p>
      </div>
    </div>
  )
}
