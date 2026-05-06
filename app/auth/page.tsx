'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Screen = 'splash' | 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [screen, setScreen] = useState<Screen>('splash')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handlePasswordChange(val: string) {
    setPassword(val)
    setPwStrength(val.length < 6 ? 20 : val.length < 8 ? 50 : val.length < 12 ? 75 : 100)
  }

  function go(s: Screen) { setScreen(s); setError('') }

  async function handleLogin() {
    setError('')
    if (!email.trim()) return setError('Email is required')
    if (!password) return setError('Password is required')
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(''); setLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (e) { setError(e.message); setLoading(false) }
  }

  async function handleRegister() {
    setError('')
    if (!firstName.trim()) return setError('First name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (!agreed) return setError('Please agree to Terms of Service')
    setLoading(true)
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding/company')
  }

  // ─── SPLASH ───
  if (screen === 'splash') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh" style={{ paddingBottom: 52 }}>
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">For Canadian Contractors 🇨🇦</div>
          <div className="h-big">Welcome</div>
          <div className="h-sub">Estimates · Contracts · E-Signature</div>
        </div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🪟</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--jet)', letterSpacing: '-.02em', marginBottom: 8 }}>
          Close jobs before<br />you leave the driveway.
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 36, maxWidth: 280 }}>
          All-in-one estimates, contracts and e-signatures on your phone.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button className="btn-next" onClick={() => go('register')}>Get Started — Free Trial →</button>
          <button className="btn-back" style={{ width: '100%' }} onClick={() => go('login')}>Sign In →</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 16 }}>14-day free trial · No credit card needed</div>
      </div>
    </div>
  )

  // ─── LOGIN ───
  if (screen === 'login') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => go('splash')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Welcome back</div>
          <div className="h-big">Sign In</div>
          <div className="h-sub">Good to have you back 👋</div>
        </div>
      </div>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        <div className="r1"><div className="f">
          <label>Email</label>
          <input type="email" placeholder="andriy@arcticclimate.ca" value={email} onChange={e => setEmail(e.target.value)} />
        </div></div>
        <div className="r1"><div className="f">
          <label>Password</label>
          <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
        </div></div>
        <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -4 }}>
          <span onClick={() => router.push('/auth/forgot')} style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, cursor: 'pointer' }}>
            Forgot password?
          </span>
        </div>
        <button className="btn-next" style={{ width: '100%', marginBottom: 14 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
        <div className="divider"><span>or continue with</span></div>
        <button onClick={() => handleOAuth('google')} disabled={loading}
          style={{ width: '100%', background: '#fff', border: '1.5px solid #DADCE0', borderRadius: 10, padding: '11px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>
        <div className="login-link">
          Don&apos;t have an account? <span onClick={() => go('register')}>Sign up free</span>
        </div>
      </div>
    </div>
  )

  // ─── REGISTER ───
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => go('splash')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Step 1 of 2 · Your account</div>
          <div className="h-big">Let&apos;s get<br />you started</div>
          <div className="h-sub">Takes 2 minutes · Free for 14 days</div>
        </div>
      </div>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        <div className="r2">
          <div className="f"><label>First Name</label>
            <input placeholder="Andriy" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
          <div className="f"><label>Last Name</label>
            <input placeholder="Koval" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
        </div>
        <div className="r1"><div className="f">
          <label>Email</label>
          <input type="email" placeholder="andriy@arcticclimate.ca" value={email} onChange={e => setEmail(e.target.value)} />
        </div></div>
        <div className="r1"><div className="f">
          <label>Password</label>
          <input type="password" placeholder="Min 8 characters" value={password} onChange={e => handlePasswordChange(e.target.value)} />
          <div className="pw-bar"><div className="pw-fill" style={{ width: pwStrength + '%' }} /></div>
        </div></div>
        <div className="terms-row">
          <div className={`chk${agreed ? ' on' : ''}`} onClick={() => setAgreed(!agreed)}>
            {agreed ? '✓' : ''}
          </div>
          <div className="terms-text">
            I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>. Data stored securely in Canada.
          </div>
        </div>
        <button className="btn-next" style={{ width: '100%', marginBottom: 14 }} onClick={handleRegister} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account →'}
        </button>
        <div className="divider"><span>or continue with</span></div>
        <button onClick={() => handleOAuth('google')} disabled={loading}
          style={{ width: '100%', background: '#fff', border: '1.5px solid #DADCE0', borderRadius: 10, padding: '11px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>
        <div className="login-link">
          Already have an account? <span onClick={() => go('login')}>Sign in</span>
        </div>
      </div>
    </div>
  )
}
