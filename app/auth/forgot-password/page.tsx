'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const GLOW = 'radial-gradient(ellipse at 100% 0%, rgba(59,108,255,0.35) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(32,69,184,0.2) 0%, transparent 55%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6, fontFamily: F }

export default function ForgotPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    setError('')
    if (!email.trim()) return setError('Email is required')
    setLoading(true)
    localStorage.setItem('reset_email', email.trim())
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth/reset-password',
    })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/auth/check-email')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* HEADER */}
      <div style={{ background: HDR, padding: '52px 24px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: GLOW, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button onClick={() => router.push('/auth/login')} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Estimate<span style={{ color: '#3B6CFF' }}>OS</span></span>
        </div>

        {/* Info circle icon */}
        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 14, background: 'rgba(59,108,255,0.18)', border: '1px solid rgba(59,108,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="8"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
          </svg>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 6 }}>Forgot your<br />password?</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Enter your email and we&apos;ll send you a reset link.</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ background: '#F4F4F2', borderRadius: '20px 20px 0 0', marginTop: -20, flex: 1, padding: '28px 20px 48px', position: 'relative', zIndex: 2 }}>
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16, fontFamily: F }}>{error}</div>}

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Email Address</label>
          <input
            type="email"
            placeholder="andriy@arcticclimate.ca"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={inp}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleSend}
            disabled={loading}
            style={{ width: '100%', height: 52, background: loading ? '#8892b0' : '#2045B8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: F, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Sending…' : 'Send reset link →'}
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            style={{ width: '100%', height: 48, background: 'transparent', color: '#8892b0', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: F, cursor: 'pointer' }}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}
