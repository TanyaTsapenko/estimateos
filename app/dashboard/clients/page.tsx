'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { Search, ChevronRight, UserPlus } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  created_at: string
  estimateCount: number
  signedCount: number
  totalValue: number
}

const SC: Record<string, { text: string; bg: string }> = {
  draft:    { text: '#64748B', bg: '#F1F5F9' },
  sent:     { text: '#D97706', bg: '#FFFBEB' },
  signed:   { text: '#059669', bg: 'rgba(5,150,105,.1)' },
  invoiced: { text: '#7C3AED', bg: 'rgba(124,58,237,.1)' },
  paid:     { text: '#059669', bg: 'rgba(5,150,105,.1)'  },
  declined: { text: '#DC2626', bg: '#FEF2F2' },
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#fff', boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function ClientsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [clients,  setClients]  = useState<Client[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const uid = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      // Resolve role and team owner
      let role: string | null = null
      let memberRole: string | null = null
      let teamOwnerId: string | null = null
      try {
        const { data: prof } = await supabase
          .from('profiles').select('role, member_role, team_owner_id').eq('id', uid).single()
        role        = prof?.role ?? null
        memberRole  = prof?.member_role ?? null
        teamOwnerId = prof?.team_owner_id ?? null
      } catch {}

      // Build clients query based on role
      let clientsQuery = supabase.from('clients')
        .select('id, name, phone, email, address, city, created_at')
        .order('created_at', { ascending: false })

      let estimatesOwnerId = uid
      if (role === 'owner') {
        clientsQuery = clientsQuery.eq('owner_id', uid)
      } else if (memberRole === 'manager' && teamOwnerId) {
        clientsQuery = clientsQuery.or(`owner_id.eq.${uid},owner_id.eq.${teamOwnerId}`)
        estimatesOwnerId = teamOwnerId
      } else {
        // sales, estimator, or unknown — own clients only
        clientsQuery = clientsQuery.eq('owner_id', uid)
      }

      const [{ data: clientRows }, { data: estimates }] = await Promise.all([
        clientsQuery.limit(50),
        supabase.from('estimates')
          .select('id, client_id, status, total')
          .eq('user_id', estimatesOwnerId)
          .not('client_id', 'is', null)
          .limit(20),
      ])

      // Build per-client estimate stats
      const estMap = new Map<string, { count: number; signedCount: number; totalValue: number }>()
      for (const e of estimates || []) {
        if (!e.client_id) continue
        const cur = estMap.get(e.client_id) ?? { count: 0, signedCount: 0, totalValue: 0 }
        cur.count++
        if (e.status === 'signed' || e.status === 'invoiced' || e.status === 'paid') {
          cur.signedCount++
          cur.totalValue += e.total || 0
        }
        estMap.set(e.client_id, cur)
      }

      setClients((clientRows || []).map(c => ({
        ...c,
        ...(estMap.get(c.id) ?? { estimateCount: 0, signedCount: 0, totalValue: 0 }),
        estimateCount: estMap.get(c.id)?.count ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const visible = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  const totalValue  = clients.reduce((s, c) => s + c.totalValue, 0)
  const totalSigned = clients.reduce((s, c) => s + c.signedCount, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <AppTopBar
        eyebrow="CONTACTS"
        title="Clients"
        right={<span style={{ fontSize: 13, color: '#94A3B8' }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>}
      />

      {/* ── BODY ── */}
      <div style={{ padding: '20px 16px 100px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Clients"     value={clients.length}     />
          <StatBox label="Signed jobs" value={totalSigned}        />
          <StatBox label="Total value" value={fmtCAD(totalValue)} />
        </div>

        {/* Search */}
        <div style={{
          background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <Search size={15} strokeWidth={2} color="#94A3B8" />
          <input
            placeholder="Search by name or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0A1628', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <UserPlus size={24} color="#2563EB" strokeWidth={1.7} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>
              {search ? 'No clients found' : 'No clients yet'}
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
              {search ? 'Try a different name or phone number.' : 'Clients are added automatically when you create appointments.'}
            </div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="desktop-only" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px 140px 20px', padding: '10px 18px', borderBottom: '1px solid rgba(10,22,40,0.05)' }}>
                {['Name', 'Phone', 'Estimates', 'Value', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8', textAlign: i === 3 ? 'right' : 'left' as React.CSSProperties['textAlign'] }}>{h}</span>
                ))}
              </div>
              {visible.map((c, idx) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px 140px 20px', padding: '13px 18px', borderBottom: idx < visible.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none', cursor: 'pointer', alignItems: 'center' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,.1)', color: '#2563EB', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{c.name}</div>
                      {c.city && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{c.city}</div>}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{c.phone || '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{c.estimateCount}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.totalValue > 0 ? '#059669' : '#94A3B8' }}>
                      {c.totalValue > 0 ? fmtCAD(c.totalValue) : '—'}
                    </div>
                    {c.signedCount > 0 && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{c.signedCount} signed</div>}
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" />
                </div>
              ))}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {visible.map(c => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'rgba(37,99,235,.1)', color: '#2563EB', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.name[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      {[c.phone, c.estimateCount > 0 ? `${c.estimateCount} estimate${c.estimateCount !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.totalValue > 0 ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtCAD(c.totalValue)}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{c.signedCount} signed</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#CBD5E1' }}>—</div>
                    )}
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
