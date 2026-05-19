'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:           '#F3F4F6',
  card:         '#FFFFFF',
  border:       'rgba(15,23,42,0.06)',
  borderStrong: 'rgba(15,23,42,0.10)',
  ink:          '#0B1220',
  inkMid:       '#475467',
  inkSoft:      '#8A94A6',
  inkFaint:     '#B3BAC6',
  blue:         '#2563EB',
  blueSoft:     '#EFF4FF',
  green:        '#16A34A',
  red:          '#C0341A',
  redSoft:      '#FBE9E4',
  yesterday:    '#DC2626',
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Appt {
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
  estimate_id: string | null
}

type DesignStatus = 'upcoming' | 'completed' | 'canceled'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDesignStatus(s: string): DesignStatus {
  if (s === 'completed') return 'completed'
  if (s === 'cancelled') return 'canceled'
  return 'upcoming'
}

function fmtPhone(p: string | null): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length >= 8) return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
  return d
}

function fmt12h(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function dateLabel(ds: string): string {
  const [y, mo, d] = ds.split('-').map(Number)
  const appt = new Date(y, mo - 1, d)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((appt.getTime() - now.getTime()) / 86400000)
  if (diff === -1) return 'Yesterday'
  if (diff === 0)  return 'Today'
  if (diff === 1)  return 'Tomorrow'
  return appt.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
}

function sectionColor(label: string): string {
  if (label === 'Today')     return T.blue
  if (label === 'Yesterday') return T.yesterday
  return T.inkSoft
}

const SOURCES = ['Phone call', 'Referral', 'Web form', 'Walk-in', 'Repeat client']
const FILTERS = ['All', 'Upcoming', 'Completed'] as const

// ─── StatusTag ────────────────────────────────────────────────────────────────
function StatusTag({ status }: { status: DesignStatus }) {
  const dot   = { upcoming: T.blue, completed: T.green, canceled: T.red }[status]
  const label = { upcoming: 'Upcoming', completed: 'Done', canceled: 'Canceled' }[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: T.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: dot, flexShrink: 0 }} />
      {label}
    </span>
  )
}

