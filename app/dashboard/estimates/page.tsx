'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  client_city: string | null; status: string; total: number
  tier: string | null; created_at: string
}

const FILTERS = ['All', 'Draft', 'Sent', 'Signed', 'Invoiced']

const statusColor: Record<string, string> = {
  draft: '#6b7280', sent: '#2563eb', signed: '#16a34a',
  declined: '#dc2626', invoiced: '#9333ea',
}
const statusBg: Record<string, string> = {
  draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(22,163,74,.1)',
  declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)',
}

export default function EstimatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('estimates')
        .select('id, estimate_number, client_name, client_city, status, total, tier, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setEstimates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = estimates.filter(e => {
    const matchFilter = filter === 'All' || e.status === filter.toLowerCase()
    const matchSearch = !search ||
      (e.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      e.estimate_number.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">Your work</div>
          <div className="h-big">Estimates</div>
          <div className="h-sub">{estimates.length} total · {estimates.filter(e => e.status === 'signed').length} signed</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        <div className="search-bar">
          <span style={{ fontSize: 14, color: 'var(--ash)' }}>🔍</span>
          <input
            placeholder="Search by client or #"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {FILTERS.map(f => (
            <div key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>
        )}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>
              {search ? 'No results' : filter === 'All' ? 'No estimates yet' : `No ${filter.toLowerCase()} estimates`}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {!search && filter === 'All' ? 'Tap the button below to create your first.' : ''}
            </div>
          </div>
        )}

        {visible.map(e => (
          <div key={e.id} className="ec" onClick={() => router.push(`/dashboard/estimates/${e.id}`)}>
            <div className="ec-top">
              <div>
                <div className="ec-name">{e.client_name || 'Unnamed client'}</div>
                <div className="ec-date">
                  {e.estimate_number}
                  {e.client_city ? ` · ${e.client_city}` : ''}
                  {' · '}{new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <span className="badge" style={{ color: statusColor[e.status] || '#6b7280', background: statusBg[e.status] || 'rgba(107,114,128,.1)' }}>
                {e.status.toUpperCase()}
              </span>
            </div>
            <div className="ec-bot">
              <div className="ec-tags">
                {e.tier && <span className="badge" style={{ background: 'rgba(217,119,6,.1)', color: 'var(--amber)' }}>{e.tier.toUpperCase()}</span>}
                <span className="badge" style={{ background: 'rgba(53,58,62,.08)', color: 'var(--graphite)' }}>W&D</span>
              </div>
              <div className="ec-amt">{fmtCAD(e.total || 0)}</div>
            </div>
          </div>
        ))}

        <div style={{ height: 100 }} />
      </div>

      <button className="fab" onClick={() => router.push('/dashboard/estimates/new')}>
        ✏️ New Estimate
      </button>
      <BottomNav />
    </div>
  )
}
