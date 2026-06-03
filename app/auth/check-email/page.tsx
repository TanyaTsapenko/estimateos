'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'

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
    <div style={{minHeight:'100vh', background:'#F4F4F2', display:'flex', flexDirection:'column'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'max(44px, calc(env(safe-area-inset-top) + 16px)) 24px 28px', textAlign:'center'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1, textAlign:'center'}}>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>Check your<br/>email</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>We&apos;ve sent a reset link to your inbox.</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px', textAlign:'center', flex:1}}>
        <p style={{fontSize:17, fontWeight:700, color:'#0A0E1A', marginBottom:8, marginTop:8}}>Reset link sent!</p>
        <p style={{fontSize:13, color:'#8892b0', lineHeight:1.55, marginBottom:16}}>
          We sent a link to<br/><span style={{color:'#0A0E1A', fontWeight:600}}>{email || 'your email'}</span><br/>Check your inbox and follow the instructions.
        </p>
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:12, color:'#8892b0', marginBottom:24}}>
          Didn&apos;t get it? <span onClick={handleResend} style={{color:'#2045B8', fontWeight:600, cursor:'pointer'}}>Resend email</span>
        </div>
        <button onClick={() => window.location.href = 'mailto:'}
          style={{width:'100%', background:'#2045B8', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          Open email app →
        </button>
        <button onClick={() => router.push('/auth/login')}
          style={{width:'100%', background:'none', border:'none', padding:11, fontSize:13, color:'#8892b0', cursor:'pointer', marginTop:6}}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}
