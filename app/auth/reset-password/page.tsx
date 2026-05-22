'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8892b0', display: 'block', marginBottom: 6, fontFamily: F }

const PW_COLORS = ['#EF4444', '#F59E0B', '#FBBF24', '#22C55E']
const PW_LABELS = ['Weak', 'Fair', 'Good', 'Strong']

function pwScore(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const score = pwScore(password)

  async function handleUpdate() {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false); return }
    localStorage.removeItem('reset_email')
    router.push('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* HEADER */}
      <div style={{ background: HDR, padding: '52px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow top-right */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Glow bottom-left */}
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.push('/auth/login')} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Estimate<span style={{ color: '#3B6CFF' }}>OS</span></span>
        </div>

        {/* Icon box — lock */}
        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 6 }}>Create new password</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Your new password must be at least 8 characters.</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ background: '#F4F4F2', borderRadius: '20px 20px 0 0', marginTop: -20, flex: 1, padding: '28px 20px 48px', position: 'relative', zIndex: 2 }}>
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16, fontFamily: F }}>{error}</div>}

        <div style={{ marginBottom: 6 }}>
          <label style={lbl}>New Password</label>
          <input
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inp}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: score >= i ? PW_COLORS[score - 1] : '#E8E8E8', transition: 'background 0.3s' }} />
            ))}
          </div>
          {password ? (
            <div style={{ fontSize: 11, color: score > 0 ? PW_COLORS[score - 1] : '#9CA3AF', marginTop: 4, fontWeight: 600 }}>
              {PW_LABELS[score - 1] || ''}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Use letters, numbers and symbols</div>
          )}
        </div>

        <div style={{ marginBottom: 28, marginTop: 16 }}>
          <label style={lbl}>Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUpdate()}
            style={{ ...inp, borderColor: confirm && confirm !== password ? '#FECACA' : '#E8E8E8' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{ width: '100%', height: 52, background: loading ? '#8892b0' : '#2045B8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: F, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Updating…' : 'Update password →'}
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
