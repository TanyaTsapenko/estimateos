'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Phone, MapPin, FileText, Trash2, Clock, Calendar, Pencil } from 'lucide-react'

interface Appointment {
  id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
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

const FILTERS = ['All', 'Upcoming', 'Completed']

export default function AppointmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }

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
    router.push(`/dashboard/estimates/new?appointment_id=${appt.id}`)
  }

  async function deleteAppt(id: string) {
    if (!confirm('Delete this appointment?')) return
    await supabase.from('appointments').delete().eq('id', id)
    setAppointments(p => p.filter(a => a.id !== id))
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const filtered = (() => {
    if (filter === 'Upcoming') return appointments.filter(a => a.appointment_date >= todayStr)
    if (filter === 'All') return appointments
    const key = filter.toLowerCase().replace(' ', '_')
    return appointments.filter(a => a.status === key)
  })()

  function buildDateGroups(appts: Appointment[]) {
    const result: { label: string; items: Appointment[] }[] = []
    const seen = new Map<string, Appointment[]>()
    appts.forEach(appt => {
      const lbl = dateLabel(appt.appointment_date)
      if (!seen.has(lbl)) { seen.set(lbl, []); result.push({ label: lbl, items: seen.get(lbl)! }) }
      seen.get(lbl)!.push(appt)
    })
    return result
  }
  const future = filtered.filter(a => a.appointment_date > todayStr)
  const todayAppts = filtered.filter(a => a.appointment_date === todayStr)
  const past = filtered.filter(a => a.appointment_date < todayStr)
  const groups = [
    ...buildDateGroups(future),
    ...buildDateGroups(todayAppts),
    ...buildDateGroups(past).reverse(),
  ]

  const todayCount = appointments.filter(a => a.appointment_date === todayStr).length
  const newLeads = appointments.filter(a => a.status === 'new_lead').length

  function ApptDetail({ appt, flash: flashMsg }: { appt: Appointment; flash: (m: string) => void }) {
    const sm = STATUS_META[appt.status] || { label: appt.status, color: '#64748B', bg: 'rgba(100,116,139,.1)' }
    const [editMode, setEditMode] = useState(false)
    const [draft, setDraft] = useState({
      client_name: appt.client_name,
      client_phone: appt.client_phone || '',
      client_email: appt.client_email || '',
      client_address: appt.client_address || '',
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time || '',
      notes: appt.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const setD = (k: string) => (v: string) => setDraft(p => ({ ...p, [k]: v }))

    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '9px 12px', border: '1px solid #E2E5EA',
      borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#0A1628',
      background: '#fff', outline: 'none', boxSizing: 'border-box',
    }
    const fieldLbl: React.CSSProperties = {
      fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
      textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4, display: 'block',
    }

    async function saveEdit() {
      if (!draft.client_name.trim()) return
      setSaving(true)
      await supabase.from('appointments').update({
        client_name: draft.client_name.trim(),
        client_phone: draft.client_phone.trim() || null,
        client_email: draft.client_email.trim() || null,
        client_address: draft.client_address.trim() || null,
        appointment_date: draft.appointment_date,
        appointment_time: draft.appointment_time || null,
        notes: draft.notes.trim() || null,
      }).eq('id', appt.id)
      setAppointments(p => p.map(a => a.id === appt.id ? {
        ...a,
        client_name: draft.client_name.trim(),
        client_phone: draft.client_phone.trim() || null,
        client_email: draft.client_email.trim() || null,
        client_address: draft.client_address.trim() || null,
        appointment_date: draft.appointment_date,
        appointment_time: draft.appointment_time || null,
        notes: draft.notes.trim() || null,
      } : a))
      setSaving(false)
      setEditMode(false)
      flashMsg('Saved')
    }

    function cancelEdit() {
      setDraft({
        client_name: appt.client_name,
        client_phone: appt.client_phone || '',
        client_email: appt.client_email || '',
        client_address: appt.client_address || '',
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time || '',
        notes: appt.notes || '',
      })
      setEditMode(false)
    }

    if (editMode) {
      return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEF0F4', borderLeft: `3px solid ${sm.color}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLbl}>Client Name</label>
              <input value={draft.client_name} onChange={e => setD('client_name')(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={fieldLbl}>Phone</label>
                <input type="tel" value={draft.client_phone} onChange={e => setD('client_phone')(e.target.value)} placeholder="(403) 555-0100" style={inputStyle} />
              </div>
              <div>
                <label style={fieldLbl}>Email</label>
                <input type="email" value={draft.client_email} onChange={e => setD('client_email')(e.target.value)} placeholder="jane@email.com" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLbl}>Address</label>
              <input value={draft.client_address} onChange={e => setD('client_address')(e.target.value)} placeholder="123 Main St" style={inputStyle} />
            </div>
            <div className="appt-edit-datetime" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={fieldLbl}>Date</label>
                <input type="date" value={draft.appointment_date} onChange={e => setD('appointment_date')(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={fieldLbl}>Time</label>
                <input type="time" value={draft.appointment_time} onChange={e => setD('appointment_time')(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLbl}>Notes</label>
              <textarea value={draft.notes} onChange={e => setD('notes')(e.target.value)} rows={3}
                placeholder="What does the client need?"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} disabled={saving || !draft.client_name.trim()}
                style={{ flex: 2, padding: '9px 0', background: saving || !draft.client_name.trim() ? '#CBD5E1' : '#2563EB', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancelEdit}
                style={{ flex: 1, padding: '9px 0', background: '#fff', color: '#64748B', border: '1.5px solid #E2E5EA', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEF0F4', borderLeft: `3px solid ${sm.color}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 2 }}>{appt.client_name}</div>
            {appt.client_phone && <div style={{ fontSize: 12, color: '#64748B' }}>{appt.client_phone}</div>}
            {appt.client_address && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{appt.client_address}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 }}>
            <button onClick={() => setEditMode(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#F5F6F8', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Pencil size={11} strokeWidth={2} /> Edit
            </button>
            <span style={{ background: sm.bg, color: sm.color, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: '.6px' }}>
              {sm.label.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 14, alignItems: 'center' }}>
          {appt.appointment_time && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0A1628', fontWeight: 600 }}>
              <Clock size={13} strokeWidth={1.7} color="#64748B" />
              {fmt12h(appt.appointment_time)}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{dateLabel(appt.appointment_date)}</span>
          {appt.lead_source && <span style={{ fontSize: 12, color: '#94A3B8' }}>{appt.lead_source}</span>}
          {appt.assigned_to && <span style={{ fontSize: 12, color: '#94A3B8' }}>{appt.assigned_to}</span>}
        </div>

        {appt.notes && (
          <div style={{ margin: '0 16px 12px', fontSize: 12, color: '#64748B', background: '#F8FAFC', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
            {appt.notes}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #EEF0F4' }}>
          {appt.client_phone && (
            <a href={`tel:${appt.client_phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', background: appt.status === 'completed' ? '#F1F5F9' : '#EFF6FF', borderRadius: 9, fontSize: 12, fontWeight: 600, color: appt.status === 'completed' ? '#94A3B8' : '#2563EB', textDecoration: 'none', opacity: appt.status === 'completed' ? 0.7 : 1 }}>
              <Phone size={14} strokeWidth={1.7} /> Call
            </a>
          )}
          {appt.client_address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(appt.client_address)}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', background: appt.status === 'completed' ? '#F1F5F9' : '#F0FDF4', borderRadius: 9, fontSize: 12, fontWeight: 600, color: appt.status === 'completed' ? '#94A3B8' : '#0F8A6B', textDecoration: 'none', opacity: appt.status === 'completed' ? 0.7 : 1 }}>
              <MapPin size={14} strokeWidth={1.7} /> Map
            </a>
          )}
          {!appt.estimate_id && appt.status !== 'cancelled' && (
            <button onClick={() => createEstimate(appt)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', background: '#EFF6FF', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#2563EB', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <FileText size={14} strokeWidth={1.7} /> Start Estimate
            </button>
          )}
          {appt.estimate_id && (
            <button onClick={() => router.push(`/dashboard/estimates/${appt.estimate_id}`)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', background: '#EFF6FF', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#2563EB', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <FileText size={14} strokeWidth={1.7} /> View Estimate
            </button>
          )}
          <button onClick={() => deleteAppt(appt.id)} style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', borderRadius: 9, border: 'none', color: '#DC2626', cursor: 'pointer' }}>
            <Trash2 size={14} strokeWidth={1.7} />
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
      <Calendar size={32} color="#CBD5E1" strokeWidth={1.5} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No appointments</div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>Tap + New to book your first appointment.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>
            SCHEDULE
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
            Appointments
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>
            {todayCount} today{newLeads > 0 ? ` · ${newLeads} new lead${newLeads > 1 ? 's' : ''}` : ''}
          </span>
          <button
            className="appt-new-desktop"
            onClick={() => router.push('/dashboard/appointments/new')}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 14px 0', background: '#F5F6F8' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>}

        {!loading && (
          <>
            {filterBar}
            {filtered.length === 0 && emptyState}
            {groups.map(({ label, items }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase',
                  color: label === 'Today' ? 'var(--blue-dark)' : label === 'Yesterday' ? '#dc2626' : 'var(--ash)',
                  padding: '10px 0 8px', borderBottom: '1px solid var(--border-light)', marginBottom: 10,
                }}>
                  {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(appt => <ApptDetail key={appt.id} appt={appt} flash={flash} />)}
                </div>
              </div>
            ))}
          </>
        )}

        <div style={{ height: 100 }} />
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#0A1628', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
