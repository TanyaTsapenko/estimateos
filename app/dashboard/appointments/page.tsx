'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Appointment {
  id: string
  client_name: string
  client_phone: string | null
  client_address: string | null
  appointment_date: string
  appointment_time: string | null
  notes: string | null
  lead_source: string | null
  status: string
  assigned_to: string | null
  estimate_id: string | null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new_lead:  { label: 'New Lead',  color: '#2563eb', bg: 'rgba(37,99,235,.1)' },
  scheduled: { label: 'Scheduled', color: '#3B6CFF', bg: 'rgba(59,108,255,.1)' },
  completed: { label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
}

const LEAD_ICONS: Record<string, string> = {
  'Phone call': '📞', Website: '🌐', Referral: '🤝', Google: '🔍', Kijiji: '📰', Other: '📌',
}

function fmt12h(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function dateLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const appt = new Date(y, mo - 1, d)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((appt.getTime() - now.getTime()) / 86400000)
  if (diff === -1) return 'Yesterday'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return appt.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
}

const FILTERS = ['Upcoming', 'All', 'New Lead', 'Scheduled', 'Completed', 'Cancelled']

export default function AppointmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Upcoming')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true, nullsFirst: false })
    setAppointments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createEstimate(appt: Appointment) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    setAppointments(p => p.map(a => a.id === appt.id ? { ...a, status: 'completed' } : a))
    const q = new URLSearchParams({
      appt: appt.id,
      name: appt.client_name || '',
      phone: appt.client_phone || '',
      address: appt.client_address || '',
    })
    router.push(`/dashboard/estimates/new?${q}`)
  }

  async function deleteAppt(id: string) {
    if (!confirm('Delete this appointment?')) return
    await supabase.from('appointments').delete().eq('id', id)
    setAppointments(p => p.filter(a => a.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  const filtered = (() => {
    if (filter === 'Upcoming') return appointments.filter(a => a.appointment_date >= todayStr)
    if (filter === 'All') return appointments
    const key = filter.toLowerCase().replace(' ', '_')
    return appointments.filter(a => a.status === key)
  })()

  const groups: { label: string; items: Appointment[] }[] = []
  const seen = new Map<string, Appointment[]>()
  filtered.forEach(appt => {
    const lbl = dateLabel(appt.appointment_date)
    if (!seen.has(lbl)) { seen.set(lbl, []); groups.push({ label: lbl, items: seen.get(lbl)! }) }
    seen.get(lbl)!.push(appt)
  })

  const selectedAppt = appointments.find(a => a.id === selectedId) || null

  const todayCount = appointments.filter(a => a.appointment_date === todayStr).length
  const newLeads = appointments.filter(a => a.status === 'new_lead').length

  function ApptDetail({ appt }: { appt: Appointment }) {
    const sm = STATUS_META[appt.status] || { label: appt.status, color: '#6b7280', bg: 'rgba(107,114,128,.1)' }
    return (
      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid var(--border-light)', borderLeft: `3px solid ${sm.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--jet)', marginBottom: 2 }}>{appt.client_name}</div>
            {appt.client_phone && <div style={{ fontSize: 12, color: 'var(--ash)' }}>{appt.client_phone}</div>}
          </div>
          <span style={{ background: sm.bg, color: sm.color, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 8, letterSpacing: '.06em' }}>
            {sm.label.toUpperCase()}
          </span>
        </div>

        {appt.client_address && (
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <span>📍</span><span>{appt.client_address}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: appt.notes ? 10 : 12 }}>
          {appt.appointment_time && (
            <span style={{ fontSize: 13, color: 'var(--jet)', fontWeight: 600 }}>🕐 {fmt12h(appt.appointment_time)}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>{dateLabel(appt.appointment_date)}</span>
          {appt.lead_source && (
            <span style={{ fontSize: 12, color: 'var(--ash)' }}>{LEAD_ICONS[appt.lead_source] || '📌'} {appt.lead_source}</span>
          )}
          {appt.assigned_to && (
            <span style={{ fontSize: 12, color: 'var(--ash)' }}>👤 {appt.assigned_to}</span>
          )}
        </div>

        {appt.notes && (
          <div style={{ fontSize: 12, color: '#6b7280', background: '#F4F5F7', borderRadius: 8, padding: '8px 10px', marginBottom: 12, lineHeight: 1.5 }}>
            {appt.notes}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {appt.client_phone && (
            <a href={`tel:${appt.client_phone}`}
              style={{ flex: 1, background: 'rgba(37,99,235,.08)', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#2563eb', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              📞 Call
            </a>
          )}
          {appt.client_address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(appt.client_address)}`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, background: 'rgba(22,163,74,.08)', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#16a34a', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              🗺 Map
            </a>
          )}
          {!appt.estimate_id && appt.status !== 'cancelled' && (
            <button onClick={() => createEstimate(appt)}
              style={{ flex: 2, background: 'rgba(59,108,255,.1)', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--blue-dark)', cursor: 'pointer', fontFamily: 'inherit' }}>
              📋 Create Estimate
            </button>
          )}
          {appt.estimate_id && (
            <button onClick={() => router.push(`/dashboard/estimates/${appt.estimate_id}`)}
              style={{ flex: 2, background: 'rgba(147,51,234,.1)', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#9333ea', cursor: 'pointer', fontFamily: 'inherit' }}>
              📋 View Estimate
            </button>
          )}
          <button onClick={() => deleteAppt(appt.id)}
            style={{ width: 34, background: 'rgba(220,38,38,.06)', border: 'none', borderRadius: 8, fontSize: 13, color: '#dc2626', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  const filterBar = (
    <div style={{ overflowX: 'auto', marginBottom: 14, paddingBottom: 4, scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              borderColor: filter === f ? 'var(--blue-dark)' : 'var(--border)',
              background: filter === f ? 'rgba(32,69,184,.1)' : '#fff',
              color: filter === f ? 'var(--blue-dark)' : 'var(--ash)',
            }}>
            {f}
          </button>
        ))}
      </div>
    </div>
  )

  const emptyState = (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)', marginBottom: 4 }}>No appointments</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>Tap + New to book your first appointment.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          <button onClick={() => router.push('/dashboard/appointments/new')}
            style={{ background: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#111', cursor: 'pointer', fontFamily: 'inherit' }}>
            + New
          </button>
        </div>
        <div className="h-title">
          <div className="h-eye">Schedule</div>
          <div className="h-big">Appointments</div>
          <div className="h-sub">
            {todayCount} today{newLeads > 0 ? ` · ${newLeads} new lead${newLeads > 1 ? 's' : ''}` : ''}
          </div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>}

        {!loading && (
          <>
            {/* ── DESKTOP TWO-COL ── */}
            <div className="desktop-only appts-2col">
              {/* Left: filter + compact list */}
              <div>
                {filterBar}
                {filtered.length === 0 && emptyState}
                {groups.map(({ label, items }) => (
                  <div key={label}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase',
                      color: label === 'Today' ? 'var(--blue-dark)' : label === 'Yesterday' ? '#dc2626' : 'var(--ash)',
                      padding: '10px 0 6px', borderBottom: '1px solid var(--border-light)', marginBottom: 8,
                    }}>
                      {label}
                    </div>
                    {items.map(appt => {
                      const sm = STATUS_META[appt.status] || { label: appt.status, color: '#6b7280', bg: 'rgba(107,114,128,.1)' }
                      return (
                        <div key={appt.id}
                          className={`appt-compact-row${selectedId === appt.id ? ' sel' : ''}`}
                          onClick={() => setSelectedId(appt.id)}>
                          <div style={{ width: 4, height: 36, borderRadius: 2, background: sm.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {appt.client_name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ash)' }}>
                              {appt.appointment_time ? fmt12h(appt.appointment_time) : '—'}
                              {appt.client_address ? ` · ${appt.client_address.split(',')[0]}` : ''}
                            </div>
                          </div>
                          <span style={{ background: sm.bg, color: sm.color, fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 6, letterSpacing: '.04em', flexShrink: 0 }}>
                            {sm.label.toUpperCase()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Right: detail panel */}
              <div className="appts-right-panel">
                {selectedAppt ? (
                  <ApptDetail appt={selectedAppt} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ash)' }}>Select an appointment</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {filterBar}
              {filtered.length === 0 && emptyState}
              {groups.map(({ label, items }) => (
                <div key={label}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase',
                    color: label === 'Today' ? 'var(--blue-dark)' : label === 'Yesterday' ? '#dc2626' : 'var(--ash)',
                    padding: '10px 0 8px', borderBottom: '1px solid var(--border-light)', marginBottom: 10,
                  }}>
                    {label}
                  </div>
                  {items.map(appt => <ApptDetail key={appt.id} appt={appt} />)}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  )
}
