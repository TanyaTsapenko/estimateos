'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setFirstName(user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there')
    })
  }, [])

  async function handleNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh', background:'#F4F4F2'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'44px 24px 28px', textAlign:'center'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
            <span style={{fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:'0.09em'}}>ALL DONE</span>
            <div style={{display:'flex', gap:5}}>
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(59,108,255,0.4)'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(59,108,255,0.4)'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'#3B6CFF'}} />
            </div>
          </div>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>You&apos;re all set!</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>Your ApexScale workspace is ready.<br/>Here&apos;s what you can do right away.</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px'}}>
        <div style={{background:'#fff', borderRadius:16, overflow:'hidden', marginBottom:20}}>
          {[
            {icon:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h5"/></>, title:'Create your first estimate', sub:'Takes less than 2 minutes on-site'},
            {icon:<><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8v4h8V3zM16 17v4H8v-4"/></>, title:'Set your price list', sub:'Customize rates for your openings'},
            {icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>, title:'Invite your team', sub:'Add estimators and set roles'},
          ].map((item, i, arr) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom: i < arr.length-1 ? '0.5px solid #F0F0F0' : 'none'}}>
              <div style={{width:34, height:34, background:'#EEF2FF', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
              </div>
              <div>
                <p style={{fontSize:14, fontWeight:600, color:'#0A0E1A'}}>{item.title}</p>
                <p style={{fontSize:12, color:'#8892b0', marginTop:1}}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{width:'100%', background:'#2045B8', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          Go to dashboard →
        </button>
        <button onClick={() => router.push('/dashboard')}
          style={{width:'100%', background:'none', border:'none', padding:11, fontSize:13, color:'#8892b0', cursor:'pointer', marginTop:6}}>
          Not right now
        </button>
      </div>
    </div>
  )
}
