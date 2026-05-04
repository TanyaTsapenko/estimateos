'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwStrength, setPwStrength] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase sends the recovery token as a hash fragment — listen for the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  function handlePasswordChange(val: string) {
    setPassword(val)
    setPwStrength(val.length < 6 ? 20 : val.length < 8 ? 50 : val.length < 12 ? 75 : 100)
  }

  async function handleReset() {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div>
        <div className="h-title">
          <div className="h-eye">All done</div>
          <div className="h-big">Password updated!</div>
        </div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: 'popIn .4s ease' }}>🔐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>Password updated</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Redirecting you to your dashboard…</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">New password</div>
          <div className="h-big">Reset</div>
          <div className="h-sub">Choose a new password</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        {!sessionReady && (
          <div className="info-box" style={{ marginBottom: 16 }}>
            🔗 Loading your reset link… If nothing happens, click the link in your email again.
          </div>
        )}

        <div className="r1"><div className="f">
          <label>New Password</label>
          <input type="password" placeholder="Min 8 characters"
            value={password} onChange={e => handlePasswordChange(e.target.value)} />
          <div className="pw-bar"><div className="pw-fill" style={{ width: pwStrength + '%' }} /></div>
        </div></div>

        <div className="r1" style={{ marginTop: 10 }}><div className="f">
          <label>Confirm Password</label>
          <input type="password" placeholder="Repeat password"
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div></div>

        <button className="btn-next" style={{ width: '100%', marginTop: 16 }}
          onClick={handleReset} disabled={loading || !sessionReady}>
          {loading ? 'Updating…' : 'Set New Password →'}
        </button>

        <div className="login-link" style={{ marginTop: 16 }}>
          <span onClick={() => router.push('/auth')}>← Back to Sign In</span>
        </div>
      </div>
    </div>
  )
}
