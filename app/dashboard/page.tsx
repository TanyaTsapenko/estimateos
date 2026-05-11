'use client'

import { useState } from 'react'
import {
  Home, ClipboardList, Calendar, User, BarChart3,
  CreditCard, Settings, Bell, Plus, Send, Check,
  AlertTriangle, ChevronRight, MapPin
} from 'lucide-react'

// ── Mock data (replace with real API) ──────────────────────────────────────
const ME = { firstName: 'Tanya', fullName: 'Tanya Tsapenko', plan: 'Pro' }
const TODAY_STR = 'Wed, May 7'
const UNREAD = 3

const APPOINTMENTS = [
  { id: 1, time: '9:00 AM', client: 'Sarah Mitchell', address: '142 Evergreen Terrace SW, Calgary', type: 'Measure' },
  { id: 2, time: '11:30 AM', client: 'James Kowalski', address: '88 Saddleback Rd NE, Calgary', type: 'Quote' },
  { id: 3, time: '2:00 PM', client: 'Priya Sharma', address: '310 Tuscany Valley Way NW, Calgary', type: 'Install' },
]

const METRICS = {
  revenueThisMonth: 'CA$1,260', revenueDelta: '+12%', revenueUp: true,
  pipelineTotal: 'CA$58.4k', pipelineCount: '8 estimates',
  dueInvoiceTotal: 'CA$1,260', dueInvoiceCount: '1 estimate',
  sparklines: {
    revenue: [420, 380, 510, 470, 620, 580, 700, 740, 680, 820, 900, 1260],
    pipeline: [42000, 44000, 51000, 48000, 55000, 52000, 58400],
    due: [0, 800, 600, 1200, 900, 1260],
  }
}

const ATTENTION = [
  { icon: Send, color: '#2563EB', title: 'EST-0005 not opened', desc: 'Sent 3 days ago · Zoi Petrova', cta: 'Send reminder' },
  { icon: Check, color: '#0F8A6B', title: 'EST-0002 ready to invoice', desc: 'Signed by Harry Lin yesterday', cta: 'Send invoice' },
  { icon: AlertTriangle, color: '#B45309', title: 'Appointment in 28 min', desc: 'Sarah Mitchell · 142 Evergreen Terrace', cta: 'Get directions' },
]

const ACTIVITY = [
  { dot: '#0F8A6B', actor: 'Tashika Patel', verb: 'signed', item: 'EST-0008', time: '12 min ago' },
  { dot: '#2563EB', actor: 'Zoi Petrova', verb: 'opened', item: 'EST-0005', time: '2h ago' },
  { dot: '#0F8A6B', actor: 'Harry Lin', verb: 'paid invoice for', item: 'EST-0002', time: 'yesterday' },
  { dot: '#2563EB', actor: 'Niko Kovač', verb: 'viewed', item: 'EST-0006', time: 'yesterday' },
  { dot: '#94A3B8', actor: 'You', verb: 'sent', item: 'EST-0005', time: '2 days ago' },
]

const NAV = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: ClipboardList, label: 'Estimates' },
  { icon: Calendar, label: 'Appointments' },
  { icon: User, label: 'Clients' },
  { icon: BarChart3, label: 'Reports' },
  { icon: ClipboardList, label: 'Invoices' },
  { icon: Settings, label: 'Settings' },
]

