'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: 11, fontSize: 14, fontFamily: F, color: '#0A1628', outline: 'none', boxSizing: 'border-box', display: 'block' }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8892b0', display: 'block', marginBottom: 6, fontFamily: F }

function IconWindowsDoors() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5"/>
      <line x1="9" y1="1.5" x2="9" y2="16.5"/>
      <line x1="1.5" y1="9" x2="16.5" y2="9"/>
    </svg>
  )
}
function IconRoofing() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,9 9,2 17,9"/>
      <polyline points="4,9 4,16 14,16 14,9"/>
    </svg>
  )
}
function IconSiding() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5"/>
      <line x1="1.5" y1="6.5" x2="16.5" y2="6.5"/>
      <line x1="1.5" y1="11.5" x2="16.5" y2="11.5"/>
    </svg>
  )
}
function IconFlooring() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1"/>
      <rect x="10" y="1.5" width="6.5" height="6.5" rx="1"/>
      <rect x="1.5" y="10" width="6.5" height="6.5" rx="1"/>
      <rect x="10" y="10" width="6.5" height="6.5" rx="1"/>
    </svg>
  )
}
function IconHVAC() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14 Q3 9 9 9 Q15 9 15 4"/>
      <circle cx="15" cy="4" r="1.5" fill="#2045B8" stroke="none"/>
      <circle cx="3" cy="14" r="1.5" fill="#2045B8" stroke="none"/>
    </svg>
  )
}
function IconOther() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#2045B8" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="9" cy="9" r="7.5"/>
      <path d="M5.5 9 Q6.5 6 9 6 Q11.5 6 12.5 9"/>
      <path d="M6.5 9 Q7.5 12 9 12 Q10.5 12 11.5 9"/>
    </svg>
  )
}

const NICHES = [
  { key: 'windows_doors', label: 'Windows & Doors', Icon: IconWindowsDoors, enabled: true },
  { key: 'roofing',       label: 'Roofing',          Icon: IconRoofing,      enabled: false },
  { key: 'siding',        label: 'Siding',            Icon: IconSiding,       enabled: false },
  { key: 'flooring',      label: 'Flooring',          Icon: IconFlooring,     enabled: false },
  { key: 'hvac',          label: 'HVAC',              Icon: IconHVAC,         enabled: false },
  { key: 'other',         label: 'Other trades',      Icon: IconOther,        enabled: false },
]

