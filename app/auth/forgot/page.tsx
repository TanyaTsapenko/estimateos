'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    if (!email.trim()) return setError('Enter your email address')
    setLoading(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (resetError) { setError(resetError.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="gh">
          <div className="h-top">
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <div className="h-title">
            <div className="h-eye">Check your inbox</div>
            <div className="h-big">Email sent!</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16, animation: 'popIn .4s ease' }}>📧</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>Reset link sent</div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 28, maxWidth: 280 }}>
            We sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
          </div>
          <button className="btn-next" style={{ maxWidth: 280, flex: 'none' }} onClick={() => router.push('/auth')}>
            Back to Sign In →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/auth')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Password reset</div>
          <div className="h-big">Forgot?</div>
          <div className="h-sub">We'll email you a reset link</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        <div className="info-box">📧 Check your inbox and spam folder after submitting.</div>
        <div className="r1">
          <div className="f">
            <label>Email</label>
            <input type="email" placeholder="andriy@arcticclimate.ca" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <button className="btn-next" style={{ width: '100%', marginTop: 8 }} onClick={handleReset} disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link →'}
        </button>
        <div className="login-link" style={{ marginTop: 16 }}>
          <span onClick={() => router.push('/auth')}>← Back to Sign In</span>
        </div>
      </div>
    </div>
  )
}
