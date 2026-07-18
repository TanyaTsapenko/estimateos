'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div style={{minHeight:'100vh', background:'#F4F4F2', display:'flex', flexDirection:'column'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'max(44px, calc(env(safe-area-inset-top) + 16px)) 24px 28px'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1, textAlign:'center'}}>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>Create new<br/>password</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>Your new password must be at least 8 characters.</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px', flex:1}}>
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:12, boxSizing:'border-box'}} />
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:18, boxSizing:'border-box'}} />
        {error && <p style={{color:'#EF4444', fontSize:13, marginBottom:12}}>{error}</p>}
        <button onClick={handleUpdate} disabled={loading}
          style={{width:'100%', background:'#2563EB', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          {loading ? 'Updating...' : 'Update password →'}
        </button>
        <button onClick={() => router.push('/auth/login')}
          style={{width:'100%', background:'none', border:'none', padding:11, fontSize:13, color:'#8892b0', cursor:'pointer', marginTop:6}}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}
