'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

  async function handleSend() {
    setError('')
    if (!email.trim()) return setError('Email is required')
    setLoading(true)
    localStorage.setItem('reset_email', email.trim())
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth/reset-password',
    })
    if (e) { setError(e.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

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
          <Logo />
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Reset your password</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
              We&apos;ll send you a <span style={{ color: '#2563EB' }}>reset link.</span>
            </h1>
          </div>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Email address</label>
          <input
            type="email" value={email} placeholder="james@northview.ca"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={inp}
          />
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}
        {sent  && (
          <p style={{ color: '#16A34A', fontSize: 13, marginBottom: 14, fontWeight: 500 }}>
            ✓ Check your email for a reset link
          </p>
        )}

        <button
          onClick={handleSend} disabled={loading || sent}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: (loading || sent) ? '#93C5FD' : '#2563EB', color: '#fff',
            fontSize: 15, fontWeight: 700,
            cursor: (loading || sent) ? 'not-allowed' : 'pointer',
            fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
          }}
        >
          {loading ? 'Sending…' : sent ? 'Link sent!' : 'Send reset link →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span
            onClick={() => router.push('/auth/login')}
            style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
          >
            ← Back to sign in
          </span>
        </div>
      </div>
    </div>
  )
}
