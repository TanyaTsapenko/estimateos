'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const GLOW = 'radial-gradient(ellipse at 100% 0%, rgba(59,108,255,0.35) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(32,69,184,0.2) 0%, transparent 55%)'

export default function CheckEmailPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    setEmail(localStorage.getItem('reset_email') || '')
  }, [])

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset-password',
    })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* HEADER */}
      <div style={{ background: HDR, padding: '52px 24px 64px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: GLOW, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, textAlign: 'left' }}>
          <button onClick={() => router.push('/auth/forgot-password')} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Estimate<span style={{ color: '#3B6CFF' }}>OS</span></span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 8 }}>Check your<br />email</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>We&apos;ve sent a reset link to your inbox.</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ background: '#F4F4F2', borderRadius: '20px 20px 0 0', marginTop: -20, flex: 1, padding: '40px 20px 48px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Large envelope icon */}
        <div style={{ width: 72, height: 72, borderRadius: 22, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: '#0A1628', marginBottom: 10, textAlign: 'center' }}>Reset link sent!</div>
        <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 32, maxWidth: 280 }}>
          We sent a link to <strong style={{ color: '#0A1628' }}>{email || 'your email'}</strong> — check your inbox and follow the instructions.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            onClick={() => window.open('message:')}
            style={{ width: '100%', height: 52, background: '#2045B8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: F, cursor: 'pointer', boxShadow: '0 4px 16px rgba(32,69,184,0.25)' }}>
            Open email app →
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            style={{ width: '100%', height: 48, background: 'transparent', color: '#8892b0', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: F, cursor: 'pointer' }}>
            Back to sign in
          </button>
        </div>

        <div style={{ marginTop: 28, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
          Didn&apos;t get it?{' '}
          <span
            onClick={handleResend}
            style={{ color: resent ? '#22C55E' : '#2045B8', fontWeight: 600, cursor: resending ? 'default' : 'pointer' }}>
            {resent ? 'Sent!' : resending ? 'Sending…' : 'Resend email'}
          </span>
        </div>
      </div>
    </div>
  )
}
