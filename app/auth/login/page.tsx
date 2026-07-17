'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail } from '@/lib/validation'

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

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [emailError, setEmailError] = useState('')

  async function handleLogin() {
    setError('')
    setEmailError('')
    if (!email.trim()) return setError('Email is required')
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address'); return }
    if (!password)     return setError('Password is required')
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleGoogle() {
    setError('')
    setEmailError('')
    if (loading) return
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
        {/* Blob */}
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -60, right: -60, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <Logo />
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Welcome back</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
              Sign in to your<br />
              <span style={{ color: '#2563EB' }}>account.</span>
            </h1>
          </div>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="login-email" style={lbl}>Email</label>
          <input
            id="login-email"
            type="email" value={email} placeholder="james@northview.ca"
            autoComplete="email"
            onChange={e => { setEmail(e.target.value); setEmailError('') }}
            onBlur={() => { if (email && !isValidEmail(email)) setEmailError('Please enter a valid email address') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={emailError ? { ...inp, border: '1px solid #EF4444' } : inp}
          />
          {emailError && <p style={{ color: '#EF4444', fontSize: 12, margin: '4px 0 0' }}>{emailError}</p>}
        </div>

        <div style={{ marginBottom: 6 }}>
          <label htmlFor="login-password" style={lbl}>Password</label>
          <input
            id="login-password"
            type="password" value={password} placeholder="Your password"
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inp}
          />
        </div>

        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <span
            onClick={() => router.push('/auth/forgot-password')}
            style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
          >
            Forgot password?
          </span>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: loading ? '#93C5FD' : '#2563EB', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            background: '#FFFFFF', border: '0.5px solid #E5E7EB',
            color: loading ? '#9CA3AF' : '#0A1628', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 24 }}>
          Don&apos;t have an account?{' '}
          <span onClick={() => router.push('/auth/register')} style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>
            Sign up free
          </span>
        </p>
      </div>
    </div>
  )
}
