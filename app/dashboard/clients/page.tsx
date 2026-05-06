'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'

interface RawEstimate {
  id: string
  client_name: string | null
  client_phone: string | null
  client_address: string | null
  client_city: string | null
  status: string
  total: number
  created_at: string
}

interface ClientRow {
  key: string
  name: string
  phone: string | null
  address: string | null
  city: string | null
  count: number
  signedCount: number
  totalValue: number
  lastDate: string
  lastEstimateId: string
}

function buildClients(estimates: RawEstimate[]): ClientRow[] {
  const map = new Map<string, ClientRow>()
  for (const e of estimates) {
    const key = (e.client_name || '').toLowerCase().trim() || e.id
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: e.client_name || 'Unknown',
        phone: e.client_phone,
        address: e.client_address,
        city: e.client_city,
        count: 0,
        signedCount: 0,
        totalValue: 0,
        lastDate: e.created_at,
        lastEstimateId: e.id,
      })
    }
    const row = map.get(key)!
    row.count++
    if (e.status === 'signed' || e.status === 'invoiced') {
      row.signedCount++
      row.totalValue += e.total || 0
    }
    if (e.created_at > row.lastDate) {
      row.lastDate = e.created_at
      row.lastEstimateId = e.id
    }
    if (!row.phone && e.client_phone) row.phone = e.client_phone
    if (!row.address && e.client_address) row.address = e.client_address
    if (!row.city && e.client_city) row.city = e.client_city
  }
  return Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

export default function ClientsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('estimates')
        .select('id, client_name, client_phone, client_address, client_city, status, total, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setClients(buildClients(data || []))
      setLoading(false)
    }
    load()
  }, [])

  const visible = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">CRM</div>
          <div className="h-big">Clients</div>
          <div className="h-sub">{clients.length} unique client{clients.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        <div className="search-bar">
          <span style={{ fontSize: 14, color: 'var(--ash)' }}>🔍</span>
          <input
            placeholder="Search by name, phone or city"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>
        )}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>
              {search ? 'No clients found' : 'No clients yet'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Clients appear here once you create estimates.</div>
          </div>
        )}

        {/* ── DESKTOP TABLE ── */}
        {!loading && visible.length > 0 && (
          <div className="desktop-only">
            <div className="dt">
              <div className="dt-head" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 160px 80px 110px 100px 100px', padding: '9px 16px' }}>
                <span>Name</span>
                <span>Phone</span>
                <span>Address</span>
                <span>Estimates</span>
                <span>Signed value</span>
                <span>Last estimate</span>
                <span />
              </div>
              {visible.map(c => (
                <div key={c.key} className="dt-row" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 160px 80px 110px 100px 100px', padding: '11px 16px', alignItems: 'center' }}>
                  <div>
                    <div className="dt-name">{c.name}</div>
                    {c.city && <div style={{ fontSize: 11, color: 'var(--ash)' }}>{c.city}</div>}
                  </div>
                  <span className="dt-city">{c.phone || '—'}</span>
                  <span className="dt-city" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)' }}>{c.count}</span>
                  <span className="dt-amt">{c.signedCount > 0 ? fmtCAD(c.totalValue) : '—'}</span>
                  <span className="dt-date">
                    {new Date(c.lastDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => router.push(`/dashboard/estimates/${c.lastEstimateId}`)}
                      style={{ background: 'rgba(59,108,255,.08)', border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--blue-dark)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      Open →
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MOBILE CARDS ── */}
        <div className="mobile-only">
          {visible.map(c => (
            <div key={c.key} className="ec" onClick={() => router.push(`/dashboard/estimates/${c.lastEstimateId}`)}>
              <div className="ec-top">
                <div>
                  <div className="ec-name">{c.name}</div>
                  <div className="ec-date">
                    {c.phone && `${c.phone} · `}
                    {c.city && `${c.city} · `}
                    {c.count} estimate{c.count !== 1 ? 's' : ''}
                  </div>
                </div>
                {c.signedCount > 0 && (
                  <span className="badge" style={{ background: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                    {c.signedCount} SIGNED
                  </span>
                )}
              </div>
              <div className="ec-bot">
                <div style={{ fontSize: 11, color: 'var(--ash)' }}>
                  Last: {new Date(c.lastDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </div>
                {c.signedCount > 0 && <div className="ec-amt">{fmtCAD(c.totalValue)}</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