// ─── AppointmentCard ──────────────────────────────────────────────────────────
function AppointmentCard({
  appt, expanded, onToggle, onEdit, onCreateEstimate, onViewEstimate,
}: {
  appt: Appt
  expanded: boolean
  onToggle: () => void
  onEdit: (a: Appt) => void
  onCreateEstimate: (a: Appt) => void
  onViewEstimate: (id: string) => void
}) {
  const ds        = toDesignStatus(appt.status)
  const railColor = { upcoming: T.blue, completed: T.green, canceled: T.red }[ds]
  const faded     = (ds === 'completed' || ds === 'canceled') && !expanded

  return (
    <div
      onClick={onToggle}
      style={{
        position: 'relative', background: T.card, borderRadius: 14,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: expanded
          ? '0 4px 12px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)'
          : '0 1px 2px rgba(15,23,42,0.04)',
        border: `1px solid ${expanded ? 'rgba(15,23,42,0.08)' : T.border}`,
        opacity: faded ? 0.62 : 1,
        transition: 'box-shadow 200ms ease, opacity 200ms ease',
      }}
    >
      {/* Status rail */}
      <div style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 4,
        background: railColor, borderRadius: 99,
      }} />

      {/* Collapsed header — always visible */}
      <div style={{ padding: '12px 12px 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {appt.client_name}
            </div>
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              {appt.appointment_time && (
                <span style={{ fontSize: 13, color: T.inkMid, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt12h(appt.appointment_time)}
                </span>
              )}
              <span style={{ width: 3, height: 3, borderRadius: 99, background: T.inkFaint, flexShrink: 0 }} />
              <StatusTag status={ds} />
            </div>
          </div>
          {/* Chevron */}
          <div style={{
            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.inkSoft, transition: 'transform 220ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded body — animated */}
      <div style={{
        maxHeight: expanded ? 400 : 0, opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 280ms ease, opacity 220ms ease',
      }}>
        <div style={{ padding: '0 12px 12px 16px' }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            {appt.client_phone && (
              <div style={{ fontSize: 13, color: T.ink, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {fmtPhone(appt.client_phone)}
              </div>
            )}
            {appt.client_address && (
              <div style={{ fontSize: 13, color: T.inkMid, marginTop: 3 }}>
                {appt.client_address}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {appt.client_phone && (
              <a href={`tel:${appt.client_phone}`} onClick={e => e.stopPropagation()}
                style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
                Call
              </a>
            )}
            {appt.client_address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(appt.client_address)}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
                Map
              </a>
            )}
            {appt.estimate_id ? (
              <button onClick={e => { e.stopPropagation(); onViewEstimate(appt.estimate_id!) }}
                style={{ flex: 1.6, height: 36, borderRadius: 9, border: 'none', background: T.blue, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
                View estimate
              </button>
            ) : ds !== 'canceled' ? (
              <button onClick={e => { e.stopPropagation(); onCreateEstimate(appt) }}
                style={{ flex: 1.6, height: 36, borderRadius: 9, border: 'none', background: T.blueSoft, color: T.blue, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Create estimate
              </button>
            ) : null}
          </div>

          {/* Edit appointment row */}
          <button onClick={e => { e.stopPropagation(); onEdit(appt) }}
            style={{ marginTop: 6, width: '100%', height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: T.inkMid, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M14 6l4 4" /></svg>
            Edit appointment
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── EditScreen ───────────────────────────────────────────────────────────────
function EditScreen({
  open, appt, onClose, onSave, onDelete,
}: {
  open: boolean
  appt: Appt | null
  onClose: () => void
  onSave: (id: string, patch: Partial<Appt>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<Partial<Appt>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (appt) setDraft({
      client_name:      appt.client_name,
      client_phone:     appt.client_phone  ?? '',
      client_address:   appt.client_address ?? '',
      lead_source:      appt.lead_source    ?? '',
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time ?? '',
    })
  }, [appt?.id])

  if (!appt) return null
  const currentAppt = appt
  const ds  = toDesignStatus(currentAppt.status)
  const set = (k: keyof Appt) => (v: string) => setDraft(p => ({ ...p, [k]: v }))

  const inp: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
    border: `1px solid ${T.borderStrong}`, background: T.card, color: T.ink,
    fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft,
    textTransform: 'uppercase', marginBottom: 6, display: 'block',
  }
  const sectionHdr: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: T.inkSoft,
    textTransform: 'uppercase', padding: '4px 4px 10px',
  }
  const sectionCard: React.CSSProperties = {
    background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
    padding: 14, display: 'flex', flexDirection: 'column', gap: 14,
  }

  async function handleSave() {
    if (!draft.client_name?.trim()) return
    setSaving(true)
    await onSave(currentAppt.id, draft)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this appointment?')) return
    await onDelete(currentAppt.id)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: T.bg,
      transform: open ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 320ms cubic-bezier(.32,.72,0,1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: 'max(60px, calc(env(safe-area-inset-top) + 16px)) 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase' }}>Schedule</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', marginTop: 1 }}>Edit appointment</div>
          </div>
          <StatusTag status={ds} />
        </div>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {/* CLIENT */}
        <div style={sectionHdr}>Client</div>
        <div style={sectionCard}>
          <div>
            <label style={fieldLabel}>Name</label>
            <input style={inp} value={draft.client_name ?? ''} onChange={e => set('client_name')(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input type="tel" style={inp} value={draft.client_phone ?? ''} onChange={e => set('client_phone')(e.target.value)} placeholder="(403) 555-0100" />
            </div>
            <div>
              <label style={fieldLabel}>Source</label>
              <select
                style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }}
                value={draft.lead_source ?? ''}
                onChange={e => set('lead_source')(e.target.value)}
              >
                <option value="">Select source</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Address</label>
            <input style={inp} value={draft.client_address ?? ''} onChange={e => set('client_address')(e.target.value)} placeholder="123 Main St" />
          </div>
        </div>

        {/* WHEN */}
        <div style={{ ...sectionHdr, paddingTop: 20 }}>When</div>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={fieldLabel}>Date</label>
            <input type="date" style={inp} value={draft.appointment_date ?? ''} onChange={e => set('appointment_date')(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>Time</label>
            <input type="time" style={inp} value={draft.appointment_time ?? ''} onChange={e => set('appointment_time')(e.target.value)} />
          </div>
        </div>

        {/* DELETE */}
        <button onClick={handleDelete} style={{ marginTop: 24, width: '100%', height: 44, borderRadius: 10, background: 'transparent', color: T.red, border: `1px solid ${T.redSoft}`, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" /><path d="M10 11v6M14 11v6" /></svg>
          Delete appointment
        </button>
      </div>

      {/* Sticky bottom bar */}
      <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '14px 16px', paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 14px))', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: saving ? T.inkSoft : T.blue, color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [appts, setAppts]       = useState<Appt[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<typeof FILTERS[number]>('All')
  const [openId, setOpenId]     = useState<string | null>(null)
  const [editing, setEditing]   = useState<Appt | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [toast, setToast]       = useState('')

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data } = await supabase
      .from('appointments').select('*').eq('user_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true, nullsFirst: false })
    setAppts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Computed values ───────────────────────────────────────────────────────
  const now      = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayCount = appts.filter(a => a.appointment_date === todayStr).length

  const filtered: Appt[] = (() => {
    if (filter === 'Upcoming')  return appts.filter(a => a.appointment_date >= todayStr && a.status !== 'cancelled')
    if (filter === 'Completed') return appts.filter(a => a.status === 'completed')
    return appts
  })()

  function buildGroups(list: Appt[]) {
    const map = new Map<string, Appt[]>()
    const order: string[] = []
    list.forEach(a => {
      const lbl = dateLabel(a.appointment_date)
      if (!map.has(lbl)) { map.set(lbl, []); order.push(lbl) }
      map.get(lbl)!.push(a)
    })
    return order.map(lbl => ({ label: lbl, items: map.get(lbl)! }))
  }

  const future = filtered.filter(a => a.appointment_date > todayStr)
  const today  = filtered.filter(a => a.appointment_date === todayStr)
  const past   = filtered.filter(a => a.appointment_date < todayStr)
  const groups = [
    ...buildGroups(today),
    ...buildGroups(future),
    ...buildGroups(past).reverse(),
  ]

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id)

  function openEdit(a: Appt) { setEditing(a); setEditOpen(true) }
  function closeEdit()       { setEditOpen(false); setTimeout(() => setEditing(null), 350) }

  async function saveEdit(id: string, patch: Partial<Appt>) {
    await supabase.from('appointments').update({
      client_name:      patch.client_name?.trim(),
      client_phone:     patch.client_phone?.trim()   || null,
      client_address:   patch.client_address?.trim() || null,
      lead_source:      patch.lead_source?.trim()    || null,
      appointment_date: patch.appointment_date,
      appointment_time: patch.appointment_time       || null,
    }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    closeEdit()
    flash('Saved')
  }

  async function deleteAppt(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppts(prev => prev.filter(a => a.id !== id))
    closeEdit()
    flash('Deleted')
  }

  async function createEstimate(appt: Appt) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    setAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'completed' } : a))
    router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client_name)}&client_address=${encodeURIComponent(appt.client_address || '')}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg,
      fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Header */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: '16px 20px 18px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase' }}>
          Schedule
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
            Appointments
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: T.inkSoft }}>{todayCount} today</span>
            <button
              onClick={() => router.push('/dashboard/appointments/new')}
              style={{ background: T.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, background: T.card, borderBottom: `1px solid ${T.border}` }}>
        {FILTERS.map(f => {
          const active = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 99,
              border: `1px solid ${active ? T.blue : T.borderStrong}`,
              background: active ? T.blueSoft : T.card,
              color: active ? T.blue : T.inkMid,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14,
            }}>
              {f}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: T.inkSoft, fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: T.inkSoft, fontSize: 13 }}>
            No appointments. Tap + New to add one.
          </div>
        )}

        {!loading && groups.map(({ label, items }) => (
          <div key={label}>
            {/* Section header */}
            <div style={{ padding: '14px 16px 4px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: sectionColor(label) }}>
                {label.toUpperCase()}
              </div>
              <div style={{ height: 1, background: T.border, marginTop: 6 }} />
            </div>
            {/* Cards */}
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(appt => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  expanded={openId === appt.id}
                  onToggle={() => toggle(appt.id)}
                  onEdit={openEdit}
                  onCreateEstimate={createEstimate}
                  onViewEstimate={id => router.push(`/dashboard/estimates/${id}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit screen overlay */}
      <EditScreen
        open={editOpen}
        appt={editing}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={deleteAppt}
      />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: T.ink, color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
