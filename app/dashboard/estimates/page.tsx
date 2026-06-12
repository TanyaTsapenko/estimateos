'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { usePermissions } from '@/lib/usePermissions'
import { Search, Plus, ChevronRight } from 'lucide-react'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  client_city: string | null; status: string; total: number
  tier: string | null; created_at: string; viewed_at: string | null
}

const FILTERS = ['All', 'Draft', 'Sent', 'Accepted', 'Signed', 'Invoiced']

const SC: Record<string, { text: string; bg: string }> = {
  draft:    { text: '#64748B', bg: 'rgba(100,116,139,.1)' },
  sent:     { text: '#2563EB', bg: 'rgba(37,99,235,.1)'   },
  opened:   { text: '#7C3AED', bg: '#EDE9FE'               },
  signed:   { text: '#059669', bg: 'rgba(5,150,105,.1)'   },
  declined: { text: '#DC2626', bg: 'rgba(220,38,38,.1)'   },
  invoiced: { text: '#7C3AED', bg: 'rgba(124,58,237,.1)'  },
  paid:     { text: '#059669', bg: 'rgba(5,150,105,.1)'   },
  expired:  { text: '#92400E', bg: '#FEF3C7'               },
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

export default function EstimatesPage() {
  const router  = useRouter()
  const supabase = createClient()
  const { role } = usePermissions()
  const isRestrictedRole = role === 'estimator' || role === 'admin'
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data } = await supabase.from('estimates')
        .select('id, estimate_number, client_name, client_city, status, total, tier, created_at, viewed_at')
        .eq('user_id', sanitizedId)
        .order('created_at', { ascending: false })
        .limit(50)
      setEstimates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = estimates.filter(e => {
    const matchFilter = filter === 'All'
      || (filter === 'Accepted' || filter === 'Signed' ? e.status === 'signed' : e.status === filter.toLowerCase())
    const matchSearch = !search ||
      (e.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      e.estimate_number.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalValue  = estimates.reduce((s, e) => s + (e.total || 0), 0)
  const signedCount = estimates.filter(e => e.status === 'signed').length
  const openCount   = estimates.filter(e => e.status === 'draft' || e.status === 'sent').length

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div className="page-hd" style={{
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
            YOUR WORK
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
            Estimates
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="est-topbar-meta" style={{ fontSize: 13, color: '#94A3B8' }}>{estimates.length} total · {signedCount} accepted</span>
          {role !== 'admin' && (
          <button
            onClick={() => router.push('/dashboard/estimates/new')}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} strokeWidth={2.5} /> New Estimate
          </button>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="page-body" style={{ padding: '20px 16px 100px' }}>

        {/* Stats */}
        {!isRestrictedRole && (
        <div className="est-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Total value" value={fmtCAD(totalValue)} />
          <StatBox label="Accepted"     value={signedCount}        />
          <StatBox label="Open"        value={openCount}          />
        </div>
        )}

        {/* Search */}
        <div style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
        }}>
          <Search size={15} strokeWidth={2} color="#94A3B8" />
          <input
            placeholder="Search by client or #"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0A1628', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#2563EB' : '#fff',
                color: filter === f ? '#fff' : '#64748B',
                border: 'none', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 0 0 1px rgba(10,22,40,0.06)',
                transition: 'background .15s, color .15s',
              }}
            >
              {f}
            </button>
          ))}
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
            <div style={{ width: 48, height: 48, background: 'rgba(37,99,235,.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Plus size={22} color="#2563EB" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>
              {search ? 'No results' : filter === 'All' ? 'No estimates yet' : `No ${filter.toLowerCase()} estimates`}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              {!search && filter === 'All' ? 'Tap the button below to create your first estimate.' : ''}
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
                gridTemplateColumns: '88px 1fr 110px 76px 140px 20px',
                padding: '10px 18px',
                borderBottom: '1px solid rgba(10,22,40,0.05)',
              }}>
                {['#', 'Client', 'City', 'Date', 'Total', ''].map((h, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: '#94A3B8',
                    textAlign: (i === 4 ? 'right' : 'left') as React.CSSProperties['textAlign'],
                  }}>
                    {h}
                  </span>
                ))}
              </div>
              {visible.map((e, idx) => {
                const sc = SC[e.status] || SC.draft
                return (
                  <div
                    key={e.id}
                    onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '88px 1fr 110px 76px 140px 20px',
                      padding: '13px 18px',
                      borderBottom: idx < visible.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
                      cursor: 'pointer', alignItems: 'center',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>
                      {e.estimate_number}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {e.client_name || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{e.client_city || '—'}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(e.created_at))}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(e.total || 0)}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                        color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: '2px 6px',
                        display: 'inline-block', marginTop: 2,
                      }}>
                        {e.status === 'signed' ? 'ACCEPTED' : e.status.toUpperCase()}
                      </span>
                      {e.viewed_at && e.status !== 'draft' && (() => {
                        const d = new Date(e.viewed_at)
                        const isToday = d.toDateString() === new Date().toDateString()
                        const color = isToday ? '#16A34A' : '#D97706'
                        const time = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
                        const label = isToday
                          ? `Opened today · ${time}`
                          : `Opened ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${time}`
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
                          </div>
                        )
                      })()}
                    </div>
                    <ChevronRight size={14} color="#CBD5E1" />
                  </div>
                )
              })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {visible.map(e => {
                const sc = SC[e.status] || SC.draft
                return (
                  <div
                    key={e.id}
                    onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                    style={{
                      background: '#fff', borderRadius: 12,
                      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
                      padding: '14px 16px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 3 }}>
                        {e.client_name || 'Unnamed client'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', color: '#2563EB', fontWeight: 600 }}>
                          {e.estimate_number}
                        </span>
                        {e.client_city ? ` · ${e.client_city}` : ''}
                        {` · ${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(e.created_at))}`}
                      </div>
                      {e.viewed_at && e.status !== 'draft' && (() => {
                        const d = new Date(e.viewed_at)
                        const isToday = d.toDateString() === new Date().toDateString()
                        const color = isToday ? '#16A34A' : '#D97706'
                        const time = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
                        const label = isToday
                          ? `Opened today · ${time}`
                          : `Opened ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${time}`
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(e.total || 0)}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                        color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: '2px 6px',
                        display: 'inline-block', marginTop: 2,
                      }}>
                        {e.status === 'signed' ? 'ACCEPTED' : e.status.toUpperCase()}
                      </span>
                    </div>
                    <ChevronRight size={14} color="#CBD5E1" />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
