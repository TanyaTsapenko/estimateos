'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { useRole } from '@/lib/useRole'
import { DollarSign, Send, Target, TrendingUp } from 'lucide-react'

interface Estimate {
  id: string; status: string; total: number; tier: string | null
  client_province: string | null; created_at: string
}

type Period = '30d' | '90d' | 'ytd' | 'all'

const PERIODS: { key: Period; label: string }[] = [
  { key: '30d', label: 'Last 30d'  },
  { key: '90d', label: 'Last 90d'  },
  { key: 'ytd', label: 'This year' },
  { key: 'all', label: 'All time'  },
]

const FUNNEL_COLORS = {
  created:  '#94A3B8',
  sent:     '#2563EB',
  signed:   '#0F8A6B',
  declined: '#DC2626',
}

function KpiCard({ icon, label, value, sub, accent = '#2563EB' }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent?: string
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${accent}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{label}</div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
          {sub}
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', letterSpacing: '-.02em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState<Period>('30d')

  useEffect(() => {
    if (!roleLoading && role !== 'owner') router.replace('/dashboard')
  }, [role, roleLoading])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('estimates')
        .select('id, status, total, tier, client_province, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setEstimates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function periodStart(): Date {
    const now = new Date()
    if (period === '30d') return new Date(now.getTime() - 30 * 86400000)
    if (period === '90d') return new Date(now.getTime() - 90 * 86400000)
    if (period === 'ytd') return new Date(now.getFullYear(), 0, 1)
    return new Date(0)
  }

  const filtered  = estimates.filter(e => new Date(e.created_at) >= periodStart())
  const signed    = filtered.filter(e => e.status === 'signed')
  const sent      = filtered.filter(e => e.status === 'sent')
  const drafted   = filtered.filter(e => e.status === 'draft')
  const declined  = filtered.filter(e => e.status === 'declined')

  const revenue = signed.reduce((s, e) => s + (e.total || 0), 0)
  const winRate = filtered.length > 0 ? Math.round(signed.length / filtered.length * 100) : 0
  const avgDeal = signed.length > 0 ? revenue / signed.length : 0
  const pipeline = sent.reduce((s, e) => s + (e.total || 0), 0)

  const tierCounts: Record<string, number> = { good: 0, better: 0, best: 0 }
  signed.forEach(e => { if (e.tier) tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1 })

  const funnel = [
    { label: 'Created',  count: filtered.length,                  color: FUNNEL_COLORS.created  },
    { label: 'Sent',     count: filtered.length - drafted.length, color: FUNNEL_COLORS.sent     },
    { label: 'Signed',   count: signed.length,                    color: FUNNEL_COLORS.signed   },
    { label: 'Declined', count: declined.length,                  color: FUNNEL_COLORS.declined },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>
            PERFORMANCE
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
            Reports
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length} estimates · {fmtCAD(revenue)} revenue</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '20px 16px 60px' }}>

        {/* Period filter card */}
        <div style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
          padding: '10px 12px',
          display: 'flex', gap: 6, flexWrap: 'wrap',
          marginBottom: 16,
        }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                background: period === p.key ? '#2563EB' : 'transparent',
                color: period === p.key ? '#fff' : '#64748B',
                border: 'none', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background .15s, color .15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <>
            {/* ── KPI GRID ── */}
            <div className="kpi-grid" style={{ marginBottom: 12 }}>
              <KpiCard icon={<DollarSign size={15} />} label="Revenue"    value={fmtCAD(revenue)}  sub="Signed"   />
              <KpiCard icon={<Send       size={15} />} label="Pipeline"   value={fmtCAD(pipeline)} sub="Pending"  />
              <KpiCard icon={<Target     size={15} />} label="Close rate" value={`${winRate}%`}    sub="Win rate" />
              <KpiCard icon={<TrendingUp size={15} />} label="Avg per job" value={fmtCAD(avgDeal)} sub="Average"  />
            </div>

            {/* ── SALES FUNNEL + TIER BREAKDOWN ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              {/* Sales funnel */}
              <div style={{
                background: '#fff', borderRadius: 12,
                boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
                padding: '20px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 18 }}>
                  Sales funnel
                </div>
                {funnel.map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: f.color, width: 36, flexShrink: 0, letterSpacing: '-.02em', lineHeight: 1 }}>
                      {f.count}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1628', width: 60, flexShrink: 0 }}>
                      {f.label}
                    </div>
                    <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, background: f.color,
                        width: filtered.length > 0 ? `${f.count / filtered.length * 100}%` : '0%',
                        transition: 'width .5s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', width: 38, textAlign: 'right', flexShrink: 0 }}>
                      {filtered.length > 0 ? `${Math.round(f.count / filtered.length * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier breakdown */}
              <div style={{
                background: '#fff', borderRadius: 12,
                boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
                padding: '20px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 16 }}>
                  Tier breakdown{' '}
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>signed only</span>
                </div>
                {signed.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }}>No signed estimates yet.</div>
                ) : (
                  Object.entries(tierCounts).filter(([, c]) => c > 0).map(([tier, count]) => (
                    <div
                      key={tier}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0', borderBottom: '1px solid rgba(10,22,40,0.05)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', textTransform: 'capitalize' }}>{tier}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{count} job{count !== 1 ? 's' : ''}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: 'rgba(37,99,235,.08)', color: '#2563EB',
                          borderRadius: 6, padding: '3px 8px',
                        }}>
                          {Math.round(count / signed.length * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No data yet</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Create and send estimates to see your reports here.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
