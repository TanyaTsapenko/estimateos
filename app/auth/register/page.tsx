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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const score = pwScore(password)

  async function handleRegister() {
    setError('')
    if (!firstName.trim()) return setError('First name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (!agreed) return setError('Please agree to the Terms of Service')
    setLoading(true)
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding')
  }

  async function handleGoogle() {
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (e) { setError(e.message); setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh', background:'#F4F4F2'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'44px 24px 28px'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1, textAlign:'center'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
            <span style={{fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:'0.09em'}}>YOUR ACCOUNT</span>
            <div style={{display:'flex', gap:5}}>
              <div style={{height:2, width:22, borderRadius:2, background:'#3B6CFF'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(255,255,255,0.12)'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(255,255,255,0.12)'}} />
            </div>
          </div>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>Let&apos;s get<br/>you started</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>Takes 2 minutes · Free for 14 days</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16}}>
          <div>
            <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>First Name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="James"
              style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', boxSizing:'border-box'}} />
          </div>
          <div>
            <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Last Name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Morrison"
              style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', boxSizing:'border-box'}} />
          </div>
        </div>
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="james@northview.ca"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:12, boxSizing:'border-box'}} />
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:16, boxSizing:'border-box'}} />
        <div style={{display:'flex', alignItems:'flex-start', gap:10, marginBottom:16}}>
          <div onClick={() => setAgreed(!agreed)}
            style={{width:17, height:17, borderRadius:5, background: agreed ? '#2045B8' : '#fff', border: agreed ? 'none' : '1.5px solid #D0D5DD', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
            {agreed && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2.5"/></svg>}
          </div>
          <p style={{fontSize:12, color:'#8892b0', lineHeight:1.5}}>
            I agree to the <span style={{color:'#2045B8', fontWeight:600}}>Terms of Service</span> and <span style={{color:'#2045B8', fontWeight:600}}>Privacy Policy</span>. Data stored securely in Canada.
          </p>
        </div>
        {error && <p style={{color:'#EF4444', fontSize:13, marginBottom:12}}>{error}</p>}
        <button onClick={handleRegister} disabled={loading}
          style={{width:'100%', background:'#2045B8', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          {loading ? 'Creating account...' : 'Create account →'}
        </button>
        <div style={{display:'flex', alignItems:'center', gap:10, margin:'13px 0'}}>
          <div style={{flex:1, height:1, background:'#E8E8E8'}} />
          <span style={{fontSize:11, color:'#C0C8D8'}}>or continue with</span>
          <div style={{flex:1, height:1, background:'#E8E8E8'}} />
        </div>
        <button onClick={handleGoogle}
          style={{width:'100%', background:'#fff', border:'1.5px solid #E8E8E8', borderRadius:13, padding:12, fontSize:14, fontWeight:500, color:'#353A3E', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
          <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <p style={{textAlign:'center', fontSize:12, color:'#8892b0', marginTop:13}}>
          Already have an account? <span onClick={() => router.push('/auth/login')} style={{color:'#2045B8', fontWeight:600, cursor:'pointer'}}>Sign in</span>
        </p>
      </div>
    </div>
  )
}
