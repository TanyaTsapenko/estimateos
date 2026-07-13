'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { usePermissions } from '@/lib/usePermissions'
import { getTeamUserIds } from '@/lib/teamScope'
import { Search, Plus, ChevronRight } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  client_city: string | null; status: string; total: number
  created_at: string; viewed_at: string | null; user_id: string
}

const FILTERS = ['All', 'Draft', 'Sent', 'Signed', 'Invoiced', 'Paid']

const REP_GRADIENTS = [
  'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
  'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)',
  'linear-gradient(135deg,#059669 0%,#047857 100%)',
  'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)',
  'linear-gradient(135deg,#D97706 0%,#B45309 100%)',
]

const SC: Record<string, { text: string; bg: string }> = {
  draft:    { text: '#64748B', bg: 'rgba(100,116,139,.1)' },
  sent:     { text: '#2563EB', bg: 'rgba(37,99,235,.1)'   },
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
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
  const { role }     = usePermissions()
  const isRestrictedRole = role === 'estimator' || role === 'admin'

  const [estimates,      setEstimates]      = useState<Estimate[]>([])
  const [loading,        setLoading]        = useState(true)
  const [statsData,      setStatsData]      = useState<{ total: number; status: string }[]>([])
  const [repFilter,      setRepFilter]      = useState<string>('all')
  const [teamReps,       setTeamReps]       = useState<{ id: string; name: string }[]>([])
  const [expandedRepIds, setExpandedRepIds] = useState<Set<string>>(new Set())

  const initialFilter = (() => {
    const s = searchParams.get('status')
    if (!s) return 'All'
    return FILTERS.find(f => f.toLowerCase() === s.toLowerCase()) ?? 'All'
  })()
  const [filter, setFilter] = useState(initialFilter)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { userIds, isOwnerOrManager } = await getTeamUserIds(supabase, user.id)

      if (isOwnerOrManager && userIds.length > 1) {
        const { data: profs } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        const reps = userIds.map(uid => {
          const p = (profs || []).find((x: any) => x.id === uid)
          return { id: uid, name: uid === sanitizedId ? 'You' : ([p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Team member') }
        })
        setTeamReps(reps)
        setExpandedRepIds(new Set([reps[0].id]))
      }

      const [{ data }, { data: stats }] = await Promise.all([
        supabase.from('estimates')
          .select('id, estimate_number, client_name, client_city, status, total, created_at, viewed_at, user_id')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('estimates')
          .select('total, status')
          .in('user_id', userIds),
      ])
      setEstimates(data || [])
      setStatsData(stats || [])
      setLoading(false)
    }
    load()
  }, [])

  const displayedEstimates = estimates.filter(e => {
    const matchRep    = repFilter === 'all' || e.user_id === repFilter
    const matchFilter = filter === 'All' || e.status === filter.toLowerCase()
    const matchSearch = !search ||
      (e.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      e.estimate_number.toLowerCase().includes(search.toLowerCase())
    return matchRep && matchFilter && matchSearch
  })

  const showRepGrouped = repFilter === 'all' && teamReps.length > 1

  const totalValue  = statsData.filter(e => ['signed', 'invoiced', 'paid'].includes(e.status)).reduce((s, e) => s + (e.total || 0), 0)
  const signedCount = statsData.filter(e => e.status === 'signed').length
  const openCount   = statsData.filter(e => e.status === 'draft' || e.status === 'sent').length

  const toggleRep = (id: string) => setExpandedRepIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const viewedDot = (e: Estimate) => {
    if (!e.viewed_at || e.status === 'draft') return null
    const d = new Date(e.viewed_at)
    const isToday = d.toDateString() === new Date().toDateString()
    const color = isToday ? '#16A34A' : '#D97706'
    const time  = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
    const label = isToday
      ? `Opened today · ${time}`
      : `Opened ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · ${time}`
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
    )
  }

  const desktopRow = (e: Estimate, idx: number, listLen: number) => {
    const sc = SC[e.status] || SC.draft
    return (
      <div
        key={e.id}
        onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
        style={{
          display: 'grid',
          gridTemplateColumns: '88px 1fr 110px 76px 140px 20px',
          padding: '13px 18px',
          borderBottom: idx < listLen - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
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
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: sc.text, background: sc.bg, borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginTop: 2 }}>
            {e.status === 'signed' ? 'ACCEPTED' : e.status.toUpperCase()}
          </span>
          {viewedDot(e)}
        </div>
        <ChevronRight size={14} color="#CBD5E1" />
      </div>
    )
  }

  const mobileCard = (e: Estimate) => {
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
          {viewedDot(e)}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(e.total || 0)}</div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: sc.text, background: sc.bg, borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginTop: 2 }}>
            {e.status === 'signed' ? 'ACCEPTED' : e.status.toUpperCase()}
          </span>
        </div>
        <ChevronRight size={14} color="#CBD5E1" />
      </div>
    )
  }

  const repSectionHeader = (rep: { id: string; name: string }, ri: number, count: number, total: number) => (
    <button
      onClick={() => toggleRep(rep.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 18px', border: 'none', borderBottom: '1px solid rgba(10,22,40,0.05)', background: '#FAFBFC', cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 8, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {rep.name.charAt(0).toUpperCase()}
      </div>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0A1628' }}>{rep.name}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{count} · {fmtCAD(total)}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedRepIds.has(rep.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
    </button>
  )

  const mobileRepHeader = (rep: { id: string; name: string }, ri: number, count: number, total: number) => (
    <button
      onClick={() => toggleRep(rep.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 9, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {rep.name.charAt(0).toUpperCase()}
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{rep.name}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{count} · {fmtCAD(total)}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedRepIds.has(rep.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <AppTopBar
        eyebrow="YOUR WORK"
        title="Estimates"
        right={<>
          <span className="est-topbar-meta" style={{ fontSize: 13, color: '#94A3B8' }}>{estimates.length} total · {signedCount} accepted</span>
          {role !== 'admin' && (
            <button
              onClick={() => router.push('/dashboard/estimates/new')}
              style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} strokeWidth={2.5} /> New Estimate
            </button>
          )}
        </>}
      />

      {/* ── BODY ── */}
      <div className="page-body" style={{ padding: '20px 16px 100px' }}>

        {/* Stats — hidden for estimator/admin */}
        {!isRestrictedRole && (
          <div className="est-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatBox label="Total value" value={fmtCAD(totalValue)} />
            <StatBox label="Signed"      value={signedCount}        />
            <StatBox label="Open"        value={openCount}          />
          </div>
        )}

        {/* Rep chip row — owner/manager with team only */}
        {teamReps.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' as any }}>
            {[{ id: 'all', name: 'All reps' }, ...teamReps].map(m => {
              const active = repFilter === m.id
              return (
                <button key={m.id} onClick={() => setRepFilter(m.id)} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 99, border: `1.5px solid ${active ? '#2563EB' : 'rgba(15,23,42,0.08)'}`, background: active ? '#EFF4FF' : '#fff', color: active ? '#2563EB' : '#64748B', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {m.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Search size={15} strokeWidth={2} color="#94A3B8" />
          <input
            placeholder="Search by client or #"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0A1628', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>

        {/* Status filter tabs */}
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
        {!loading && displayedEstimates.length === 0 && (
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

        {!loading && displayedEstimates.length > 0 && (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="desktop-only" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 110px 76px 140px 20px', padding: '10px 18px', borderBottom: '1px solid rgba(10,22,40,0.05)' }}>
                {['#', 'Client', 'City', 'Date', 'Total', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8', textAlign: (i === 4 ? 'right' : 'left') as React.CSSProperties['textAlign'] }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Flat */}
              {!showRepGrouped && displayedEstimates.map((e, idx) => desktopRow(e, idx, displayedEstimates.length))}

              {/* Rep-grouped */}
              {showRepGrouped && teamReps.map((rep, ri) => {
                const repEsts = displayedEstimates.filter(e => e.user_id === rep.id)
                if (!repEsts.length) return null
                const repTotal = repEsts.reduce((s, e) => s + (e.total || 0), 0)
                return (
                  <div key={rep.id}>
                    {repSectionHeader(rep, ri, repEsts.length, repTotal)}
                    {expandedRepIds.has(rep.id) && repEsts.map((e, idx) => desktopRow(e, idx, repEsts.length))}
                  </div>
                )
              })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {/* Rep-grouped */}
              {showRepGrouped && teamReps.map((rep, ri) => {
                const repEsts = displayedEstimates.filter(e => e.user_id === rep.id)
                if (!repEsts.length) return null
                const repTotal = repEsts.reduce((s, e) => s + (e.total || 0), 0)
                return (
                  <div key={rep.id} style={{ marginBottom: 8 }}>
                    {mobileRepHeader(rep, ri, repEsts.length, repTotal)}
                    {expandedRepIds.has(rep.id) && repEsts.map(e => mobileCard(e))}
                  </div>
                )
              })}
              {/* Flat */}
              {!showRepGrouped && displayedEstimates.map(e => mobileCard(e))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
