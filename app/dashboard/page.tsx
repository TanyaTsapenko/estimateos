'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Send as SendIcon, Bell, Plus, Check as CheckIcon, ChevronRight, CreditCard, CheckCircle } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

interface Appointment {
  id: string; time: string; client: string; address: string
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
  id: string; actionType: 'reminder' | 'invoice' | 'directions'; address?: string
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
    <div className="db-kpi-card" style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', flex: 1 }}>
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
            <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: deltaColor }}>{deltaPrefix}{delta}</span>
          </>
        )}
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

function mobilePillStyle(status: string): React.CSSProperties {
  if (status === 'IN PROGRESS') return { background: 'rgba(37,99,235,0.1)', color: '#2563EB' }
  if (status === 'AWAITING SIGN') return { background: 'rgba(217,119,6,0.1)', color: '#D97706' }
  if (status === 'DONE') return { background: 'rgba(5,150,105,0.1)', color: '#059669' }
  return { background: '#F3F4F6', color: '#6B7280' }
}

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [unread] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const todayStr = getTodayStr()

  const loadAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const meta = user.user_metadata
    if (meta?.full_name) setUserName(meta.full_name.split(' ')[0])
    else if (meta?.name) setUserName(meta.name.split(' ')[0])
    else if (user.email) setUserName(user.email.split('@')[0])
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const { data: appts } = await supabase
        .from('appointments').select('id,client_name,client_address,appointment_time,status,estimate_id')
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
        pipelineCount: `${openEstimates.length} estimate${openEstimates.length !== 1 ? 's' : ''}`,
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
      // Upcoming visit → amber, directions
      if (appts) {
        const now = new Date()
        const ninetyMinsLater = new Date(now.getTime() + 5400000)
        const soonAppt = (appts as any[]).find((a: any) => {
          if (!a.appointment_time) return false
          const [h, m] = a.appointment_time.split(':').map(Number)
          const t = new Date(); t.setHours(h, m, 0, 0)
          return t >= now && t <= ninetyMinsLater
        })
        if (soonAppt) {
          const [apptH, apptM] = soonAppt.appointment_time.split(':').map(Number)
          const apptTime = new Date(); apptTime.setHours(apptH, apptM, 0, 0)
          const minsUntil = Math.round((apptTime.getTime() - now.getTime()) / 60000)
          const leaveTime = new Date(apptTime.getTime() - 30 * 60000)
          const lh = leaveTime.getHours(), lm = leaveTime.getMinutes()
          const leaveStr = `${lh % 12 || 12}:${String(lm).padStart(2,'0')} ${lh >= 12 ? 'PM' : 'AM'}`
          attItems.push({
            icon: Calendar, color: '#F59E0B',
            title: `Visit in ${minsUntil} min — ${soonAppt.client_name}`,
            desc: `Leave by ${leaveStr}`,
            cta: 'Directions', id: soonAppt.id, actionType: 'directions', address: soonAppt.client_address || '',
          })
        }
      }
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
        const timeAgo = (iso:string) => { const d=Math.floor((now-new Date(iso).getTime())/86400000); const h=Math.floor((now-new Date(iso).getTime())/3600000); const m=Math.floor((now-new Date(iso).getTime())/60000); return m<60?`${m} min ago`:h<24?`${h}h ago`:d===1?'yesterday':`${d} days ago` }
        const dotMap:Record<string,string> = {signed:'#0F8A6B',sent:'#2563EB',draft:'#94A3B8',invoiced:'#7C3AED'}
        const verbMap:Record<string,string> = {signed:'signed',sent:'sent',draft:'created',invoiced:'invoiced'}
        setActivity((estAll as any[]).sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()).slice(0,5).map((e:any)=>({ dot: dotMap[e.status]||'#94A3B8', actor: 'You', verb: verbMap[e.status]||'updated', item: e.estimate_number||'—', time: timeAgo(e.updated_at), estimateId: e.id })))
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
      background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', minHeight: '100vh',
    }}>

      {/* Top bar */}
      <header style={{
        background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)',
        padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase' }}>WELCOME BACK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <span className="db-greeting-name" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#0A1628' }}>{userName || '—'}</span>
            <span className="db-greeting-sep" style={{ color: '#CBD5E1' }}>·</span>
            <span className="db-greeting-date" style={{ fontSize: 13, color: '#475569' }}>{todayStr}</span>
          </div>
        </div>
        <button style={{
          position: 'relative', background: '#fff', border: '1px solid #E2E5EA',
          borderRadius: 9, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}>
          <Bell size={15} strokeWidth={1.7} color="#475569" />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, background: '#DC2626', borderRadius: 999, border: '1.5px solid #fff' }} />
          )}
        </button>
        <button onClick={() => router.push('/dashboard/estimates/new')} className="db-header-btn" style={{
          display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB',
          color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 6px 16px -6px rgba(37,99,235,0.5)',
        }}>
          <Plus size={14} strokeWidth={1.7} />
          New estimate
        </button>
      </header>

      {/* Body */}
      <main className="db-main-body" style={{ padding: '20px 28px 32px', flex: 1 }}>

        {/* Hero */}
        <div className="db-hero" style={{
          borderRadius: 16, padding: 22, marginBottom: 18,
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="db-hero-kicker" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', opacity: 0.7, textTransform: 'uppercase' }}>
                YOUR DAY · {todayStr.toUpperCase()}
              </div>
              {appointments.length === 0 ? (
                <>
                  <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6, opacity: 0.65 }}>
                    No appointments today{signaturesNeeded > 0 ? ` · ${signaturesNeeded} signature${signaturesNeeded !== 1 ? 's' : ''} pending` : ''}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    {signaturesNeeded > 0
                      ? `${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.`
                      : 'Add your first appointment to get started.'}
                  </div>
                </>
              ) : (
                <>
                  <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6 }}>
                    {appointments.length} visit{appointments.length !== 1 ? 's' : ''} today
                    {signaturesNeeded > 0 ? ` · ${signaturesNeeded} signature${signaturesNeeded !== 1 ? 's' : ''} pending` : ''}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {isMobile
                      ? `${appointments.length} stop${appointments.length !== 1 ? 's' : ''} · first at ${appointments[0].time}`
                      : `${appointments.length} stop${appointments.length !== 1 ? 's' : ''} · first at ${appointments[0].time}, last at ${appointments[appointments.length - 1].time}.${signaturesNeeded > 0 ? ` ${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : ''}`
                    }
                  </div>
                </>
              )}
            </div>
            <button className="db-hero-open-btn" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', flexShrink: 0,
            }} onClick={() => router.push('/dashboard/appointments')}>
              <Calendar size={13} strokeWidth={1.7} />
              Open schedule
            </button>
          </div>

          {/* Mobile: dashed add button only */}
          {isMobile && (
            <div style={{ marginTop: 14 }}>
              {appointments.slice(0, 3).map((appt, i) => (
                <div
                  key={appt.id}
                  onClick={() => appt.estimateId
                    ? router.push(`/dashboard/estimates/${appt.estimateId}`)
                    : router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client)}&client_address=${encodeURIComponent(appt.address)}`)
                  }
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                    borderTop: i === 0 ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ textAlign: 'right', flexShrink: 0, lineHeight: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {appt.time.replace(' AM','').replace(' PM','')}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>
                      {appt.time.includes('AM') ? 'AM' : 'PM'}
                    </span>
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: appt.pillStatus === 'IN PROGRESS' ? '#F59E0B'
                      : appt.pillStatus === 'AWAITING SIGN' ? '#FB923C'
                      : appt.pillStatus === 'DONE' ? '#34D399'
                      : appt.pillStatus === 'CONSULTATION' ? 'rgba(255,255,255,0.4)'
                      : '#93C5FD',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.client}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                      {appt.pillStatus === 'DONE' ? 'Completed' : appt.pillStatus === 'IN PROGRESS' ? 'In progress' : appt.pillStatus === 'AWAITING SIGN' ? 'Awaiting sign' : 'Consultation'} · {appt.address.split(',')[1]?.trim() || appt.address}
                    </div>
                  </div>
                  {(appt.pillStatus === 'IN PROGRESS') && (
                    <div style={{ background: '#F59E0B', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>NOW</div>
                  )}
                  {(appt.pillStatus === 'AWAITING SIGN') && (
                    <div style={{ background: '#F59E0B', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>SIGN</div>
                  )}
                </div>
              ))}
              <button
                onClick={() => router.push('/dashboard/appointments')}
                style={{
                  width: '100%', marginTop: 12, padding: '13px 0',
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {appointments.length > 3 ? `+${appointments.length - 3} more · ` : ''}View full schedule <span style={{ fontSize: 16 }}>›</span>
              </button>
            </div>
          )}

          {/* Desktop: appointment cards grid */}
          {!isMobile && (
            <div className="db-appt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
              {appointments.map(appt => (
                <div key={appt.id} style={{
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
                  borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 500, marginTop: 4 }}>{appt.duration}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{appt.client}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {appt.address}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.4px', padding: '2px 7px', alignSelf: 'flex-start',
                    borderRadius: 999, textTransform: 'uppercase',
                    ...apptPillStyle(appt.pillStatus),
                  }}>{appt.pillStatus}</div>
                  <button
                    onClick={() => appt.estimateId
                      ? router.push(`/dashboard/estimates/${appt.estimateId}`)
                      : router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client)}&client_address=${encodeURIComponent(appt.address)}`)
                    }
                    style={{
                      marginTop: 10, padding: '6px 0', width: '100%',
                      background: appt.estimateId ? 'rgba(5,150,105,.25)' : 'rgba(255,255,255,.18)',
                      border: `1px solid ${appt.estimateId ? 'rgba(5,150,105,.5)' : 'rgba(255,255,255,.35)'}`,
                      borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
                    }}
                  >
                    {appt.estimateId ? 'View EST →' : 'Start estimate'}
                  </button>
                </div>
              ))}
              <div className="db-appt-add" style={{
                background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.25)',
                borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', minHeight: 90,
              }} onClick={() => router.push('/dashboard/appointments/new')}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                  + add appointment
                </span>
              </div>
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="db-kpi-row" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <KpiCard
            label="REVENUE" period="This month"
            value={metrics?.revenueThisMonth ?? ''} delta={metrics?.revenueDelta ?? ''} deltaUp={metrics?.revenueUp ?? null}
            accent="#2563EB" Icon={CreditCard} sparkData={metrics?.sparklines.revenue ?? []} empty={!metrics}
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

        {/* Two-column lower row */}
        <div className="db-lower-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Needs attention */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
            <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
              <div className="db-panel-title" style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Needs attention</div>
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
              <div key={i} style={{
                padding: '12px 16px', display: 'flex', gap: 11, alignItems: 'center',
                borderBottom: i < attention.length - 1 ? '1px solid #EEF0F4' : undefined,
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: `${item.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <item.icon size={14} color={item.color} strokeWidth={1.7} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                </div>
                <button
                  onClick={() => {
                    if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                    else if (item.actionType === 'reminder') router.push(`/dashboard/estimates/${item.id}`)
                    else window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address || '')}`, '_blank')
                  }}
                  style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600, color: item.color,
                    background: `${item.color}14`, border: 'none', borderRadius: 7, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >{item.cta}</button>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
            <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
              <div className="db-panel-title" style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Recent activity</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Live feed</div>
            </div>
            {activity.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                No activity yet. Send your first estimate to get started.
              </div>
            ) : activity.map((item, i) => (
              <div key={i} style={{
                padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
                borderBottom: i < activity.length - 1 ? '1px solid #EEF0F4' : undefined, cursor: 'pointer',
              }}
                onClick={() => router.push(`/dashboard/estimates/${item.estimateId}`)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ width: 6, height: 6, borderRadius: 999, background: item.dot, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#0A1628' }}>{item.actor}</span>
                  {' '}{item.verb}{' '}
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#2563EB' }}>{item.item}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</div>
                <ChevronRight size={13} color="#CBD5E1" strokeWidth={2} />
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
