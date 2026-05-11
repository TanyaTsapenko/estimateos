'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, CreditCard, Send, Bell, Plus } from 'lucide-react'

interface Appointment {
  id: string; time: string; client: string; address: string; type: string
}
interface Metrics {
  revenueThisMonth: string; revenueDelta: string; revenueUp: boolean | null
  pipelineTotal: string; pipelineCount: string
  dueInvoiceTotal: string; dueInvoiceCount: string
  sparklines: { revenue: number[]; pipeline: number[]; due: number[] }
}
interface AttentionItem {
  icon: React.ElementType; color: string; title: string; desc: string; cta: string
}
interface ActivityItem {
  dot: string; actor: string; verb: string; item: string; time: string
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
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', flex: 1 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={accent} strokeWidth={1.7} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{period}</div>
        </div>
        <Sparkline data={sparkData} color={accent} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 10 }}>
        {empty ? (
          <span style={{ fontSize: 15, fontWeight: 500, color: '#CBD5E1' }}>No data yet</span>
        ) : (
          <>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.6px', color: '#0A1628' }}>{value}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{deltaPrefix}{delta}</span>
          </>
        )}
      </div>
    </div>
  )
}

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [appointments] = useState<Appointment[]>([])
  const [metrics] = useState<Metrics | null>(null)
  const [attention] = useState<AttentionItem[]>([])
  const [activity] = useState<ActivityItem[]>([])
  const [unread] = useState(0)
  const router = useRouter()
  const todayStr = getTodayStr()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      if (meta?.full_name) setUserName(meta.full_name.split(' ')[0])
      else if (meta?.name) setUserName(meta.name.split(' ')[0])
      else if (data.user?.email) setUserName(data.user.email.split('@')[0])
    })
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
      background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', minHeight: '100vh',
    }}>

      {/* Top bar */}
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

        <button onClick={() => router.push('/dashboard/appointments')} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
          border: '1px solid #E2E5EA', borderRadius: 9, padding: '7px 11px',
          fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
        }}>
          <Bell size={13} strokeWidth={1.7} />
          Inbox
          {unread > 0 && (
            <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
              {unread}
            </span>
          )}
        </button>

        <button onClick={() => router.push('/dashboard/appointments')} style={{
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
      <main style={{ padding: '20px 28px 32px', flex: 1 }}>

        {/* Hero */}
        <div style={{
          borderRadius: 16, padding: 22, marginBottom: 18,
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', opacity: 0.7, textTransform: 'uppercase' }}>
                YOUR DAY · {todayStr.toUpperCase()}
              </div>
              {appointments.length === 0 ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6, opacity: 0.65 }}>
                    No appointments today
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    Add your first appointment to get started.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6 }}>
                    {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} today
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {appointments.length} stops · first at {appointments[0].time}, last at {appointments[appointments.length - 1].time}.
                  </div>
                </>
              )}
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', flexShrink: 0,
            }} onClick={() => router.push('/dashboard/appointments')}>
              <Calendar size={13} strokeWidth={1.7} />
              Open calendar
            </button>
          </div>

          {/* Appointment cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
            {appointments.map(appt => (
              <div key={appt.id} style={{
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
                borderRadius: 10, padding: 12, cursor: 'pointer',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{appt.client}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appt.address}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.4px', padding: '2px 7px',
                  background: 'rgba(255,255,255,0.18)', borderRadius: 999, textTransform: 'uppercase',
                }}>{appt.type}</div>
              </div>
            ))}
            {/* Add appointment cell */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.25)',
              borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', minHeight: 90,
            }} onClick={() => router.push('/dashboard/appointments/new')}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                + add appointment
              </span>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Revenue" period="This month"
            value={metrics?.revenueThisMonth ?? ''} delta={metrics?.revenueDelta ?? ''} deltaUp={metrics?.revenueUp ?? null}
            accent="#2563EB" Icon={CreditCard} sparkData={metrics?.sparklines.revenue ?? []} empty={!metrics} />
          <KpiCard label="In pipeline" period="All open"
            value={metrics?.pipelineTotal ?? ''} delta={metrics?.pipelineCount ?? ''} deltaUp={null}
            accent="#7C3AED" Icon={Send} sparkData={metrics?.sparklines.pipeline ?? []} empty={!metrics} />
          <KpiCard label="Due to invoice" period="Signed"
            value={metrics?.dueInvoiceTotal ?? ''} delta={metrics?.dueInvoiceCount ?? ''} deltaUp={null}
            accent="#0F8A6B" Icon={CreditCard} sparkData={metrics?.sparklines.due ?? []} empty={!metrics} />
        </div>

        {/* Two-column lower row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Needs attention */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Needs attention</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                {attention.length > 0 ? `${attention.length} items waiting on you` : 'Nothing pending'}
              </div>
            </div>
            {attention.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                You're all caught up.
              </div>
            ) : attention.map((item, i) => (
              <div key={i} style={{
                padding: '12px 16px', display: 'flex', gap: 11, alignItems: 'center',
                borderBottom: i < attention.length - 1 ? '1px solid #EEF0F4' : undefined, cursor: 'pointer',
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                </div>
                <button style={{
                  padding: '5px 9px', fontSize: 11, fontWeight: 600, color: item.color,
                  background: `${item.color}14`, border: 'none', borderRadius: 7, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{item.cta}</button>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Recent activity</div>
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
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
