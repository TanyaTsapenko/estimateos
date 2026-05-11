'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'
import { SIcon } from '@/components/SIcon'

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

const statusColor: Record<string, string> = {
  draft: '#64748B', sent: '#2563EB', signed: '#0F8A6B', declined: '#DC2626', invoiced: '#7C3AED'
}
const statusBg: Record<string, string> = {
  draft: 'rgba(100,116,139,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(15,138,107,.12)',
  declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(124,58,237,.1)'
}
const statusDot: Record<string, string> = {
  draft: '#94A3B8', sent: '#2563EB', signed: '#0F8A6B', declined: '#DC2626', invoiced: '#7C3AED'
}

const apptTypeLabel: Record<string, string> = {
  'on-site': 'ON-SITE QUOTE', 'follow-up': 'FOLLOW-UP', 'video': 'VIDEO CALL', default: 'APPOINTMENT'
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [todayStr, setTodayStr] = useState('')
  const [todayLabel, setTodayLabel] = useState('')

  useEffect(() => {
    const d = new Date()
    const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate()
    setTodayStr(`${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setTodayLabel(d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase())
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
          .order('appointment_time').limit(4),
      ])
      setProfile(prof)
      setEstimates(ests || [])
      setTodayAppts(appts || [])
      setLoading(false)
    }
    load()
  }, [])

  // ── STATS ─────────────────────────────────────
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const thisMonthEsts = estimates.filter(e => e.created_at >= thisMonthStart)
  const lastMonthEsts = estimates.filter(e => e.created_at >= lastMonthStart && e.created_at <= lastMonthEnd)
  const revenue = thisMonthEsts.filter(e => ['signed','invoiced'].includes(e.status)).reduce((s, e) => s + (e.total || 0), 0)
  const lastRevenue = lastMonthEsts.filter(e => ['signed','invoiced'].includes(e.status)).reduce((s, e) => s + (e.total || 0), 0)
  const revPct = lastRevenue > 0 ? ((revenue - lastRevenue) / lastRevenue * 100) : 0
  const pipeline = estimates.filter(e => ['sent','draft'].includes(e.status)).reduce((s, e) => s + (e.total || 0), 0)
  const pipelineCount = estimates.filter(e => ['sent','draft'].includes(e.status)).length
  const dueToInvoice = estimates.filter(e => e.status === 'signed').reduce((s, e) => s + (e.total || 0), 0)
  const dueCount = estimates.filter(e => e.status === 'signed').length

  // Sparkline data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0, 23, 59, 59)
    return estimates.filter(e => ['signed','invoiced'].includes(e.status) && e.created_at >= d.toISOString() && e.created_at <= end.toISOString()).reduce((s, e) => s + (e.total || 0), 0)
  })

  // Needs attention
  const needsItems: { label: string; sub: string; cta: string; color: string; bg: string; type: string; id?: string }[] = []
  estimates.filter(e => e.status === 'sent').slice(0, 1).forEach(e => {
    const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000)
    if (days >= 3) needsItems.push({ label: `Follow up with ${e.client_name || 'client'}`, sub: `${e.estimate_number} sent ${days} days ago, not opened`, cta: 'Send reminder', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', type: 'reminder', id: e.id })
  })
  estimates.filter(e => e.status === 'signed').slice(0, 1).forEach(e => {
    needsItems.push({ label: `Invoice ${e.client_name || 'client'}`, sub: `${e.estimate_number} signed — ${fmtCAD(e.total || 0)}`, cta: 'Send invoice', color: '#0F8A6B', bg: 'rgba(15,138,107,0.08)', type: 'invoice', id: e.id })
  })
  if (todayAppts.length > 0) {
    const next = todayAppts[0]
    needsItems.push({ label: `${next.client_name} quote today`, sub: next.client_address ? `${next.client_address}` : fmt12h(next.appointment_time), cta: 'Get directions', color: '#D97706', bg: 'rgba(217,119,6,0.08)', type: 'appt' })
  }

  const followUpCount = needsItems.filter(n => n.type === 'reminder').length
  const heroTitle = todayAppts.length > 0
    ? `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''}${followUpCount > 0 ? ` · ${followUpCount} follow-up due` : ''}`
    : followUpCount > 0 ? `${followUpCount} follow-up${followUpCount > 1 ? 's' : ''} due today` : 'All clear today'

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)',
        padding: '28px 20px 24px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              YOUR DAY · {todayLabel}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {loading ? '––' : heroTitle}
            </div>
            {profile?.first_name && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                Welcome back, {profile.first_name}
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/dashboard/appointments')}
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
            <SIcon name="bell" size={13} /> Open calendar
          </button>
        </div>

        {/* Appointment cards */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {loading ? (
            [0, 1].map(i => (
              <div key={i} style={{ minWidth: 180, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(10px)' }}>
                <div style={{ height: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 4, width: '70%' }} />
              </div>
            ))
          ) : todayAppts.length === 0 ? (
            <div style={{
              minWidth: 200, background: 'rgba(255,255,255,0.08)', border: '1.5px dashed rgba(255,255,255,0.25)',
              borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
            }} onClick={() => router.push('/dashboard/appointments')}>
              <SIcon name="plus" size={15} /> Add appointment
            </div>
          ) : (
            <>
              {todayAppts.slice(0, 3).map(appt => (
                <div key={appt.id}
                  onClick={() => router.push('/dashboard/appointments')}
                  style={{
                    minWidth: 180, maxWidth: 220, background: 'rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(10px)',
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                    {fmt12h(appt.appointment_time) || '—'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                    {appt.client_name}
                  </div>
                  {appt.client_address && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                      {appt.client_address}
                    </div>
                  )}
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    background: 'rgba(255,255,255,0.18)', color: '#fff',
                    padding: '3px 8px', borderRadius: 6,
                  }}>
                    {appt.status === 'follow-up' ? 'FOLLOW-UP' : 'ON-SITE QUOTE'}
                  </span>
                </div>
              ))}
              {todayAppts.length < 3 && (
                <div style={{
                  minWidth: 160, background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.2)',
                  borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, gap: 6,
                }} onClick={() => router.push('/dashboard/appointments')}>
                  <SIcon name="plus" size={13} /> add appointment
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '20px 16px 100px' }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <KpiCard
            label="REVENUE" sub="This month"
            value={fmtCAD(revenue)}
            delta={revPct !== 0 ? `${revPct > 0 ? '+' : ''}${revPct.toFixed(0)}%` : undefined}
            deltaUp={revPct >= 0}
            sparkData={last6Months} sparkColor="#2563EB" accent="#2563EB"
            iconName="card"
            onClick={() => router.push('/dashboard/reports')}
          />
          <KpiCard
            label="IN PIPELINE" sub="All open"
            value={fmtCAD(pipeline)}
            info={`${pipelineCount} estimates`}
            sparkData={[1,2,1.5,3,2.5,4]} sparkColor="#7C3AED" accent="#7C3AED"
            iconName="send"
            onClick={() => router.push('/dashboard/estimates')}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <KpiCard
            label="DUE TO INVOICE" sub="Signed"
            value={fmtCAD(dueToInvoice)}
            info={`${dueCount} estimate${dueCount !== 1 ? 's' : ''}`}
            sparkData={[0.5,1,2,1.5,2.5,3]} sparkColor="#0F8A6B" accent="#0F8A6B"
            iconName="card"
            onClick={() => router.push('/dashboard/estimates')}
            wide
          />
        </div>

        {/* Needs attention */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', marginBottom: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Needs attention</div>
              {needsItems.length > 0 && (
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{needsItems.length} item{needsItems.length !== 1 ? 's' : ''} waiting on you</div>
              )}
            </div>
          </div>
          {loading && <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>}
          {!loading && needsItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>You&apos;re all caught up.</div>
          )}
          {needsItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 0', borderBottom: i < needsItems.length - 1 ? '1px solid #EEF0F4' : 'none',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: item.bg, color: item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SIcon name={item.type === 'invoice' ? 'invoice' : item.type === 'appt' ? 'bell' : 'mail'} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.sub}</div>
              </div>
              <button
                onClick={() => {
                  if (item.type === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                  else if (item.type === 'reminder') router.push(`/dashboard/estimates/${item.id}`)
                  else router.push('/dashboard/appointments')
                }}
                style={{
                  background: item.bg, border: `1px solid ${item.color}44`,
                  borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600,
                  color: item.color, cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                {item.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0F8A6B' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Recent activity</span>
            </div>
            <button onClick={() => router.push('/dashboard/estimates')}
              style={{ background: 'none', border: 'none', fontSize: 11, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>
          {loading && <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>}
          {!loading && estimates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>No estimates yet</div>
            </div>
          )}
          {estimates.slice(0, 8).map((e, i) => {
            const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000)
            const relTime = days === 0 ? 'Today' : days === 1 ? '1d ago' : days < 7 ? `${days}d ago` : new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
            return (
              <div key={e.id} onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: i < Math.min(estimates.length, 8) - 1 ? '1px solid #EEF0F4' : 'none',
                  cursor: 'pointer',
                }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot[e.status] || '#94A3B8', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.client_name || 'Unnamed client'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, fontFamily: 'ui-monospace, monospace' }}>
                    {e.estimate_number} · {fmtCAD(e.total || 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>{relTime}</div>
                  <span style={{
                    color: statusColor[e.status] || '#64748B',
                    background: statusBg[e.status] || 'rgba(100,116,139,.1)',
                    fontSize: 9, fontWeight: 700, padding: '3px 7px',
                    borderRadius: 6, letterSpacing: '0.04em',
                  }}>
                    {e.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAB — mobile only */}
      <button
        className="fab mobile-only"
        onClick={() => router.push('/dashboard/estimates/new')}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 50,
          background: '#2563EB', color: '#fff', border: 'none',
          borderRadius: 14, padding: '14px 20px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 16px -6px rgba(37,99,235,0.5)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
        <SIcon name="pen" size={15} /> New Estimate
      </button>
      <BottomNav />
    </div>
  )
}

// ── KPI CARD ──────────────────────────────────────

function KpiCard({ label, sub, value, delta, deltaUp, info, sparkData, sparkColor, accent, iconName, onClick, wide }: {
  label: string; sub: string; value: string
  delta?: string; deltaUp?: boolean; info?: string
  sparkData: number[]; sparkColor: string; accent: string
  iconName: string; onClick: () => void; wide?: boolean
}) {
  const { line, area } = buildSparkline(sparkData.length >= 2 ? sparkData : [0,1,0.5,2,1.5,3], 64, 22)
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px',
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', cursor: 'pointer',
      ...(wide ? { gridColumn: '1 / -1' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${accent}1A`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SIcon name={iconName} size={14} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8' }}>{label}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{sub}</div>
          </div>
        </div>
        <svg width="64" height="22" viewBox="0 0 64 22" fill="none" style={{ opacity: 0.85 }}>
          <path d={area} fill={sparkColor} fillOpacity="0.09" />
          <path d={line} stroke={sparkColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.6px', marginBottom: 6 }}>
        {value}
      </div>
      {delta && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: deltaUp ? '#0F8A6B' : '#DC2626',
        }}>
          {deltaUp ? '↑' : '↓'} {delta}
        </span>
      )}
      {info && (
        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{info}</span>
      )}
    </div>
  )
}
