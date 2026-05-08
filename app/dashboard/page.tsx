'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'
import { Bell, Plus, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react'

interface Profile { first_name: string | null; company_name: string | null }
interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  status: string; total: number; created_at: string
}
interface Appointment {
  id: string; client_name: string; client_address: string | null
  appointment_date: string; appointment_time: string | null; status: string
}

function fmt12h(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function buildSparkline(vals: number[], w: number, h: number): { line: string; area: string } {
  if (vals.length < 2) {
    const mid = (h / 2).toFixed(1)
    return { line: `M 0,${mid} L ${w},${mid}`, area: `M 0,${h} L ${w},${h} Z` }
  }
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const pts = vals.map((v, i) => {
    const x = ((i / (vals.length - 1)) * w).toFixed(1)
    const y = (h - ((v - min) / range) * (h - 8) - 4).toFixed(1)
    return `${x},${y}`
  })
  const line = `M ${pts.join(' L ')}`
  return { line, area: `${line} L ${w},${h} L 0,${h} Z` }
}

const statusColor: Record<string, string> = { draft: '#6b7280', sent: '#2563eb', signed: '#16a34a', declined: '#dc2626', invoiced: '#9333ea' }
const statusBg: Record<string, string> = { draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(22,163,74,.1)', declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)' }
const statusDot: Record<string, string> = { draft: '#9ca3af', sent: '#3b82f6', signed: '#22c55e', declined: '#ef4444', invoiced: '#a855f7' }

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Client-side date so no SSR mismatch
  const [todayStr, setTodayStr] = useState('')
  const [todayLabel, setTodayLabel] = useState('')
  useEffect(() => {
    const d = new Date()
    const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate()
    setTodayStr(`${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setTodayLabel(d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const [{ data: prof }, { data: ests }, { data: appts }] = await Promise.all([
        supabase.from('profiles').select('first_name, company_name').eq('id', user.id).single(),
        supabase.from('estimates')
          .select('id, estimate_number, client_name, status, total, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('appointments')
          .select('id, client_name, client_address, appointment_date, appointment_time, status')
          .eq('user_id', user.id)
          .gte('appointment_date', today).lte('appointment_date', today)
          .order('appointment_time').limit(5),
      ])
      setProfile(prof)
      setEstimates(ests || [])
      setTodayAppts(appts || [])
      setLoading(false)
    }
    load()
  }, [])

  // ── STATS ───────────────────────────────────────
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const thisMonthSigned = estimates.filter(e => e.status === 'signed' && e.created_at >= thisMonthStart)
  const lastMonthSigned = estimates.filter(e => e.status === 'signed' && e.created_at >= lastMonthStart && e.created_at <= lastMonthEnd)
  const revenue     = thisMonthSigned.reduce((s, e) => s + (e.total || 0), 0)
  const lastRevenue = lastMonthSigned.reduce((s, e) => s + (e.total || 0), 0)
  const revChange   = lastRevenue > 0 ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : null

  const pipeline      = estimates.filter(e => ['draft', 'sent'].includes(e.status))
  const pipelineTotal = pipeline.reduce((s, e) => s + (e.total || 0), 0)

  const dueToInvoice = estimates.filter(e => e.status === 'signed')
  const dueTotal     = dueToInvoice.reduce((s, e) => s + (e.total || 0), 0)

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
  const followUpDue  = estimates.filter(e => e.status === 'sent' && e.created_at < threeDaysAgo)

  // Sparkline data
  const revSpark = thisMonthSigned.length >= 2
    ? thisMonthSigned.slice(-8).map(e => e.total)
    : [0, lastRevenue * 0.6, lastRevenue * 0.8, revenue]
  const pipeSpark = pipeline.length >= 2
    ? pipeline.slice(0, 8).map(e => e.total).reverse()
    : [0, pipelineTotal * 0.5, pipelineTotal * 0.7, pipelineTotal]
  const dueSpark = dueToInvoice.length >= 2
    ? dueToInvoice.slice(0, 8).map(e => e.total).reverse()
    : [0, dueTotal * 0.4, dueTotal * 0.7, dueTotal]

  // Needs attention items
  const needsItems = [
    ...followUpDue.slice(0, 3).map(e => {
      const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000)
      return { type: 'reminder' as const, id: e.id, label: e.client_name || 'Client', sub: `${e.estimate_number} · Sent ${days}d ago`, cta: 'Send reminder', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' }
    }),
    ...dueToInvoice.slice(0, 2).map(e => ({ type: 'invoice' as const, id: e.id, label: e.client_name || 'Client', sub: `${e.estimate_number} · ${fmtCAD(e.total)}`, cta: 'Create invoice', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' })),
    ...todayAppts.slice(0, 2).map(a => ({ type: 'appt' as const, id: a.id, label: a.client_name, sub: `${fmt12h(a.appointment_time) || 'Time TBD'} · ${a.client_address || 'Address TBD'}`, cta: 'Get directions', color: '#2045B8', bg: 'rgba(32,69,184,.1)' })),
  ].slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── MOBILE HEADER ── */}
      <div className="gh mobile-only">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          <button onClick={() => router.push('/dashboard/estimates/new')}
            style={{ background: '#3B6CFF', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New
          </button>
        </div>
        <div className="h-title">
          <div className="h-eye">Welcome back</div>
          <div className="h-big">{loading ? '…' : profile?.first_name || 'Contractor'}</div>
          <div className="h-sub">{todayLabel}</div>
        </div>
      </div>

      {/* ── DESKTOP TOP BAR ── */}
      <div className="db-topbar">
        <div className="logo-text" style={{ fontSize: 20, minWidth: 180 }}>
          Estimate<span style={{ color: '#3B6CFF' }}>OS</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 3 }}>
            Welcome back
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>
            {loading ? '…' : profile?.first_name || 'Contractor'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
            {todayLabel}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', cursor: 'pointer', padding: 4 }} onClick={() => router.push('/dashboard/estimates')}>
            <Bell size={20} color="rgba(255,255,255,.55)" />
            {followUpDue.length > 0 && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {followUpDue.length}
              </div>
            )}
          </div>
          <button onClick={() => router.push('/dashboard/estimates/new')}
            style={{ background: '#3B6CFF', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> New estimate
          </button>
        </div>
      </div>

      {/* ── MOBILE CONTENT ── */}
      <div className="dash-bg screen-enter mobile-only">
        <div className="stats">
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">💰</div><div className="stat-tr">Month</div></div>
            <div className="stat-val">{loading ? '…' : fmtCAD(revenue)}</div>
            <div className="stat-lbl">Revenue</div>
          </div>
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">📋</div><div className="stat-tr">Open</div></div>
            <div className="stat-val">{loading ? '…' : pipeline.length}</div>
            <div className="stat-lbl">In pipeline</div>
          </div>
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">✍️</div><div className="stat-tr">Signed</div></div>
            <div className="stat-val">{loading ? '…' : dueToInvoice.length}</div>
            <div className="stat-lbl">Due to invoice</div>
          </div>
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">📅</div><div className="stat-tr">Today</div></div>
            <div className="stat-val">{loading ? '…' : todayAppts.length}</div>
            <div className="stat-lbl">Appointments</div>
          </div>
        </div>
        <div className="sl2" style={{ marginTop: 8 }}>
          <div className="sl2-t">Recent estimates</div>
          <div className="sl2-a" onClick={() => router.push('/dashboard/estimates')}>View all →</div>
        </div>
        {!loading && estimates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🪟</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--jet)', marginBottom: 6 }}>No estimates yet</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 18 }}>Create your first estimate and close jobs before you leave the driveway.</div>
            <button className="btn-next" style={{ maxWidth: 220, margin: '0 auto' }} onClick={() => router.push('/dashboard/estimates/new')}>
              Create estimate →
            </button>
          </div>
        )}
        {estimates.slice(0, 6).map(e => (
          <div key={e.id} className="ec" onClick={() => router.push(`/dashboard/estimates/${e.id}`)}>
            <div className="ec-top">
              <div>
                <div className="ec-name">{e.client_name || 'Client TBD'}</div>
                <div className="ec-date">{e.estimate_number} · {new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</div>
              </div>
              <span className="badge" style={{ color: statusColor[e.status] || '#6b7280', background: statusBg[e.status] || 'rgba(107,114,128,.1)' }}>
                {e.status.toUpperCase()}
              </span>
            </div>
            <div className="ec-bot">
              <div className="ec-tags" />
              <div className="ec-amt">{fmtCAD(e.total || 0)}</div>
            </div>
          </div>
        ))}
        <div style={{ height: 90 }} />
      </div>

      {/* ── DESKTOP CONTENT ── */}
      <div className="db-main">

        {/* ── HERO: YOUR DAY ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1A2744 0%, #2045B8 55%, #3B6CFF 100%)',
          borderRadius: 20, padding: '24px 28px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -70, left: 180, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>
                YOUR DAY · {todayLabel.toUpperCase()}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 6 }}>
                {loading ? '…' : (
                  <>
                    {todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''}
                    {followUpDue.length > 0 && (
                      <span style={{ fontSize: 20, color: 'rgba(255,255,255,.7)' }}>
                        {' '}· {followUpDue.length} follow-up{followUpDue.length !== 1 ? 's' : ''} due
                      </span>
                    )}
                  </>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>
                {todayAppts.length > 0 ? 'Here\'s what\'s on your schedule today.' : 'No appointments today — have a great day!'}
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/appointments')}
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,.35)', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Calendar size={13} /> Open calendar
            </button>
          </div>

          {/* Appointment cards */}
          <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
            {todayAppts.slice(0, 3).map(a => (
              <div key={a.id} onClick={() => router.push('/dashboard/appointments')}
                style={{ background: 'rgba(255,255,255,.11)', borderRadius: 14, padding: '14px 16px', minWidth: 200, flexShrink: 0, cursor: 'pointer', border: '1px solid rgba(255,255,255,.14)', transition: 'background .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Clock size={10} color="rgba(255,255,255,.45)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{fmt12h(a.appointment_time) || 'Time TBD'}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{a.client_name}</div>
                {a.client_address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <MapPin size={9} color="rgba(255,255,255,.35)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>{a.client_address}</span>
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'inline-block', background: a.status === 'completed' ? 'rgba(22,163,74,.3)' : 'rgba(59,108,255,.3)', border: a.status === 'completed' ? '1px solid rgba(22,163,74,.4)' : '1px solid rgba(59,108,255,.4)', borderRadius: 6, padding: '2px 8px', fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: a.status === 'completed' ? '#86efac' : '#93bbff' }}>
                  {a.status === 'new_lead' ? 'ON-SITE QUOTE' : a.status === 'scheduled' ? 'SCHEDULED' : a.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            ))}
            {/* Add appointment */}
            <div onClick={() => router.push('/dashboard/appointments')}
              style={{ background: 'transparent', borderRadius: 14, padding: '14px 16px', minWidth: 150, flexShrink: 0, cursor: 'pointer', border: '1.5px dashed rgba(255,255,255,.22)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} color="rgba(255,255,255,.55)" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)' }}>Add appointment</span>
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <StatCard
            label="REVENUE" sub="This month"
            value={loading ? '—' : fmtCAD(revenue)}
            badge={revChange !== null ? `${revChange >= 0 ? '+' : ''}${revChange}% vs last month` : 'No prior data'}
            badgeColor={revChange !== null && revChange >= 0 ? '#16a34a' : '#dc2626'}
            badgeBg={revChange !== null && revChange >= 0 ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)'}
            sparkData={revSpark} sparkColor="#3B6CFF"
            onClick={() => router.push('/dashboard/reports')}
          />
          <StatCard
            label="IN PIPELINE" sub="All open"
            value={loading ? '—' : fmtCAD(pipelineTotal)}
            badge={`${pipeline.length} estimate${pipeline.length !== 1 ? 's' : ''}`}
            badgeColor="#2045B8" badgeBg="rgba(32,69,184,.1)"
            sparkData={pipeSpark} sparkColor="#2045B8"
            onClick={() => router.push('/dashboard/estimates')}
          />
          <StatCard
            label="DUE TO INVOICE" sub="Signed"
            value={loading ? '—' : fmtCAD(dueTotal)}
            badge={`${dueToInvoice.length} job${dueToInvoice.length !== 1 ? 's' : ''}`}
            badgeColor="#8b5cf6" badgeBg="rgba(139,92,246,.1)"
            sparkData={dueSpark} sparkColor="#8b5cf6"
            onClick={() => router.push('/dashboard/invoices')}
          />
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Needs attention */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>Needs attention</span>
              </div>
              {needsItems.length > 0 && (
                <span style={{ background: 'rgba(245,158,11,.1)', color: '#d97706', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 8, letterSpacing: '.05em' }}>
                  {needsItems.length} ITEM{needsItems.length !== 1 ? 'S' : ''}
                </span>
              )}
            </div>
            {needsItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, color: 'var(--ash)' }}>All caught up — great work!</div>
              </div>
            ) : needsItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < needsItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>{item.sub}</div>
                </div>
                <button
                  onClick={() => {
                    if (item.type === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                    else if (item.type === 'reminder') router.push(`/dashboard/estimates/${item.id}`)
                    else router.push('/dashboard/appointments')
                  }}
                  style={{ background: item.bg, border: `1px solid ${item.color}44`, borderRadius: 8, padding: '5px 11px', fontSize: 10, fontWeight: 700, color: item.color, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {item.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>Recent activity</span>
              </div>
              <button onClick={() => router.push('/dashboard/estimates')}
                style={{ background: 'none', border: 'none', fontSize: 11, color: '#2045B8', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                View all →
              </button>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ash)', fontSize: 13 }}>Loading…</div>}
            {!loading && estimates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🪟</div>
                <div style={{ fontSize: 13, color: 'var(--ash)' }}>No estimates yet</div>
              </div>
            )}
            {estimates.slice(0, 8).map((e, i) => {
              const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000)
              const relTime = days === 0 ? 'Today' : days === 1 ? '1d ago' : days < 7 ? `${days}d ago` : new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
              return (
                <div key={e.id} onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < Math.min(estimates.length, 8) - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot[e.status] || '#9ca3af', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.client_name || 'Unnamed client'}</div>
                    <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{e.estimate_number} · {fmtCAD(e.total || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--ash)', marginBottom: 3 }}>{relTime}</div>
                    <span className="badge" style={{ color: statusColor[e.status] || '#6b7280', background: statusBg[e.status] || 'rgba(107,114,128,.1)' }}>
                      {e.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <button className="fab mobile-only" onClick={() => router.push('/dashboard/estimates/new')}>
        ✏️ New Estimate
      </button>
      <BottomNav />
    </div>
  )
}

// ── STAT CARD ──────────────────────────────────────

function StatCard({ label, sub, value, badge, badgeColor, badgeBg, sparkData, sparkColor, onClick }: {
  label: string; sub: string; value: string
  badge: string; badgeColor: string; badgeBg: string
  sparkData: number[]; sparkColor: string; onClick: () => void
}) {
  const { line, area } = buildSparkline(sparkData.length >= 2 ? sparkData : [0, 1, 0.5, 2, 1.5, 3], 80, 36)
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--ash)' }}>{sub}</div>
        </div>
        <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
          <path d={area} fill={sparkColor} fillOpacity="0.09" />
          <path d={line} stroke={sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--jet)', letterSpacing: '-.02em', marginBottom: 10 }}>
        {value}
      </div>
      <span style={{ background: badgeBg, color: badgeColor, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 8, letterSpacing: '.04em' }}>
        {badge}
      </span>
    </div>
  )
}
