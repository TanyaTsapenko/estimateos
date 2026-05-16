'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { Search, ChevronRight } from 'lucide-react'

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
    if (!row.phone   && e.client_phone)   row.phone   = e.client_phone
    if (!row.address && e.client_address) row.address = e.client_address
    if (!row.city    && e.client_city)    row.city    = e.client_city
  }
  return Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: '#fff',
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', letterSpacing: '-.02em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

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

  const totalValue  = clients.reduce((s, c) => s + c.totalValue, 0)
  const totalSigned = clients.reduce((s, c) => s + c.signedCount, 0)

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
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>
            CONTACTS
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
            Clients
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>{clients.length} unique client{clients.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '20px 16px 100px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Total clients" value={clients.length}     />
          <StatBox label="Signed jobs"   value={totalSigned}        />
          <StatBox label="Total value"   value={fmtCAD(totalValue)} />
        </div>

        {/* Search */}
        <div style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <Search size={15} strokeWidth={2} color="#94A3B8" />
          <input
            placeholder="Search by name, phone or city"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0A1628', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>
              {search ? 'No clients found' : 'No clients yet'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              Clients appear here once you create estimates.
            </div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="desktop-only" style={{
              background: '#fff', borderRadius: 12,
              boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 90px 130px 20px',
                padding: '10px 18px',
                borderBottom: '1px solid rgba(10,22,40,0.05)',
              }}>
                {['Name', 'Phone', 'Estimates', 'Value', ''].map((h, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: '#94A3B8',
                    textAlign: (i === 3 ? 'right' : 'left') as React.CSSProperties['textAlign'],
                  }}>
                    {h}
                  </span>
                ))}
              </div>
              {visible.map((c, idx) => (
                <div
                  key={c.key}
                  onClick={() => router.push(`/dashboard/estimates/${c.lastEstimateId}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 90px 130px 20px',
                    padding: '13px 18px',
                    borderBottom: idx < visible.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
                    cursor: 'pointer', alignItems: 'center',
                  }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(37,99,235,.1)', color: '#2563EB',
                      fontSize: 13, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {c.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{c.name}</div>
                      {c.city && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{c.city}</div>}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{c.phone || '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{c.count}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.totalValue > 0 ? '#059669' : '#94A3B8' }}>
                      {c.totalValue > 0 ? fmtCAD(c.totalValue) : '—'}
                    </div>
                    {c.signedCount > 0 && (
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                        {c.signedCount} signed
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" />
                </div>
              ))}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {visible.map(c => (
                <div
                  key={c.key}
                  onClick={() => router.push(`/dashboard/estimates/${c.lastEstimateId}`)}
                  style={{
                    background: '#fff', borderRadius: 12,
                    boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
                    padding: '14px 16px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(37,99,235,.1)', color: '#2563EB',
                    fontSize: 15, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.name[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {[c.phone, c.city, `${c.count} estimate${c.count !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.totalValue > 0 ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtCAD(c.totalValue)}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>{c.signedCount} signed</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>—</div>
                    )}
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
