'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Send as SendIcon, Plus, Check as CheckIcon, ChevronRight, CreditCard, CheckCircle } from 'lucide-react'
import BellButton from '@/components/BellButton'

interface Appointment {
  id: string; time: string; client: string; address: string; phone: string
  pillStatus: string; estimateId: string | null; duration: string
}
interface Metrics {
  revenueThisMonth: string; revenueDelta: string; revenueUp: boolean | null
  pipelineTotal: string; pipelineCount: string
  signedTodayTotal: string; signedTodayCount: number
  signaturesNeeded: number
  sparklines: { revenue: number[]; pipeline: number[]; signed: number[] }
}
interface AttentionItem {
  icon: React.ElementType; color: string; title: string; desc: string; cta: string
  id: string; actionType: 'reminder' | 'invoice'; address?: string
}
interface ActivityItem {
  dot: string; actor: string; verb: string; item: string; time: string; estimateId: string
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return (
    <svg width={64} height={22} viewBox="0 0 64 22" fill="none">
      <line x1="0" y1="11" x2="64" y2="11" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.25} />
    </svg>
  )
  const w = 64, h = 22
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  )
}

function KpiCard({ label, period, value, delta, deltaUp, accent, Icon, sparkData, empty }: {
  label: string; period: string; value: string; delta: string
  deltaUp?: boolean | null; accent: string; Icon: React.ElementType
  sparkData: number[]; empty?: boolean
}) {
  const deltaColor = deltaUp === true ? '#0F8A6B' : deltaUp === false ? '#DC2626' : '#64748B'
  const deltaPrefix = deltaUp === true ? '↑ ' : deltaUp === false ? '↓ ' : ''
  return (
    <div className="db-kpi-card" style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', flex: 1, overflow: 'hidden', minWidth: 150 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={accent} strokeWidth={1.7} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="db-kpi-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap' }}>{period}</div>
        </div>
        <Sparkline data={sparkData} color={accent} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginTop: 10 }}>
        {empty ? (
          <span style={{ fontSize: 15, fontWeight: 500, color: '#CBD5E1' }}>No data yet</span>
        ) : (
          <>
            <span className="db-kpi-value" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.6px', color: '#0A1628' }}>{value}</span>
            {delta && delta !== '—' && (
              <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: deltaColor }}>{deltaPrefix}{delta}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function GBBCard({ onClick, cardStyle }: { onClick: () => void; cardStyle?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: 20, background: 'linear-gradient(135deg, #2855e0 0%, #1a3fc4 100%)',
      padding: 20, position: 'relative', overflow: 'hidden', ...cardStyle,
    }}>
      {/* Glow blobs */}
      <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,150,255,0.45) 0%, transparent 70%)', top: -100, right: -80, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', bottom: -60, left: -30, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row: tag + NEW badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>Pricing Play · 01</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '3px 9px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>NEW</div>
        </div>

        {/* Big number + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>+ CA$ 420</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>avg ticket /<br/>per signed job</div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginBottom: 16 }}>
          Close more jobs by offering Good · Better · Best on every estimate.
        </div>

        {/* GBB preview box */}
        <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 12, padding: '16px 10px 10px', marginBottom: 16, position: 'relative' }}>
          {/* Floating badge above Better */}
          <div style={{ position: 'absolute', top: -11, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 99, padding: '3px 10px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>↓ 68% PICK</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>Good</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>CA$2.8k</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 5 }}>Better</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>CA$3.6k</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>Best</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>CA$4.4k</div>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClick}
            style={{ flex: 1, background: '#fff', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1a3fc4', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
            Try on next estimate →
          </button>
          <button onClick={onClick}
            style={{ width: 42, height: 42, flexShrink: 0, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function apptPillStyle(status: string): React.CSSProperties {
  if (status === 'IN PROGRESS') return {
    background: 'rgba(37,99,235,.28)', border: '1px solid rgba(255,255,255,.4)', color: '#fff',
  }
  if (status === 'AWAITING SIGN') return {
    background: 'rgba(217,119,6,.3)', border: '1px solid rgba(217,119,6,.55)', color: '#FCD34D',
  }
  return { background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)' }
}

function getTodayStr() {
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showDiscover, setShowDiscover] = useState(true)
  const [pricingMode, setPricingMode] = useState<string | null>(null)
  const router    = useRouter()
  const todayStr  = getTodayStr()
  const loadAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    supabase.from('profiles').select('pricing_mode').eq('id', user.id).single().then(({ data: prof }) => {
      console.log('pricing_mode from DB:', (prof as any)?.pricing_mode)
      if (prof) setPricingMode((prof as any).pricing_mode || 'single')
    })
    const meta = user.user_metadata
    if (meta?.full_name) setUserName(meta.full_name.split(' ')[0])
    else if (meta?.name) setUserName(meta.name.split(' ')[0])
    else if (user.email) setUserName(user.email.split('@')[0])
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const { data: appts } = await supabase
        .from('appointments').select('id,client_name,client_address,client_phone,appointment_time,status,estimate_id')
        .eq('user_id', user.id).eq('appointment_date', today).order('appointment_time', { ascending: true })
      if (appts) {
        setAppointments(appts.map((a: any) => {
          const t = a.appointment_time || ''
          const [h, m] = t.split(':').map(Number)
          const ampm = h >= 12 ? 'PM' : 'AM'
          const h12 = h % 12 || 12
          let pillStatus = 'CONSULTATION'
          if (a.status === 'completed') pillStatus = 'DONE'
          else if (a.status === 'in_progress') pillStatus = 'IN PROGRESS'
          else if (a.estimate_id) pillStatus = 'AWAITING SIGN'
          return {
            id: a.id,
            time: t ? `${h12}:${String(m).padStart(2,'0')} ${ampm}` : '--',
            client: a.client_name || 'Client',
            address: a.client_address || '',
            phone: a.client_phone || '',
            pillStatus,
            estimateId: a.estimate_id || null,
            duration: a.duration_minutes ? `${a.duration_minutes}m` : '60m',
          }
        }))
      }
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toISOString()
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()
      const [{ data: estAll }, { data: estSigned }, { data: estThisMonth }, { data: estLastMonth }] = await Promise.all([
        supabase.from('estimates').select('id,total,status,updated_at,estimate_number,client_name').eq('user_id', user.id),
        supabase.from('estimates').select('id,total,estimate_number,client_name').eq('user_id', user.id).eq('status', 'signed'),
        supabase.from('estimates').select('total').eq('user_id', user.id).gte('created_at', thisMonthStart),
        supabase.from('estimates').select('total').eq('user_id', user.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      ])
      const revenueThis = (estThisMonth||[]).reduce((s:number,e:any)=>s+(e.total||0),0)
      const revenueLast = (estLastMonth||[]).reduce((s:number,e:any)=>s+(e.total||0),0)
      const revenueDelta = revenueLast > 0 ? ((revenueThis-revenueLast)/revenueLast*100).toFixed(0) : null
      const openEstimates = (estAll||[]).filter((e:any)=>['draft','sent'].includes(e.status))
      const pipelineTotal = openEstimates.reduce((s:number,e:any)=>s+(e.total||0),0)
      const signedToday = (estAll||[]).filter((e:any)=>e.status==='signed'&&e.updated_at>=today+'T00:00:00')
      const signedTodayCount = signedToday.length
      const signedTodayTotal = signedToday.reduce((s:number,e:any)=>s+(e.total||0),0)
      const fmt = (n:number) => n===0?'CA$0':n>=1000?`CA$${(n/1000).toFixed(1)}k`:`CA$${n.toFixed(0)}`
      setMetrics({
        revenueThisMonth: fmt(revenueThis),
        revenueDelta: revenueDelta ? `${revenueDelta}%` : '—',
        revenueUp: revenueLast > 0 ? revenueThis >= revenueLast : null,
        pipelineTotal: fmt(pipelineTotal),
        pipelineCount: `${openEstimates.length} est.`,
        signedTodayTotal: fmt(signedTodayTotal),
        signedTodayCount,
        signaturesNeeded: estSigned?.length || 0,
        sparklines: {
          revenue: (estThisMonth||[]).map((e:any)=>e.total||0).slice(-8),
          pipeline: openEstimates.map((e:any)=>e.total||0).slice(-6),
          signed: (estAll||[]).filter((e:any)=>e.status==='signed').map((e:any)=>e.total||0).slice(-6),
        },
      })

      const attItems: AttentionItem[] = []
      // Signed estimate → green, invoice
      if (estSigned?.length) {
        attItems.push({
          icon: CheckIcon, color: '#059669',
          title: `${estSigned[0].client_name} estimate signed`,
          desc: `${estSigned[0].estimate_number} · Ready to invoice`,
          cta: 'Send invoice', id: estSigned[0].id, actionType: 'invoice',
        })
      }
      // Stale sent estimate → blue, reminder
      const threeDaysAgo = new Date(Date.now()-3*86400000).toISOString()
      const stale = (estAll||[]).filter((e:any)=>e.status==='sent'&&e.updated_at<=threeDaysAgo)
      if (stale.length) {
        const daysSince = Math.floor((Date.now() - new Date(stale[0].updated_at).getTime()) / 86400000)
        attItems.push({
          icon: SendIcon, color: '#2563EB',
          title: `${stale[0].client_name} hasn't opened ${stale[0].estimate_number}`,
          desc: `Sent ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`,
          cta: 'Send reminder', id: stale[0].id, actionType: 'reminder',
        })
      }
      setAttention(attItems)

      if (estAll) {
        const now = Date.now()
        const actTimeAgo = (iso:string) => { const d=Math.floor((now-new Date(iso).getTime())/86400000); const h=Math.floor((now-new Date(iso).getTime())/3600000); const m=Math.floor((now-new Date(iso).getTime())/60000); return m<60?`${m} min ago`:h<24?`${h}h ago`:d===1?'yesterday':`${d} days ago` }
        const dotMap:Record<string,string> = {signed:'#0F8A6B',sent:'#2563EB',draft:'#94A3B8',invoiced:'#7C3AED'}
        const verbMap:Record<string,string> = {signed:'signed',sent:'sent',draft:'created',invoiced:'invoiced'}
        setActivity((estAll as any[]).sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()).slice(0,5).map((e:any)=>({ dot: dotMap[e.status]||'#94A3B8', actor: 'You', verb: verbMap[e.status]||'updated', item: e.estimate_number||'—', time: actTimeAgo(e.updated_at), estimateId: e.id })))
      }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    const handleVisible = () => { if (!document.hidden) loadAll() }
    window.addEventListener('focus', loadAll)
    document.addEventListener('visibilitychange', handleVisible)
    return () => {
      window.removeEventListener('focus', loadAll)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [loadAll])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const signaturesNeeded = metrics?.signaturesNeeded ?? 0
  const doneCount  = appointments.filter(a => a.pillStatus === 'DONE').length
  const nextAppt   = appointments.find(a => a.pillStatus !== 'DONE') ?? null
  const otherAppts = appointments.filter(a => a.id !== nextAppt?.id)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
      background: '#F4F4F2', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif', minHeight: '100vh',
    }}>

      {/* ── DESKTOP HEADER ── */}
      {!isMobile && (
        <header style={{
          background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)',
          padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase' }}>WELCOME BACK</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#0A1628' }}>{userName || '—'}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 13, color: '#475569' }}>{todayStr}</span>
            </div>
          </div>
          <BellButton />
          <button onClick={() => router.push('/dashboard/estimates/new')} className="db-header-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#2045B8',
            color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 6px 16px -6px rgba(32,69,184,0.5)',
          }}>
            <Plus size={14} strokeWidth={1.7} />
            New estimate
          </button>
        </header>
      )}

      {/* ── MOBILE GRADIENT HEADER + HERO ── */}
      {isMobile && (
        <div style={{
          background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)',
          position: 'relative', overflow: 'hidden', paddingBottom: 28,
        }}>
          {/* Glow blobs */}
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.45) 0%, transparent 70%)', top: -130, right: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', bottom: -60, left: -50, pointerEvents: 'none' }} />

          {/* Welcome row */}
          <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 16px)) 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Welcome back</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginTop: 2 }}>{userName || '—'}</div>
            </div>
            <BellButton />
          </div>

          {/* Day + done count */}
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              YOUR DAY · {todayStr.toUpperCase()}
            </div>
            {appointments.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                {doneCount}/{appointments.length} done
              </div>
            )}
          </div>

          {/* Next appointment card */}
          <div style={{ margin: '14px 16px 0', position: 'relative', zIndex: 1 }}>
            {appointments.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>No visits today</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Tap + to add an appointment</div>
              </div>
            ) : nextAppt ? (
              <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.6px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '2px 8px', display: 'inline-block', textTransform: 'uppercase', marginBottom: 8 }}>NEXT</span>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px' }}>{nextAppt.time}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: nextAppt.address ? 8 : 0 }}>{nextAppt.client}</div>
                    {nextAppt.address && (
                      <a href={`https://maps.apple.com/?q=${encodeURIComponent(nextAppt.address)}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextAppt.address}</span>
                      </a>
                    )}
                  </div>
                  {nextAppt.phone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <a href={`tel:${nextAppt.phone}`} onClick={e => e.stopPropagation()}
                        style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>
                        </svg>
                      </a>
                      <a href={`sms:${nextAppt.phone}`} onClick={e => e.stopPropagation()}
                        style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </a>
                    </div>
                  ) : <div style={{ width: 40, flexShrink: 0 }} />}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>All visits complete for today!</div>
              </div>
            )}
          </div>

          {/* Other appointments */}
          {otherAppts.length > 0 && (
            <div style={{ margin: '10px 16px 0', position: 'relative', zIndex: 1 }}>
              {otherAppts.map(appt => {
                const isDone = appt.pillStatus === 'DONE'
                return (
                  <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', opacity: isDone ? 0.5 : 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', textDecoration: isDone ? 'line-through' : 'none', flexShrink: 0 }}>{appt.time}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.client}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
            {signaturesNeeded > 0 && (
              <button onClick={() => router.push('/dashboard/estimates')}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {signaturesNeeded} signature{signaturesNeeded !== 1 ? 's' : ''} pending
              </button>
            )}
            <button onClick={() => router.push('/dashboard/appointments')}
              style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: '#fff', color: '#2045B8', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={13} strokeWidth={2} />
              Open schedule
            </button>
          </div>
        </div>
      )}

      {/* ── DESKTOP HERO ── */}
      {!isMobile && (
        <div className="db-hero" style={{ margin: '20px 28px 0', borderRadius: 16, padding: 22, background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.4) 0%, transparent 70%)', top: -180, right: -120, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div className="db-hero-kicker" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
                YOUR DAY · {todayStr.toUpperCase()}
              </div>
              {appointments.length === 0 ? (
                <>
                  <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6, opacity: 0.65 }}>
                    No appointments today{signaturesNeeded > 0 ? ` · ${signaturesNeeded} signature${signaturesNeeded !== 1 ? 's' : ''} pending` : ''}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    {signaturesNeeded > 0 ? `${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : 'Add your first appointment to get started.'}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 6 }}>
                    <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', color: '#fff' }}>
                      {appointments.length} visit{appointments.length !== 1 ? 's' : ''} today
                    </div>
                    {signaturesNeeded > 0 && (
                      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', color: '#FCD34D', marginTop: 2 }}>
                        {signaturesNeeded} signature{signaturesNeeded !== 1 ? 's' : ''} pending
                      </div>
                    )}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {appointments.length} stop{appointments.length !== 1 ? 's' : ''} · first at {appointments[0].time}, last at {appointments[appointments.length - 1].time}.{signaturesNeeded > 0 ? ` ${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : ''}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="db-appt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {appointments.map(appt => (
              <div key={appt.id} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 500, marginTop: 4 }}>{appt.duration}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{appt.client}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{appt.address}</div>
                <div style={{ display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', alignSelf: 'flex-start', borderRadius: 999, textTransform: 'uppercase', ...apptPillStyle(appt.pillStatus) }}>{appt.pillStatus}</div>
                <button
                  onClick={() => appt.estimateId ? router.push(`/dashboard/estimates/${appt.estimateId}`) : router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client)}&client_address=${encodeURIComponent(appt.address)}`)}
                  style={{ marginTop: 10, padding: '6px 0', width: '100%', background: appt.estimateId ? 'rgba(5,150,105,.25)' : 'rgba(255,255,255,.18)', border: `1px solid ${appt.estimateId ? 'rgba(5,150,105,.5)' : 'rgba(255,255,255,.35)'}`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {appt.estimateId ? 'View EST →' : 'Start estimate'}
                </button>
              </div>
            ))}
            <div className="db-appt-add" style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 90 }}
              onClick={() => router.push('/dashboard/appointments/new')}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>+ add appointment</span>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <main className="db-main-body" style={{ padding: isMobile ? '16px 16px' : '20px 28px', paddingBottom: isMobile ? 'calc(88px + env(safe-area-inset-bottom))' : '32px', flex: 1 }}>

        {/* KPI row */}
        <div className="db-kpi-row" style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          <KpiCard
            label="REVENUE" period="This month"
            value={metrics?.revenueThisMonth ?? ''} delta={metrics?.revenueDelta ?? ''} deltaUp={metrics?.revenueUp ?? null}
            accent="#2045B8" Icon={CreditCard} sparkData={metrics?.sparklines.revenue ?? []} empty={!metrics}
          />
          <KpiCard
            label="IN PIPELINE" period="Open visits"
            value={metrics?.pipelineTotal ?? ''} delta={metrics?.pipelineCount ?? ''} deltaUp={null}
            accent="#7C3AED" Icon={SendIcon} sparkData={metrics?.sparklines.pipeline ?? []} empty={!metrics}
          />
          <KpiCard
            label="SIGNED TODAY" period="From visits"
            value={metrics?.signedTodayTotal ?? ''} delta={`${metrics?.signedTodayCount ?? 0} today`} deltaUp={metrics ? (metrics.signedTodayCount > 0 ? true : null) : null}
            accent="#0F8A6B" Icon={CheckIcon} sparkData={metrics?.sparklines.signed ?? []} empty={!metrics}
          />
        </div>

        {/* ── MOBILE SECTIONS ── */}
        {isMobile ? (
          <>
            {/* Needs Attention */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Needs Attention</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
                {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
              </div>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
                {attention.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                      <CheckCircle size={28} color="#10B981" strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 3 }}>All caught up!</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>No action items right now.</div>
                  </div>
                ) : attention.map((item, i) => (
                  <div key={i} style={{ padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', borderBottom: i < attention.length - 1 ? '1px solid #F1F5F9' : undefined }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color={item.color} strokeWidth={1.7} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                        else router.push(`/dashboard/estimates/${item.id}`)
                      }}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: item.color, border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {item.cta}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Live Feed */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Live Feed</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Recent activity</div>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
                {activity.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No activity yet. Send your first estimate to get started.
                  </div>
                ) : activity.map((item, i) => (
                  <div key={i} style={{ padding: '11px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: i < activity.length - 1 ? '1px solid #F1F5F9' : undefined, cursor: 'pointer' }}
                    onClick={() => router.push(`/dashboard/estimates/${item.estimateId}`)}>
                    <div style={{ width: 7, height: 7, borderRadius: 999, background: item.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: '#475569' }}>
                      <span style={{ fontWeight: 700, color: '#0A1628' }}>{item.actor}</span>
                      {' '}{item.verb}{' '}
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#2045B8' }}>{item.item}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</div>
                    <ChevronRight size={13} color="#CBD5E1" strokeWidth={2} />
                  </div>
                ))}
              </div>
            </section>

            {/* Discover */}
            {showDiscover && (
              <section>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>PLAYS FOR YOUR BUSINESS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0E1A', letterSpacing: '-0.5px', marginBottom: 14 }}>Discover</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <GBBCard onClick={() => router.push('/dashboard/gbb-onboarding')} cardStyle={{ width: '100%' }} />
                </div>
              </section>
            )}
          </>
        ) : (
          /* ── DESKTOP TWO-COLUMN LOWER ROW ── */
          <div className="db-lower-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Needs attention */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
              <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div className="db-panel-title" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#2045B8', textTransform: 'uppercase' }}>Needs Attention</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
                </div>
              </div>
              {attention.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <CheckCircle size={32} color="#10B981" strokeWidth={1.5} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>All caught up!</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>No action items right now.</div>
                </div>
              ) : attention.map((item, i) => (
                <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 11, alignItems: 'center', borderBottom: i < attention.length - 1 ? '1px solid #EEF0F4' : undefined }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={14} color={item.color} strokeWidth={1.7} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                      else router.push(`/dashboard/estimates/${item.id}`)
                    }}
                    style={{ padding: '5px 11px', fontSize: 12, fontWeight: 700, color: '#fff', background: item.color, border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.cta}
                  </button>
                </div>
              ))}
            </div>

            {/* Live Feed / Recent activity */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
              <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div className="db-panel-title" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#2045B8', textTransform: 'uppercase' }}>Live Feed</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Recent activity</div>
              </div>
              {activity.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  No activity yet. Send your first estimate to get started.
                </div>
              ) : activity.map((item, i) => (
                <div key={i} style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: i < activity.length - 1 ? '1px solid #EEF0F4' : undefined, cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/estimates/${item.estimateId}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, background: item.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: '#475569' }}>
                    <span style={{ fontWeight: 700, color: '#0A1628' }}>{item.actor}</span>
                    {' '}{item.verb}{' '}
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#2045B8' }}>{item.item}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</div>
                  <ChevronRight size={13} color="#CBD5E1" strokeWidth={2} />
                </div>
              ))}
            </div>

            {/* Discover */}
            {showDiscover && (
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <div style={{ padding: '0 4px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>PLAYS FOR YOUR BUSINESS</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0E1A', letterSpacing: '-0.4px' }}>Discover</div>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' } as React.CSSProperties}>
                  <GBBCard onClick={() => router.push('/dashboard/gbb-onboarding')} cardStyle={{ width: 320, flexShrink: 0 }} />
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  )
}