// ── Sparkline SVG ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
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

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, period, value, delta, deltaUp, accent, Icon, sparkData }: {
  label: string; period: string; value: string; delta: string;
  deltaUp?: boolean | null; accent: string; Icon: React.ElementType; sparkData: number[]
}) {
  const deltaColor = deltaUp === true ? '#0F8A6B' : deltaUp === false ? '#DC2626' : '#64748B'
  const deltaPrefix = deltaUp === true ? '↑ ' : deltaUp === false ? '↓ ' : ''
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 16,
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', flex: 1,
    }}>
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
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.6px', color: '#0A1628' }}>{value}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{deltaPrefix}{delta}</span>
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [_hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, background: '#0A1628', display: 'flex', flexDirection: 'column',
        flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Wordmark */}
        <div style={{ padding: '20px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: '#fff' }}>
            Estimate<span style={{ color: '#3B82F6' }}>OS</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 12px', flex: 1 }}>
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 12px', borderRadius: 10, marginBottom: 2, cursor: 'pointer',
              background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              fontWeight: active ? 600 : 500, fontSize: 13,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => !active && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => !active && ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <Icon size={16} strokeWidth={1.7} />
              {label}
            </div>
          ))}
        </nav>

        {/* User block */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>T</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{ME.fullName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Owner · {ME.plan} plan</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)',
          padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Greeting */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase' }}>WELCOME BACK</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#0A1628' }}>{ME.firstName}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 13, color: '#475569' }}>{TODAY_STR}</span>
            </div>
          </div>

          {/* Inbox */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid #E2E5EA', borderRadius: 9,
            padding: '7px 11px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
          }}>
            <Bell size={13} strokeWidth={1.7} />
            Inbox
            <span style={{
              background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 999,
            }}>{UNREAD}</span>
          </button>

          {/* New estimate */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2563EB', color: '#fff', border: 'none', borderRadius: 9,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 6px 16px -6px rgba(37,99,235,0.5)',
          }}>
            <Plus size={14} strokeWidth={1.7} />
            New estimate
          </button>
        </header>

        {/* Body */}
        <main style={{ padding: '20px 28px 32px', flex: 1 }}>

          {/* ── Hero ── */}
          <div style={{
            borderRadius: 16, padding: 22, marginBottom: 18,
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)',
            color: '#fff',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', opacity: 0.7, textTransform: 'uppercase' }}>
                  YOUR DAY · {TODAY_STR.toUpperCase()}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6 }}>
                  {APPOINTMENTS.length} appointments · 3 follow-up due
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  {APPOINTMENTS.length} stops · first at {APPOINTMENTS[0].time}, last at {APPOINTMENTS[APPOINTMENTS.length - 1].time}.
                </div>
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 9,
                fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', flexShrink: 0,
              }}>
                <Calendar size={13} strokeWidth={1.7} />
                Open calendar
              </button>
            </div>

            {/* Appointment cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${APPOINTMENTS.length < 4 ? APPOINTMENTS.length + 1 : 4}, 1fr)`,
              gap: 10, marginTop: 18,
            }}>
              {APPOINTMENTS.map(appt => (
                <div key={appt.id} style={{
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
                  borderRadius: 10, padding: 12, cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{appt.client}</div>
                  <div style={{
                    fontSize: 11, opacity: 0.8, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{appt.address}</div>
                  <div style={{
                    display: 'inline-block', marginTop: 8,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
                    padding: '2px 7px', background: 'rgba(255,255,255,0.18)',
                    borderRadius: 999, textTransform: 'uppercase',
                  }}>{appt.type}</div>
                </div>
              ))}

              {/* Add appointment cell */}
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px dashed rgba(255,255,255,0.25)',
                borderRadius: 10, padding: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                  + add appointment
                </span>
              </div>
            </div>
          </div>

          {/* ── KPI Row ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <KpiCard
              label="Revenue" period="This month"
              value={METRICS.revenueThisMonth} delta={METRICS.revenueDelta} deltaUp={true}
              accent="#2563EB" Icon={CreditCard} sparkData={METRICS.sparklines.revenue}
            />
            <KpiCard
              label="In pipeline" period="All open"
              value={METRICS.pipelineTotal} delta={METRICS.pipelineCount} deltaUp={null}
              accent="#7C3AED" Icon={Send} sparkData={METRICS.sparklines.pipeline}
            />
            <KpiCard
              label="Due to invoice" period="Signed"
              value={METRICS.dueInvoiceTotal} delta={METRICS.dueInvoiceCount} deltaUp={null}
              accent="#0F8A6B" Icon={CreditCard} sparkData={METRICS.sparklines.due}
            />
          </div>

          {/* ── Two-column lower row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Needs attention */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Needs attention</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{ATTENTION.length} items waiting on you</div>
              </div>
              {ATTENTION.map((item, i) => (
                <div key={i} style={{
                  padding: '12px 16px', display: 'flex', gap: 11, alignItems: 'center',
                  borderBottom: i < ATTENTION.length - 1 ? '1px solid #EEF0F4' : undefined,
                  cursor: 'pointer',
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
                    padding: '5px 9px', fontSize: 11, fontWeight: 600,
                    color: item.color, background: `${item.color}14`,
                    border: 'none', borderRadius: 7, cursor: 'pointer',
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
              {ACTIVITY.map((item, i) => (
                <div key={i} style={{
                  padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
                  borderBottom: i < ACTIVITY.length - 1 ? '1px solid #EEF0F4' : undefined,
                  cursor: 'pointer',
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
    </div>
  )
}
