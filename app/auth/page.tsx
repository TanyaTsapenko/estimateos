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
        <button className="social-btn" onClick={() => handleOAuth('apple')} disabled={loading}>Continue with Apple</button>
        <button className="social-btn" onClick={() => handleOAuth('google')} disabled={loading}>Continue with Google</button>
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
        <button className="social-btn" onClick={() => handleOAuth('apple')} disabled={loading}>Continue with Apple</button>
        <button className="social-btn" onClick={() => handleOAuth('google')} disabled={loading}>Continue with Google</button>
        <div className="login-link">
          Already have an account? <span onClick={() => go('login')}>Sign in</span>
        </div>
      </div>
    </div>
  )
}
