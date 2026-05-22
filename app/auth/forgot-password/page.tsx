'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8892b0', display: 'block', marginBottom: 6, fontFamily: F }

export default function ForgotPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

  const handleSubmit = handleSend

  return (
    <div style={{minHeight:'100vh', background:'#F4F4F2'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'44px 24px 28px'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1, textAlign:'center'}}>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>Forgot your<br/>password?</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>Enter your email and we&apos;ll send you a reset link.</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px'}}>
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="james@northview.ca"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:18, boxSizing:'border-box'}} />
        {error && <p style={{color:'#EF4444', fontSize:13, marginBottom:12}}>{error}</p>}
        {message && <p style={{color:'#10B981', fontSize:13, marginBottom:12}}>{message}</p>}
        <button onClick={handleSubmit} disabled={loading}
          style={{width:'100%', background:'#2045B8', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          {loading ? 'Sending...' : 'Send reset link →'}
        </button>
        <button onClick={() => router.push('/auth/login')}
          style={{width:'100%', background:'none', border:'none', padding:11, fontSize:13, color:'#8892b0', cursor:'pointer', marginTop:6}}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}