const HEARD_FROM = ['Google', 'Instagram', 'Word of mouth', 'YouTube', 'Trade show', 'Other']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [niche, setNiche] = useState('windows_doors')
  const [heardFrom, setHeardFrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleNext() {
    if (!companyName.trim()) return setError('Company name is required')
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const sanitize = (s: string) => s.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

    const { error: e } = await supabase.from('profiles').upsert({
      id: user.id,
      company_name: companyName.trim(),
      phone: phone.trim() || null,
      niche: sanitize(niche),
      heard_from: heardFrom ? sanitize(heardFrom) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (e) { setError(e.message); setLoading(false); return }
    router.push('/onboarding/welcome')
  }

  const hearAbout = heardFrom
  const setHearAbout = setHeardFrom
  const handleSubmit = handleNext

  return (
    <div style={{minHeight:'100vh', background:'#F4F4F2'}}>
      <div style={{position:'relative', overflow:'hidden', padding:'44px 24px 28px'}}>
        <div style={{position:'absolute', inset:0, background:'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'}} />
        <div style={{position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top:-60, right:-50}} />
        <div style={{position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom:-40, left:-20}} />
        <div style={{position:'relative', zIndex:1}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
            <span style={{fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:'0.09em'}}>YOUR BUSINESS</span>
            <div style={{display:'flex', gap:5}}>
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(59,108,255,0.4)'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'#3B6CFF'}} />
              <div style={{height:2, width:22, borderRadius:2, background:'rgba(255,255,255,0.12)'}} />
            </div>
          </div>
          <div style={{width:50, height:50, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
          </div>
          <p style={{fontSize:26, fontWeight:700, color:'#fff', lineHeight:1.12, marginBottom:7, letterSpacing:-0.2}}>Tell us about<br/>your business</p>
          <p style={{fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.55}}>We&apos;ll set up your workspace in seconds.</p>
        </div>
      </div>
      <div style={{padding:'22px 18px 28px'}}>
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Company Name *</label>
        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Northview Windows"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:12, boxSizing:'border-box'}} />
        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:6, textTransform:'uppercase'}}>Phone</label>
        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (403) 555-0000"
          style={{width:'100%', background:'#fff', border:'1px solid #E8E8E8', borderRadius:12, padding:'12px 14px', fontSize:15, color:'#0A0E1A', outline:'none', marginBottom:18, boxSizing:'border-box'}} />

        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:10, textTransform:'uppercase'}}>What do you install? *</label>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18}}>
          {[
            {id:'windows', name:'Windows & Doors', sub:'Residential & commercial', active:true,
              icon:<><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="2" y1="12" x2="22" y2="12"/></>},
            {id:'roofing', name:'Roofing', disabled:true,
              icon:<><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></>},
            {id:'siding', name:'Siding', disabled:true,
              icon:<><rect x="2" y="7" width="20" height="14" rx="1"/><path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/><line x1="2" y1="13" x2="22" y2="13"/></>},
            {id:'flooring', name:'Flooring', disabled:true,
              icon:<><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></>},
            {id:'hvac', name:'HVAC', disabled:true,
              icon:<><path d="M9.5 2A2.5 2.5 0 0112 4.5A2.5 2.5 0 019.5 7h-5A2.5 2.5 0 012 4.5A2.5 2.5 0 014.5 2h5z"/><path d="M14.5 8a2.5 2.5 0 012.5 2.5v7a2.5 2.5 0 01-5 0v-7A2.5 2.5 0 0114.5 8z"/><path d="M6 7v10a2 2 0 002 2h1"/></>},
            {id:'other', name:'Other trades', disabled:true,
              icon:<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>},
          ].map(item => (
            <div key={item.id} style={{background: item.active ? '#F0F4FF' : '#fff', border: `1.5px solid ${item.active ? '#2045B8' : '#E8E8E8'}`, borderRadius:14, padding:'14px 12px 12px', position:'relative', opacity: item.disabled ? 0.42 : 1, cursor: item.disabled ? 'default' : 'pointer'}}>
              <div style={{position:'absolute', top:10, right:10, width:15, height:15, borderRadius:'50%', border:`1.5px solid ${item.active ? '#2045B8' : '#D0D5DD'}`, background: item.active ? '#2045B8' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center'}}>
                {item.active && <div style={{width:6, height:6, borderRadius:'50%', background:'#fff'}} />}
              </div>
              <div style={{width:36, height:36, background: item.active ? '#dce6ff' : '#EEF2FF', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={item.disabled ? '#C0C0C0' : '#2045B8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
              </div>
              <p style={{fontSize:13, fontWeight:600, color: item.active ? '#2045B8' : item.disabled ? '#8892b0' : '#0A0E1A', marginBottom:2, paddingRight:18}}>{item.name}</p>
              {item.sub && <p style={{fontSize:11, color:'#8892b0'}}>{item.sub}</p>}
              {item.disabled && <span style={{display:'inline-block', fontSize:9, fontWeight:700, background:'#F0F0EE', color:'#C0C0C0', borderRadius:20, padding:'2px 7px', marginTop:4, letterSpacing:'0.03em'}}>COMING SOON</span>}
            </div>
          ))}
        </div>

        <label style={{display:'block', fontSize:10, fontWeight:700, color:'#8892b0', letterSpacing:'0.08em', marginBottom:10, textTransform:'uppercase'}}>How did you hear about us?</label>
        <div style={{display:'flex', flexWrap:'wrap', gap:7, marginBottom:18}}>
          {['Google','Instagram','Word of mouth','YouTube','Trade show','Other'].map(chip => (
            <div key={chip} onClick={() => setHearAbout(chip)}
              style={{fontSize:12, fontWeight:500, background: hearAbout===chip ? '#EEF2FF' : '#fff', border: `1.5px solid ${hearAbout===chip ? '#2045B8' : '#E8E8E8'}`, borderRadius:20, padding:'6px 12px', cursor:'pointer', color: hearAbout===chip ? '#2045B8' : '#353A3E'}}>
              {chip}
            </div>
          ))}
        </div>

        {error && <p style={{color:'#EF4444', fontSize:13, marginBottom:12}}>{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          style={{width:'100%', background:'#2045B8', border:'none', borderRadius:13, padding:15, fontSize:15, fontWeight:600, color:'#fff', cursor:'pointer'}}>
          {loading ? 'Setting up...' : 'Set up my workspace →'}
        </button>
      </div>
    </div>
  )
}
