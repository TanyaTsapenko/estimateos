'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const F = 'system-ui, -apple-system, sans-serif'

export default function ConfirmPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent]     = useState(false)

  useEffect(() => {
    setEmail(localStorage.getItem('confirm_email') || '')
  }, [])

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: F, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <div style={{ background: '#FFFFFF', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 24px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -60, right: -60, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          {/* Logo */}
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
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Almost there</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
              Check your <span style={{ color: '#2563EB' }}>email.</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>

        {/* Email icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
        </div>

        <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, textAlign: 'center', marginBottom: 8 }}>
          We sent a confirmation link to
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', textAlign: 'center', marginBottom: 24, wordBreak: 'break-all' }}>
          {email || 'your email address'}
        </p>
        <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
          Click the link to activate your account. Check your spam folder if you don&apos;t see it.
        </p>

        {resent && (
          <p style={{ color: '#16A34A', fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: 500 }}>
            ✓ Confirmation email resent
          </p>
        )}

        <button
          onClick={handleResend} disabled={resending}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: resending ? '#93C5FD' : '#2563EB', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
            fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)', marginBottom: 12,
          }}
        >
          {resending ? 'Sending…' : 'Resend confirmation email'}
        </button>

        <button
          onClick={() => router.push('/auth/login')}
          style={{
            width: '100%', height: 44, borderRadius: 12, border: 'none',
            background: 'transparent', color: '#6B7280',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
          }}
        >
          ← Back to sign in
        </button>

      </div>
    </div>
  )
}
