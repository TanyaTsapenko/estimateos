'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'
import { useRole } from '@/lib/useRole'

interface Estimate {
  id: string; status: string; total: number; tier: string | null
  client_province: string | null; created_at: string
}

type Period = '30d' | '90d' | 'ytd' | 'all'

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')

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

  const filtered = estimates.filter(e => new Date(e.created_at) >= periodStart())
  const signed = filtered.filter(e => e.status === 'signed')
  const sent = filtered.filter(e => e.status === 'sent')
  const drafted = filtered.filter(e => e.status === 'draft')
  const declined = filtered.filter(e => e.status === 'declined')

  const revenue = signed.reduce((s, e) => s + (e.total || 0), 0)
  const winRate = filtered.length > 0 ? Math.round(signed.length / filtered.length * 100) : 0
  const avgDeal = signed.length > 0 ? revenue / signed.length : 0
  const pipeline = sent.reduce((s, e) => s + (e.total || 0), 0)

  // Tier breakdown
  const tierCounts: Record<string, number> = { good: 0, better: 0, best: 0 }
  signed.forEach(e => { if (e.tier) tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1 })
  const mostPopularTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Province breakdown
  const provinceCounts: Record<string, number> = {}
  filtered.forEach(e => { if (e.client_province) provinceCounts[e.client_province] = (provinceCounts[e.client_province] || 0) + 1 })
  const topProvince = Object.entries(provinceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const PERIODS: { key: Period; label: string }[] = [
    { key: '30d', label: 'Last 30d' },
    { key: '90d', label: 'Last 90d' },
    { key: 'ytd', label: 'This year' },
    { key: 'all', label: 'All time' },
  ]

  const funnel = [
    { label: 'Created', count: filtered.length, color: '#6b7280' },
    { label: 'Sent', count: filtered.length - drafted.length, color: '#2563eb' },
    { label: 'Signed', count: signed.length, color: '#16a34a' },
    { label: 'Declined', count: declined.length, color: '#dc2626' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">Performance</div>
          <div className="h-big">Reports</div>
          <div className="h-sub">{filtered.length} estimates · {fmtCAD(revenue)} revenue</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {/* Period selector */}
        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          {PERIODS.map(p => (
            <div key={p.key} className={`filter-tab${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}>{p.label}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="stats">
              <div className="stat">
                <div className="stat-top"><div className="stat-ic">💰</div><div className="stat-tr">Signed</div></div>
                <div className="stat-val">{fmtCAD(revenue)}</div>
                <div className="stat-lbl">Revenue</div>
              </div>
              <div className="stat">
                <div className="stat-top"><div className="stat-ic">🔮</div><div className="stat-tr">Pending</div></div>
                <div className="stat-val">{fmtCAD(pipeline)}</div>
                <div className="stat-lbl">Pipeline</div>
              </div>
              <div className="stat">
                <div className="stat-top"><div className="stat-ic">🎯</div><div className="stat-tr">Win rate</div></div>
                <div className="stat-val">{winRate}%</div>
                <div className="stat-lbl">Close rate</div>
              </div>
              <div className="stat">
                <div className="stat-top"><div className="stat-ic">📈</div><div className="stat-tr">Average</div></div>
                <div className="stat-val">{fmtCAD(avgDeal)}</div>
                <div className="stat-lbl">Per job</div>
              </div>
            </div>

            {/* Wide stats */}
            <div className="stat-wide">
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)' }}>Most chosen tier</div>
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>Clients prefer…</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber)', textTransform: 'capitalize' }}>
                {mostPopularTier}
              </div>
            </div>

            <div className="stat-wide">
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)' }}>Top province</div>
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>Most active market</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber)' }}>{topProvince}</div>
            </div>

            {/* Funnel */}
            <div className="sl" style={{ marginTop: 16 }}>Sales funnel</div>
            {funnel.map(f => (
              <div key={f.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)' }}>{f.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.count}</span>
                </div>
                <div style={{ background: 'var(--border-light)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: f.color,
                    width: filtered.length > 0 ? (f.count / filtered.length * 100) + '%' : '0%',
                    transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            ))}

            {/* Tier breakdown */}
            {signed.length > 0 && (
              <>
                <div className="sl" style={{ marginTop: 16 }}>Tier breakdown (signed)</div>
                {Object.entries(tierCounts).filter(([, c]) => c > 0).map(([tier, count]) => (
                  <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)', textTransform: 'capitalize' }}>{tier}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--ash)' }}>{count} job{count !== 1 ? 's' : ''}</div>
                      <span className="badge" style={{ background: 'rgba(59,108,255,.1)', color: 'var(--amber)' }}>
                        {Math.round(count / signed.length * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>No data yet</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Create and send estimates to see your reports here.</div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
