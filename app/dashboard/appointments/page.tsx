'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, validateName, validatePhone, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import ConfirmModal from '@/components/ConfirmModal'
import BellButton from '@/components/BellButton'

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
  surface:      '#FAFAFB',
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
  estimate_number: string | null
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
const FILTERS = ['All', 'Upcoming', 'Done'] as const

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
const editErrStyle: React.CSSProperties = { fontSize: 11, color: '#C0341A', marginTop: 4 }
const editErrBorder = `1px solid ${T.red}`

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
  const [errors, setErrors] = useState<ClientErrors>({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  const setErr = (k: keyof ClientErrors, v: string | null) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: keyof ClientErrors) => setErr(k, null)

  useEffect(() => {
    if (appt) {
      setDraft({
        client_name:      appt.client_name,
        client_phone:     appt.client_phone  ?? '',
        client_address:   appt.client_address ?? '',
        lead_source:      appt.lead_source    ?? '',
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time ?? '',
      })
      setErrors({})
    }
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
    const nameErr  = validateName(draft.client_name ?? '')
    const phoneErr = validatePhone(draft.client_phone ?? '')
    const addrErr  = validateAddress(draft.client_address ?? '')
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_address: addrErr }
    setErrors(newErrors)
    if (hasErrors(newErrors)) return
    setSaving(true)
    await onSave(currentAppt.id, draft)
    setSaving(false)
  }

  async function handleDelete() {
    await onDelete(currentAppt.id)
  }

  return (
    <>
    <ConfirmModal
      open={deleteOpen}
      icon="trash"
      title="Delete appointment?"
      body={`${currentAppt.client_name} appointment will be permanently deleted. This cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={() => { setDeleteOpen(false); handleDelete() }}
      onCancel={() => setDeleteOpen(false)}
    />
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
            <input
              style={errors.client_name ? { ...inp, border: editErrBorder } : inp}
              value={draft.client_name ?? ''}
              onChange={e => { clearErr('client_name'); set('client_name')(e.target.value) }}
              onBlur={() => setErr('client_name', validateName(draft.client_name ?? ''))}
            />
            {errors.client_name && <div style={editErrStyle}>{errors.client_name}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input
                type="tel"
                style={errors.client_phone ? { ...inp, border: editErrBorder } : inp}
                value={draft.client_phone ?? ''}
                onChange={e => { clearErr('client_phone'); set('client_phone')(formatPhone(e.target.value)) }}
                onBlur={() => setErr('client_phone', validatePhone(draft.client_phone ?? ''))}
                placeholder="(403) 555-0100"
              />
              {errors.client_phone && <div style={editErrStyle}>{errors.client_phone}</div>}
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
            <input
              style={errors.client_address ? { ...inp, border: editErrBorder } : inp}
              value={draft.client_address ?? ''}
              onChange={e => { clearErr('client_address'); set('client_address')(e.target.value) }}
              onBlur={() => setErr('client_address', validateAddress(draft.client_address ?? ''))}
              placeholder="123 Main St"
            />
            {errors.client_address && <div style={editErrStyle}>{errors.client_address}</div>}
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
        <button onClick={() => setDeleteOpen(true)} style={{ marginTop: 24, width: '100%', height: 44, borderRadius: 10, background: 'transparent', color: T.red, border: `1px solid ${T.redSoft}`, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" /><path d="M10 11v6M14 11v6" /></svg>
          Delete appointment
        </button>
      </div>

      {/* Sticky bottom bar */}
      <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '14px 16px', paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 14px))', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || hasErrors(errors)} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: (saving || hasErrors(errors)) ? T.inkSoft : T.blue, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (saving || hasErrors(errors)) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
    </>
  )
}

// ─── Desktop: list row ───────────────────────────────────────────────────────
function DesktopListRow({ appt, active, onClick }: { appt: Appt; active: boolean; onClick: () => void }) {
  const ds = toDesignStatus(appt.status)
  const rc = { upcoming: T.blue, completed: T.green, canceled: T.red }[ds]
  const dimmed = (ds === 'completed' || ds === 'canceled') && !active
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', textAlign: 'left', width: '100%',
        background: active ? T.blueSoft : T.card,
        border: 'none', borderBottom: `1px solid ${T.border}`,
        padding: '14px 16px 14px 22px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        opacity: dimmed ? 0.62 : 1,
        transition: 'background 160ms ease, opacity 160ms ease',
        cursor: 'pointer',
      }}
    >
      <span style={{ position: 'absolute', left: 12, top: 16, bottom: 16, width: 3, background: rc, borderRadius: 99 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {appt.client_name}
        </div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {appt.client_address || 'No address'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {appt.appointment_time && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
            {fmt12h(appt.appointment_time)}
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          <StatusTag status={ds} />
        </div>
      </div>
    </button>
  )
}

// ─── Desktop: section header ─────────────────────────────────────────────────
function DesktopSectionHeader({ label, color, count }: { label: string; color: string; count: string }) {
  return (
    <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', background: T.surface }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' as const }}>
        {label}
      </span>
      <span style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{count}</span>
    </div>
  )
}

// ─── Desktop: detail view panel ──────────────────────────────────────────────
function DesktopViewPanel({ appt, onEdit, onCreateEstimate, onViewEstimate }: {
  appt: Appt
  onEdit: () => void
  onCreateEstimate: (a: Appt) => void
  onViewEstimate: (id: string) => void
}) {
  const ds = toDesignStatus(appt.status)
  const dl = dateLabel(appt.appointment_date)

  const btnBase: React.CSSProperties = {
    height: 40, padding: '0 14px', borderRadius: 10,
    border: `1px solid ${T.border}`, background: T.card, color: T.inkMid,
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 40px', maxWidth: 880 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StatusTag status={ds} />
            <span style={{ color: T.inkFaint }}>·</span>
            <span style={{ fontSize: 12, color: T.inkSoft }}>
              {dl}{appt.appointment_time ? ` at ${fmt12h(appt.appointment_time)}` : ''}
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
            {appt.client_name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          {appt.client_phone && (
            <a href={`tel:${appt.client_phone}`} style={btnBase}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
              Call
            </a>
          )}
          {appt.client_address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(appt.client_address)}`} target="_blank" rel="noreferrer" style={btnBase}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
              Map
            </a>
          )}
          <button onClick={onEdit} style={btnBase}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M14 6l4 4" /></svg>
            Edit
          </button>
        </div>
      </div>

      {/* Info card */}
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: '4px 20px', marginBottom: 20 }}>
        {[
          { label: 'Phone',       value: fmtPhone(appt.client_phone), mono: true },
          { label: 'Address',     value: appt.client_address || '—' },
          { label: 'Date & time', value: `${dl}, ${appt.appointment_date}${appt.appointment_time ? ` · ${fmt12h(appt.appointment_time)}` : ''}`, mono: true },
          { label: 'Lead source', value: appt.lead_source || '—' },
        ].map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const }}>{label}</div>
            <div style={{ fontSize: 14, color: value === '—' ? T.inkFaint : T.ink, fontVariantNumeric: mono ? 'tabular-nums' : 'normal' as const }}>{value || '—'}</div>
          </div>
        ))}
        {/* Notes row — no bottom border */}
        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const, marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 14, color: appt.notes ? T.ink : T.inkFaint, lineHeight: 1.55 }}>
            {appt.notes || 'No notes'}
          </div>
        </div>
      </div>

      {/* Estimate card */}
      {appt.estimate_id ? (
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const }}>Estimate</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginTop: 2, letterSpacing: '-0.01em' }}>
                {appt.estimate_number ?? '—'}
              </div>
            </div>
          </div>
          <button onClick={() => onViewEstimate(appt.estimate_id!)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            View estimate
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      ) : ds !== 'canceled' ? (
        <div style={{ background: T.blueSoft, borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DBE6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.blue, textTransform: 'uppercase' as const }}>No estimate yet</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginTop: 2 }}>Quote this visit when you're ready.</div>
            </div>
          </div>
          <button onClick={() => onCreateEstimate(appt)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Create estimate
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ─── Desktop: edit panel ────────────────────────────────────────────────────
function DesktopEditPanel({ appt, onCancel, onSave, onDelete }: {
  appt: Appt
  onCancel: () => void
  onSave: (id: string, patch: Partial<Appt>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<Partial<Appt>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ClientErrors>({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  const setErr = (k: keyof ClientErrors, v: string | null) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: keyof ClientErrors) => setErr(k, null)

  useEffect(() => {
    setDraft({
      client_name:      appt.client_name,
      client_phone:     appt.client_phone  ?? '',
      client_address:   appt.client_address ?? '',
      lead_source:      appt.lead_source    ?? '',
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time ?? '',
      notes:            appt.notes ?? '',
    })
    setErrors({})
  }, [appt.id])

  const ds  = toDesignStatus(appt.status)
  const set = (k: keyof Appt) => (v: string) => setDraft(p => ({ ...p, [k]: v }))

  const inp: React.CSSProperties = {
    width: '100%', height: 42, padding: '0 14px', borderRadius: 10,
    border: `1px solid ${T.borderStrong}`, background: T.card, color: T.ink,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const chevSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`
  const fldLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const secHdr: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase', padding: '4px 4px 10px' }
  const secCard: React.CSSProperties = { background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

  async function handleSave() {
    const nameErr  = validateName(draft.client_name ?? '')
    const phoneErr = validatePhone(draft.client_phone ?? '')
    const addrErr  = validateAddress(draft.client_address ?? '')
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_address: addrErr }
    setErrors(newErrors)
    if (hasErrors(newErrors)) return
    setSaving(true)
    await onSave(appt.id, draft)
    setSaving(false)
  }
  async function handleDelete() {
    await onDelete(appt.id)
  }

  return (
    <>
    <ConfirmModal
      open={deleteOpen}
      icon="trash"
      title="Delete appointment?"
      body={`${appt.client_name} appointment will be permanently deleted. This cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={() => { setDeleteOpen(false); handleDelete() }}
      onCancel={() => setDeleteOpen(false)}
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 24px', maxWidth: 880 }}>
        {/* Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <StatusTag status={ds} />
          <span style={{ color: T.inkFaint }}>·</span>
          <span style={{ fontSize: 12, color: T.inkSoft }}>Edit mode</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', marginBottom: 20 }}>
          Edit appointment
        </div>

        {/* CLIENT */}
        <div style={secHdr}>Client</div>
        <div style={secCard}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={fldLbl}>Name</label>
            <input
              style={errors.client_name ? { ...inp, border: editErrBorder } : inp}
              value={draft.client_name ?? ''}
              onChange={e => { clearErr('client_name'); set('client_name')(e.target.value) }}
              onBlur={() => setErr('client_name', validateName(draft.client_name ?? ''))}
            />
            {errors.client_name && <div style={editErrStyle}>{errors.client_name}</div>}
          </div>
          <div>
            <label style={fldLbl}>Phone</label>
            <input
              type="tel"
              style={errors.client_phone ? { ...inp, border: editErrBorder } : inp}
              value={draft.client_phone ?? ''}
              onChange={e => { clearErr('client_phone'); set('client_phone')(formatPhone(e.target.value)) }}
              onBlur={() => setErr('client_phone', validatePhone(draft.client_phone ?? ''))}
              placeholder="(403) 555-0100"
            />
            {errors.client_phone && <div style={editErrStyle}>{errors.client_phone}</div>}
          </div>
          <div>
            <label style={fldLbl}>Source</label>
            <select style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }}
              value={draft.lead_source ?? ''} onChange={e => set('lead_source')(e.target.value)}>
              <option value="">Select source</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={fldLbl}>Address</label>
            <input
              style={errors.client_address ? { ...inp, border: editErrBorder } : inp}
              value={draft.client_address ?? ''}
              onChange={e => { clearErr('client_address'); set('client_address')(e.target.value) }}
              onBlur={() => setErr('client_address', validateAddress(draft.client_address ?? ''))}
              placeholder="123 Main St"
            />
            {errors.client_address && <div style={editErrStyle}>{errors.client_address}</div>}
          </div>
        </div>

        {/* WHEN */}
        <div style={{ ...secHdr, paddingTop: 20 }}>When</div>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={fldLbl}>Date</label>
            <input type="date" style={inp} value={draft.appointment_date ?? ''} onChange={e => set('appointment_date')(e.target.value)} />
          </div>
          <div>
            <label style={fldLbl}>Time</label>
            <input type="time" style={inp} value={draft.appointment_time ?? ''} onChange={e => set('appointment_time')(e.target.value)} />
          </div>
        </div>

        {/* NOTES */}
        <div style={{ ...secHdr, paddingTop: 20 }}>Notes</div>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18 }}>
          <textarea
            style={{ ...inp, height: 96, padding: 14, resize: 'vertical' as const }}
            value={draft.notes ?? ''}
            onChange={e => set('notes')(e.target.value)}
            placeholder="What does the client need?"
          />
        </div>

        {/* Delete */}
        <button onClick={() => setDeleteOpen(true)} style={{ marginTop: 24, height: 42, padding: '0 18px', borderRadius: 10, background: 'transparent', color: T.red, border: `1px solid ${T.redSoft}`, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" /><path d="M10 11v6M14 11v6" /></svg>
          Delete appointment
        </button>
      </div>

      {/* Sticky save bar */}
      <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ height: 44, padding: '0 22px', borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || hasErrors(errors)} style={{ height: 44, padding: '0 26px', borderRadius: 10, border: 'none', background: (saving || hasErrors(errors)) ? T.inkSoft : T.blue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (saving || hasErrors(errors)) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
    </>
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
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [desktopEditing, setDesktopEditing] = useState(false)
  const [desktopFilter, setDesktopFilter] = useState<'All' | 'Upcoming' | 'Done'>('All')
  const [search, setSearch] = useState('')

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: rows } = await supabase
      .from('appointments').select('*').eq('user_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true, nullsFirst: false })
    const appts = rows || []
    const estIds = appts.flatMap(a => a.estimate_id ? [a.estimate_id as string] : [])
    let estMap = new Map<string, string>()
    if (estIds.length > 0) {
      const { data: ests } = await supabase.from('estimates').select('id, estimate_number').in('id', estIds)
      estMap = new Map((ests ?? []).map(e => [e.id, e.estimate_number]))
    }
    setAppts(appts.map(a => ({ ...a, estimate_number: a.estimate_id ? (estMap.get(a.estimate_id) ?? null) : null })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Computed values ───────────────────────────────────────────────────────
  const now      = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayCount = appts.filter(a => a.appointment_date === todayStr).length

  const filtered: Appt[] = (() => {
    if (filter === 'Upcoming') return appts.filter(a => toDesignStatus(a.status) === 'upcoming')
    if (filter === 'Done')     return appts.filter(a => toDesignStatus(a.status) !== 'upcoming')
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
    return order.map(lbl => {
      const items = map.get(lbl)!.slice().sort((a, b) => {
        // upcoming first, done/canceled last
        const aRank = toDesignStatus(a.status) === 'upcoming' ? 0 : 1
        const bRank = toDesignStatus(b.status) === 'upcoming' ? 0 : 1
        if (aRank !== bRank) return aRank - bRank
        // within same status group — sort by time ascending
        const aT = a.appointment_time ?? ''
        const bT = b.appointment_time ?? ''
        return aT < bT ? -1 : aT > bT ? 1 : 0
      })
      return { label: lbl, items }
    })
  }

  // future sorted ascending (tomorrow first), past reversed so yesterday is first
  const future = filtered.filter(a => a.appointment_date > todayStr)
  const today  = filtered.filter(a => a.appointment_date === todayStr)
  const past   = [...filtered.filter(a => a.appointment_date < todayStr)].sort(
    (a, b) => a.appointment_date < b.appointment_date ? -1 : 1
  )
  const groups = [
    ...buildGroups(today),
    ...buildGroups(future),
    ...buildGroups(past).reverse(),
  ]

  // ── Desktop computed ─────────────────────────────────────────────────────
  const deskUpcomingList = appts.filter(a => toDesignStatus(a.status) === 'upcoming')
  const deskDoneList     = appts.filter(a => toDesignStatus(a.status) !== 'upcoming')
  const deskCounts = { all: appts.length, upcoming: deskUpcomingList.length, done: deskDoneList.length }

  const deskBase: Appt[] = (() => {
    if (desktopFilter === 'Upcoming') return deskUpcomingList
    if (desktopFilter === 'Done')     return deskDoneList
    return appts
  })()

  const deskFiltered = search.trim()
    ? deskBase.filter(a =>
        a.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.client_address ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : deskBase

  const deskToday  = deskFiltered.filter(a => a.appointment_date === todayStr)
  const deskFuture = deskFiltered.filter(a => a.appointment_date > todayStr)
  const deskPast   = [...deskFiltered.filter(a => a.appointment_date < todayStr)].sort(
    (a, b) => a.appointment_date < b.appointment_date ? -1 : 1
  )
  const deskGroups = [
    ...buildGroups(deskToday),
    ...buildGroups(deskFuture),
    ...buildGroups(deskPast).reverse(),
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

  async function desktopSaveEdit(id: string, patch: Partial<Appt>) {
    await supabase.from('appointments').update({
      client_name:      patch.client_name?.trim(),
      client_phone:     patch.client_phone?.trim()   || null,
      client_address:   patch.client_address?.trim() || null,
      lead_source:      patch.lead_source?.trim()    || null,
      appointment_date: patch.appointment_date,
      appointment_time: patch.appointment_time       || null,
      notes:            patch.notes?.trim()          || null,
    }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    setDesktopEditing(false)
    flash('Saved')
  }

  async function desktopDeleteAppt(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppts(prev => prev.filter(a => a.id !== id))
    setSelectedId(null)
    setDesktopEditing(false)
    flash('Deleted')
  }

  async function createEstimate(appt: Appt) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    setAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'completed' } : a))
    router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client_name)}&client_address=${encodeURIComponent(appt.client_address || '')}`)
  }

  // ── Desktop render ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: T.bg,
        fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* Header */}
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase' }}>
            Schedule
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Appointments</div>
              <span style={{ fontSize: 13.5, color: T.inkSoft, paddingBottom: 2 }}>
                <span style={{ fontWeight: 600, color: T.ink }}>{todayCount} today</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search */}
              <div style={{ width: 280, height: 40, background: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.inkSoft} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search client or address"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: T.ink, fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: T.card, border: `1px solid ${T.border}`, color: T.inkSoft, flexShrink: 0 }}>⌘K</span>
              </div>
              {/* Bell */}
              <button style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16V11a6 6 0 10-12 0v5l-2 3h16z" /><path d="M10 21h4" /></svg>
              </button>
              {/* New appointment */}
              <button
                onClick={() => router.push('/dashboard/appointments/new')}
                style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                New appointment
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['All', 'Upcoming', 'Done'] as const).map(f => {
              const active = desktopFilter === f
              const count = f === 'All' ? deskCounts.all : f === 'Upcoming' ? deskCounts.upcoming : deskCounts.done
              return (
                <button key={f} onClick={() => { setDesktopFilter(f); setDesktopEditing(false) }} style={{
                  padding: '7px 12px', borderRadius: 99,
                  border: `1px solid ${active ? T.blue : T.borderStrong}`,
                  background: active ? T.blueSoft : T.card,
                  color: active ? T.blue : T.inkMid,
                  fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {f}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: active ? T.blue : 'rgba(15,23,42,0.06)', color: active ? '#fff' : T.inkSoft }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <span style={{ fontSize: 12.5, color: T.inkSoft }}>Last synced just now</span>
        </div>

        {/* Master-detail */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Left column — 420px flat list */}
          <div style={{
            width: 420, flexShrink: 0,
            background: T.surface,
            borderRight: `1px solid ${T.border}`,
            overflowY: 'auto',
          }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: T.inkSoft, fontSize: 13 }}>Loading…</div>
            )}
            {!loading && deskFiltered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: T.inkSoft, fontSize: 13 }}>No appointments.</div>
            )}
            {!loading && deskGroups.map(({ label, items }) => (
              <div key={label}>
                <DesktopSectionHeader
                  label={label}
                  color={sectionColor(label)}
                  count={`${items.length} ${items.length === 1 ? 'visit' : 'visits'}`}
                />
                {items.map(appt => (
                  <DesktopListRow
                    key={appt.id}
                    appt={appt}
                    active={selectedId === appt.id}
                    onClick={() => { setSelectedId(appt.id); setDesktopEditing(false) }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Right column — empty / view / edit */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
            {(() => {
              const sel = appts.find(a => a.id === selectedId) ?? null
              if (!sel) {
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: T.inkSoft, fontSize: 14 }}>Select an appointment to see details.</div>
                  </div>
                )
              }
              if (desktopEditing) {
                return (
                  <DesktopEditPanel
                    appt={sel}
                    onCancel={() => setDesktopEditing(false)}
                    onSave={desktopSaveEdit}
                    onDelete={desktopDeleteAppt}
                  />
                )
              }
              return (
                <DesktopViewPanel
                  appt={sel}
                  onEdit={() => setDesktopEditing(true)}
                  onCreateEstimate={createEstimate}
                  onViewEstimate={id => router.push(`/dashboard/estimates/${id}`)}
                />
              )
            })()}
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: T.ink, color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {toast}
          </div>
        )}
      </div>
    )
  }

  // ── Mobile render ────────────────────────────────────────────────────────────
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase', marginBottom: 2 }}>
            Schedule
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.4px' }}>
              Appointments
            </div>
            <span style={{ fontSize: 13, color: T.inkSoft }}>{todayCount} today</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BellButton />
          <button
            onClick={() => router.push('/dashboard/appointments/new')}
            style={{ background: T.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New
          </button>
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
