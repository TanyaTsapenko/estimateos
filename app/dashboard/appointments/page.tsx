'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Phone, MapPin, Pencil, Calendar } from 'lucide-react'
import { formatPhone, validateName, validatePhone, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import { TAX_RATES } from '@/lib/pricing'
import ConfirmModal from '@/components/ConfirmModal'
import TimePickerDropdown from '@/components/TimePickerDropdown'

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
  greenDeep:    '#0F8A4D',
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
  client_city: string | null
  client_province: string | null
  postal_code: string | null
  appointment_date: string
  appointment_time: string | null
  notes: string | null
  lead_source: string | null
  status: string
  estimate_id: string | null
  estimate_number: string | null
}

interface TimelineAppt {
  id: string
  name: string
  rawTime: string | null
  hour: number
  phone: string
  address: string
  status: 'upcoming' | 'completed'
  estimateId: string | null
  estTotal: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPostal(v: string) {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length > 3 ? raw.slice(0, 3) + ' ' + raw.slice(3, 6) : raw
}

type DesignStatus = 'upcoming' | 'completed' | 'canceled'

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

function fmtTimeParts(t: string | null): { time: string; ampm: string } {
  if (!t) return { time: '—', ampm: '' }
  const [h, m] = t.split(':').map(Number)
  return {
    time: `${h % 12 || 12}:${m.toString().padStart(2, '0')}`,
    ampm: h >= 12 ? 'PM' : 'AM',
  }
}

function toHour(t: string | null): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function getDayDateStr(day: 'yesterday' | 'today' | 'tomorrow' | string): string {
  const d = new Date()
  if (day === 'yesterday') d.setDate(d.getDate() - 1)
  if (day === 'tomorrow') d.setDate(d.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getEyebrow(day: 'yesterday' | 'today' | 'tomorrow' | string): string {
  const d = new Date()
  if (day === 'yesterday') d.setDate(d.getDate() - 1)
  if (day === 'tomorrow') d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  return `${weekday}, ${monthDay}`
}

function dateLabel(ds: string): string {
  const [y, mo, d] = ds.split('-').map(Number)
  const appt = new Date(y, mo - 1, d)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((appt.getTime() - now.getTime()) / 86400000)
  if (diff === -1) return 'Yesterday'
  if (diff === 0)  return 'Today'
  if (diff === 1)  return 'Tomorrow'
  return new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'short', day: 'numeric' }).format(appt)
}

function sectionColor(label: string): string {
  if (label === 'Today')     return T.blue
  if (label === 'Yesterday') return T.yesterday
  return T.inkSoft
}

const SOURCES = ['Phone call', 'Referral', 'Web form', 'Walk-in', 'Repeat client']

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

// ─── NowRow ───────────────────────────────────────────────────────────────────
function NowRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0 10px' }}>
      <div style={{ width: 52, flexShrink: 0, paddingRight: 10, textAlign: 'right' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', letterSpacing: '0.04em' }}>NOW</span>
      </div>
      <div style={{ width: 26, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB', boxShadow: '0 0 0 3px rgba(37,99,235,0.18)' }} />
      </div>
      <div style={{ flex: 1, height: 2, background: 'rgba(37,99,235,0.4)', borderRadius: 99 }} />
    </div>
  )
}

// ─── TimelineRow ──────────────────────────────────────────────────────────────
function TimelineRow({ appt, isLast, expanded, onToggle, onNavigate }: {
  appt: TimelineAppt
  isLast: boolean
  expanded: boolean
  onToggle: () => void
  onNavigate: (path: string) => void
}) {
  const { time, ampm } = fmtTimeParts(appt.rawTime)
  const dotColor = appt.status === 'completed' ? '#16A34A' : '#2563EB'

  return (
    <div style={{ display: 'flex', marginBottom: 10 }}>
      {/* Time col */}
      <div style={{ width: 52, flexShrink: 0, paddingTop: 13, paddingRight: 8, textAlign: 'right' }}>
        {appt.rawTime ? (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B1220', lineHeight: 1.15 }}>{time}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#B3BAC6', marginTop: 1 }}>{ampm}</div>
          </>
        ) : (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B3BAC6' }}>—</div>
        )}
      </div>

      {/* Rail col */}
      <div style={{ width: 26, flexShrink: 0, position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          width: 2, top: 0,
          height: isLast ? 26 : 'calc(100% + 10px)',
          background: 'rgba(15,23,42,0.08)',
        }} />
        <div style={{
          position: 'absolute', top: 14,
          width: 13, height: 13, borderRadius: '50%',
          background: '#fff', border: `3px solid ${dotColor}`, zIndex: 1,
        }} />
      </div>

      {/* Card */}
      <div
        onClick={e => { e.stopPropagation(); onToggle() }}
        style={{
          flex: 1, minWidth: 0, background: '#fff', borderRadius: 14,
          overflow: 'hidden', cursor: 'pointer',
          border: `1px solid ${expanded ? 'rgba(15,23,42,0.13)' : 'rgba(15,23,42,0.08)'}`,
          boxShadow: expanded ? '0 6px 18px -10px rgba(15,23,42,0.25)' : 'none',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        {/* Collapsed header */}
        <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {appt.name}
            </div>
            <div style={{ fontSize: 12.5, color: '#8A94A6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
              {appt.address || 'No address'}
            </div>
          </div>
          {!expanded && (
            appt.estimateId ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F8A4D', flexShrink: 0 }}>
                {appt.estTotal}
              </div>
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onNavigate(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.name)}&client_address=${encodeURIComponent(appt.address)}`)
                }}
                style={{
                  height: 30, padding: '0 11px', borderRadius: 9,
                  background: '#EFF4FF', border: 'none',
                  color: '#2563EB', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                + Est
              </button>
            )
          )}
        </div>

        {/* Expanded body — grid animation */}
        <div style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.26s ease',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid rgba(15,23,42,0.08)', padding: '0 12px 12px' }}>
              {/* Action row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <a
                  href={`tel:${appt.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, height: 42, borderRadius: 11,
                    border: '1px solid rgba(15,23,42,0.08)', background: '#fff',
                    color: '#475467', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={14} strokeWidth={1.7} />
                  Call
                </a>
                <a
                  href={`https://maps.apple.com/?q=${encodeURIComponent(appt.address)}`}
                  onClick={e => e.stopPropagation()}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, height: 42, borderRadius: 11,
                    border: '1px solid rgba(15,23,42,0.08)', background: '#fff',
                    color: '#475467', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <MapPin size={14} strokeWidth={1.7} />
                  Map
                </a>
                <button
                  onClick={e => { e.stopPropagation(); onNavigate(`/dashboard/appointments/${appt.id}/edit`) }}
                  style={{
                    width: 46, height: 42, borderRadius: 11,
                    border: '1px solid rgba(15,23,42,0.08)', background: '#fff',
                    color: '#475467', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Pencil size={14} strokeWidth={1.7} />
                </button>
              </div>

              {/* Phone line */}
              {appt.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, color: '#8A94A6' }}>
                  <Phone size={13} strokeWidth={1.7} />
                  {fmtPhone(appt.phone)}
                </div>
              )}

              {/* Primary estimate button */}
              {appt.estimateId ? (
                <button
                  onClick={e => { e.stopPropagation(); onNavigate(`/dashboard/estimates/${appt.estimateId}`) }}
                  style={{
                    display: 'block', width: '100%', height: 50, marginTop: 12, borderRadius: 13,
                    border: 'none', background: '#2563EB', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 8px 20px -6px rgba(37,99,235,0.55)',
                  }}
                >
                  View estimate · {appt.estTotal}
                </button>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); onNavigate(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.name)}&client_address=${encodeURIComponent(appt.address)}`) }}
                  style={{
                    display: 'block', width: '100%', height: 50, marginTop: 12, borderRadius: 13,
                    border: 'none', background: '#2563EB', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 8px 20px -6px rgba(37,99,235,0.55)',
                  }}
                >
                  + Create estimate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AppointmentCard (used by old mobile / kept for reference) ────────────────
function AppointmentCard({
  appt, expanded, onToggle, onEdit, onCreateEstimate, onViewEstimate,
}: {
  appt: Appt; expanded: boolean; onToggle: () => void
  onEdit: (a: Appt) => void; onCreateEstimate: (a: Appt) => void; onViewEstimate: (id: string) => void
}) {
  const ds        = toDesignStatus(appt.status)
  const railColor = { upcoming: T.blue, completed: T.green, canceled: T.red }[ds]
  const faded     = (ds === 'completed' || ds === 'canceled') && !expanded
  return (
    <div onClick={onToggle} style={{ position: 'relative', background: T.card, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: expanded ? '0 4px 12px rgba(15,23,42,0.08)' : '0 1px 2px rgba(15,23,42,0.04)', border: `1px solid ${expanded ? 'rgba(15,23,42,0.08)' : T.border}`, opacity: faded ? 0.62 : 1, transition: 'box-shadow 200ms ease' }}>
      <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, background: railColor, borderRadius: 99 }} />
      <div style={{ padding: '12px 12px 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.client_name}</div>
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              {appt.appointment_time && <span style={{ fontSize: 13, color: T.inkMid, fontWeight: 600 }}>{fmt12h(appt.appointment_time)}</span>}
              <StatusTag status={ds} />
            </div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkSoft, transition: 'transform 220ms ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      </div>
      <div style={{ maxHeight: expanded ? 400 : 0, opacity: expanded ? 1 : 0, overflow: 'hidden', transition: 'max-height 280ms ease, opacity 220ms ease' }}>
        <div style={{ padding: '0 12px 12px 16px' }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            {appt.client_phone && <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{fmtPhone(appt.client_phone)}</div>}
            {appt.client_address && <div style={{ fontSize: 13, color: T.inkMid, marginTop: 3 }}>{appt.client_address}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {appt.client_phone && (
              <a href={`tel:${appt.client_phone}`} onClick={e => e.stopPropagation()} style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
                Call
              </a>
            )}
            {appt.estimate_id ? (
              <button onClick={e => { e.stopPropagation(); onViewEstimate(appt.estimate_id!) }} style={{ flex: 1.6, height: 36, borderRadius: 9, border: 'none', background: T.blue, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>View estimate</button>
            ) : ds !== 'canceled' ? (
              <button onClick={e => { e.stopPropagation(); onCreateEstimate(appt) }} style={{ flex: 1.6, height: 36, borderRadius: 9, border: 'none', background: T.blueSoft, color: T.blue, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>+ Create estimate</button>
            ) : null}
          </div>
          <button onClick={e => { e.stopPropagation(); onEdit(appt) }} style={{ marginTop: 6, width: '100%', height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: T.inkMid, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
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

function EditScreen({ open, appt, onClose, onSave, onDelete }: {
  open: boolean; appt: Appt | null; onClose: () => void
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
      setDraft({ client_name: appt.client_name, client_phone: appt.client_phone ?? '', client_email: appt.client_email ?? '', client_address: appt.client_address ?? '', client_city: appt.client_city ?? '', client_province: appt.client_province ?? '', postal_code: appt.postal_code ?? '', lead_source: appt.lead_source ?? '', appointment_date: appt.appointment_date, appointment_time: appt.appointment_time ?? '' })
      setErrors({})
    }
  }, [appt?.id])

  if (!appt) return null
  const currentAppt = appt
  const ds  = toDesignStatus(currentAppt.status)
  const set = (k: keyof Appt) => (v: string) => setDraft(p => ({ ...p, [k]: v }))

  const inp: React.CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.ink, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const sectionHdr: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase', padding: '4px 4px 10px' }
  const sectionCard: React.CSSProperties = { background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }

  async function handleSave() {
    const nameErr = validateName(draft.client_name ?? ''); const phoneErr = validatePhone(draft.client_phone ?? ''); const addrErr = validateAddress(draft.client_address ?? '')
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_address: addrErr }
    setErrors(newErrors); if (hasErrors(newErrors)) return
    setSaving(true); await onSave(currentAppt.id, draft); setSaving(false)
  }

  return (
    <>
      <ConfirmModal open={deleteOpen} icon="trash" title="Delete appointment?" body={`${currentAppt.client_name} appointment will be permanently deleted.`} confirmLabel="Delete" onConfirm={() => { setDeleteOpen(false); onDelete(currentAppt.id) }} onCancel={() => setDeleteOpen(false)} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: T.bg, transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(.32,.72,0,1)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: 'max(60px, calc(env(safe-area-inset-top) + 16px)) 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase' }}>Schedule</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', marginTop: 1 }}>Edit appointment</div>
            </div>
            <StatusTag status={ds} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 16px 24px' }}>
          <div style={sectionHdr}>Client</div>
          <div style={sectionCard}>
            <div>
              <label style={fieldLabel}>Name</label>
              <input style={errors.client_name ? { ...inp, border: editErrBorder } : inp} value={draft.client_name ?? ''} onChange={e => { clearErr('client_name'); set('client_name')(e.target.value) }} onBlur={() => setErr('client_name', validateName(draft.client_name ?? ''))} />
              {errors.client_name && <div style={editErrStyle}>{errors.client_name}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={fieldLabel}>Phone</label>
                <input type="tel" style={errors.client_phone ? { ...inp, border: editErrBorder } : inp} value={draft.client_phone ?? ''} onChange={e => { clearErr('client_phone'); set('client_phone')(formatPhone(e.target.value)) }} onBlur={() => setErr('client_phone', validatePhone(draft.client_phone ?? ''))} placeholder="(403) 555-0100" />
                {errors.client_phone && <div style={editErrStyle}>{errors.client_phone}</div>}
              </div>
              <div>
                <label style={fieldLabel}>Source</label>
                <select style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }} value={draft.lead_source ?? ''} onChange={e => set('lead_source')(e.target.value)}>
                  <option value="">Select source</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Email</label>
              <input type="email" style={inp} value={draft.client_email ?? ''} onChange={e => set('client_email')(e.target.value)} placeholder="client@example.com" />
            </div>
            <div>
              <label style={fieldLabel}>Address</label>
              <input style={errors.client_address ? { ...inp, border: editErrBorder } : inp} value={draft.client_address ?? ''} onChange={e => { clearErr('client_address'); set('client_address')(e.target.value) }} onBlur={() => setErr('client_address', validateAddress(draft.client_address ?? ''))} placeholder="123 Main St" />
              {errors.client_address && <div style={editErrStyle}>{errors.client_address}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={fieldLabel}>City</label>
                <input style={inp} value={draft.client_city ?? ''} onChange={e => set('client_city')(e.target.value)} placeholder="Calgary" />
              </div>
              <div>
                <label style={fieldLabel}>Postal code</label>
                <input style={inp} value={draft.postal_code ?? ''} onChange={e => set('postal_code')(formatPostal(e.target.value))} placeholder="T2P 1J9" maxLength={7} />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Province</label>
              <select style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }} value={draft.client_province ?? ''} onChange={e => set('client_province')(e.target.value)}>
                <option value="">Select province</option>
                {Object.entries(TAX_RATES).sort().map(([code]) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
          </div>
          <div style={{ ...sectionHdr, paddingTop: 20 }}>When</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Date</label>
              <input type="date" lang="en" value={draft.appointment_date ?? ''} onChange={e => set('appointment_date')(e.target.value)} style={{ width: '100%', border: '1px solid #E8E8E8', borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Time</label>
              <TimePickerDropdown value={draft.appointment_time ?? ''} date={draft.appointment_date ?? ''} onChange={v => set('appointment_time')(v)} />
            </div>
          </div>
          <button onClick={() => setDeleteOpen(true)} style={{ marginTop: 24, width: '100%', padding: 16, borderRadius: 16, background: '#FEF2F2', color: '#EF4444', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Delete appointment
          </button>
        </div>
        <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '14px 16px', paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 14px))', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || hasErrors(errors)} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: (saving || hasErrors(errors)) ? T.inkSoft : T.blue, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (saving || hasErrors(errors)) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Desktop components ───────────────────────────────────────────────────────
function DesktopListRow({ appt, active, onClick }: { appt: Appt; active: boolean; onClick: () => void }) {
  const ds = toDesignStatus(appt.status)
  const rc = { upcoming: T.blue, completed: T.green, canceled: T.red }[ds]
  const dimmed = (ds === 'completed' || ds === 'canceled') && !active
  return (
    <button onClick={onClick} style={{ position: 'relative', textAlign: 'left', width: '100%', background: active ? T.blueSoft : T.card, border: 'none', borderBottom: `1px solid ${T.border}`, padding: '14px 16px 14px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, opacity: dimmed ? 0.62 : 1, transition: 'background 160ms ease', cursor: 'pointer' }}>
      <span style={{ position: 'absolute', left: 12, top: 16, bottom: 16, width: 3, background: rc, borderRadius: 99 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.client_name}</div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.client_address || 'No address'}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {appt.appointment_time && <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{fmt12h(appt.appointment_time)}</div>}
        <div style={{ marginTop: 4 }}><StatusTag status={ds} /></div>
      </div>
    </button>
  )
}

function DesktopSectionHeader({ label, color, count }: { label: string; color: string; count: string }) {
  return (
    <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', background: T.surface }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{count}</span>
    </div>
  )
}

function DesktopViewPanel({ appt, onEdit, onCreateEstimate, onViewEstimate }: { appt: Appt; onEdit: () => void; onCreateEstimate: (a: Appt) => void; onViewEstimate: (id: string) => void }) {
  const ds = toDesignStatus(appt.status)
  const dl = dateLabel(appt.appointment_date)
  const btnBase: React.CSSProperties = { height: 40, padding: '0 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.inkMid, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 40px', maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StatusTag status={ds} />
            <span style={{ color: T.inkFaint }}>·</span>
            <span style={{ fontSize: 12, color: T.inkSoft }}>{dl}{appt.appointment_time ? ` at ${fmt12h(appt.appointment_time)}` : ''}</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{appt.client_name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          {appt.client_phone && <a href={`tel:${appt.client_phone}`} style={btnBase}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>Call</a>}
          {appt.client_address && <a href={`https://maps.google.com/?q=${encodeURIComponent(appt.client_address)}`} target="_blank" rel="noreferrer" style={btnBase}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>Map</a>}
          <button onClick={onEdit} style={btnBase}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M14 6l4 4" /></svg>Edit</button>
        </div>
      </div>
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: '4px 20px', marginBottom: 20 }}>
        {[{ label: 'Phone', value: fmtPhone(appt.client_phone), mono: true }, { label: 'Address', value: appt.client_address || '—' }, { label: 'Date & time', value: `${dl}, ${appt.appointment_date}${appt.appointment_time ? ` · ${fmt12h(appt.appointment_time)}` : ''}`, mono: true }, { label: 'Lead source', value: appt.lead_source || '—' }].map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const }}>{label}</div>
            <div style={{ fontSize: 14, color: value === '—' ? T.inkFaint : T.ink, fontVariantNumeric: mono ? 'tabular-nums' : 'normal' as const }}>{value || '—'}</div>
          </div>
        ))}
        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const, marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 14, color: appt.notes ? T.ink : T.inkFaint, lineHeight: 1.55 }}>{appt.notes || 'No notes'}</div>
        </div>
      </div>
      {appt.estimate_id ? (
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase' as const }}>Estimate</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginTop: 2 }}>{appt.estimate_number ?? '—'}</div>
            </div>
          </div>
          <button onClick={() => onViewEstimate(appt.estimate_id!)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>View estimate <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
      ) : ds !== 'canceled' ? (
        <div style={{ background: T.blueSoft, borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DBE6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.blue, textTransform: 'uppercase' as const }}>No estimate yet</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginTop: 2 }}>Quote this visit when you're ready.</div>
            </div>
          </div>
          <button onClick={() => onCreateEstimate(appt)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>Create estimate</button>
        </div>
      ) : null}
    </div>
  )
}

function DesktopEditPanel({ appt, onCancel, onSave, onDelete }: { appt: Appt; onCancel: () => void; onSave: (id: string, patch: Partial<Appt>) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<Appt>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ClientErrors>({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  const setErr = (k: keyof ClientErrors, v: string | null) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: keyof ClientErrors) => setErr(k, null)

  useEffect(() => {
    setDraft({ client_name: appt.client_name, client_phone: appt.client_phone ?? '', client_email: appt.client_email ?? '', client_address: appt.client_address ?? '', client_city: appt.client_city ?? '', client_province: appt.client_province ?? '', postal_code: appt.postal_code ?? '', lead_source: appt.lead_source ?? '', appointment_date: appt.appointment_date, appointment_time: appt.appointment_time ?? '', notes: appt.notes ?? '' })
    setErrors({})
  }, [appt.id])

  const ds  = toDesignStatus(appt.status)
  const set = (k: keyof Appt) => (v: string) => setDraft(p => ({ ...p, [k]: v }))
  const inp: React.CSSProperties = { width: '100%', height: 42, padding: '0 14px', borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const chevSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`
  const fldLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const secHdr: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase', padding: '4px 4px 10px' }
  const secCard: React.CSSProperties = { background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

  async function handleSave() {
    const ne: ClientErrors = { client_name: validateName(draft.client_name ?? ''), client_phone: validatePhone(draft.client_phone ?? ''), client_address: validateAddress(draft.client_address ?? '') }
    setErrors(ne); if (hasErrors(ne)) return
    setSaving(true); await onSave(appt.id, draft); setSaving(false)
  }

  return (
    <>
      <ConfirmModal open={deleteOpen} icon="trash" title="Delete appointment?" body={`${appt.client_name} appointment will be permanently deleted.`} confirmLabel="Delete" onConfirm={() => { setDeleteOpen(false); onDelete(appt.id) }} onCancel={() => setDeleteOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 24px', maxWidth: 880 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><StatusTag status={ds} /></div>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', marginBottom: 20 }}>Edit appointment</div>
          <div style={secHdr}>Client</div>
          <div style={secCard}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fldLbl}>Name</label>
              <input style={errors.client_name ? { ...inp, border: editErrBorder } : inp} value={draft.client_name ?? ''} onChange={e => { clearErr('client_name'); set('client_name')(e.target.value) }} onBlur={() => setErr('client_name', validateName(draft.client_name ?? ''))} />
              {errors.client_name && <div style={editErrStyle}>{errors.client_name}</div>}
            </div>
            <div>
              <label style={fldLbl}>Phone</label>
              <input type="tel" style={errors.client_phone ? { ...inp, border: editErrBorder } : inp} value={draft.client_phone ?? ''} onChange={e => { clearErr('client_phone'); set('client_phone')(formatPhone(e.target.value)) }} onBlur={() => setErr('client_phone', validatePhone(draft.client_phone ?? ''))} placeholder="(403) 555-0100" />
              {errors.client_phone && <div style={editErrStyle}>{errors.client_phone}</div>}
            </div>
            <div>
              <label style={fldLbl}>Source</label>
              <select style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }} value={draft.lead_source ?? ''} onChange={e => set('lead_source')(e.target.value)}>
                <option value="">Select source</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fldLbl}>Email</label>
              <input type="email" style={inp} value={draft.client_email ?? ''} onChange={e => set('client_email')(e.target.value)} placeholder="client@example.com" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fldLbl}>Address</label>
              <input style={errors.client_address ? { ...inp, border: editErrBorder } : inp} value={draft.client_address ?? ''} onChange={e => { clearErr('client_address'); set('client_address')(e.target.value) }} onBlur={() => setErr('client_address', validateAddress(draft.client_address ?? ''))} placeholder="123 Main St" />
              {errors.client_address && <div style={editErrStyle}>{errors.client_address}</div>}
            </div>
            <div>
              <label style={fldLbl}>City</label>
              <input style={inp} value={draft.client_city ?? ''} onChange={e => set('client_city')(e.target.value)} placeholder="Calgary" />
            </div>
            <div>
              <label style={fldLbl}>Postal code</label>
              <input style={inp} value={draft.postal_code ?? ''} onChange={e => set('postal_code')(formatPostal(e.target.value))} placeholder="T2P 1J9" maxLength={7} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={fldLbl}>Province</label>
              <select style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }} value={draft.client_province ?? ''} onChange={e => set('client_province')(e.target.value)}>
                <option value="">Select province</option>
                {Object.entries(TAX_RATES).sort().map(([code]) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
          </div>
          <div style={{ ...secHdr, paddingTop: 20 }}>When</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={fldLbl}>Date</label>
              <input type="date" lang="en" value={draft.appointment_date ?? ''} onChange={e => set('appointment_date')(e.target.value)} style={{ width: '100%', border: '1px solid #E8E8E8', borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={fldLbl}>Time</label>
              <TimePickerDropdown value={draft.appointment_time ?? ''} date={draft.appointment_date ?? ''} onChange={v => set('appointment_time')(v)} />
            </div>
          </div>
          <div style={{ ...secHdr, paddingTop: 20 }}>Notes</div>
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18 }}>
            <textarea style={{ ...inp, height: 96, padding: 14, resize: 'vertical' as const }} value={draft.notes ?? ''} onChange={e => set('notes')(e.target.value)} placeholder="What does the client need?" />
          </div>
          <button onClick={() => setDeleteOpen(true)} style={{ marginTop: 24, width: '100%', padding: 16, borderRadius: 16, background: '#FEF2F2', color: '#EF4444', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete appointment</button>
        </div>
        <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onCancel} style={{ height: 44, padding: '0 22px', borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || hasErrors(errors)} style={{ height: 44, padding: '0 26px', borderRadius: 10, border: 'none', background: (saving || hasErrors(errors)) ? T.inkSoft : T.blue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (saving || hasErrors(errors)) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const router   = useRouter()
  const supabase = createClient()

  // Existing state
  const [appts, setAppts]               = useState<Appt[]>([])
  const [loading, setLoading]           = useState(true)
  const [openId, setOpenId]             = useState<string | null>(null)
  const [editing, setEditing]           = useState<Appt | null>(null)
  const [editOpen, setEditOpen]         = useState(false)
  const [toast, setToast]               = useState('')
  const [isDesktop, setIsDesktop]       = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [desktopEditing, setDesktopEditing] = useState(false)
  const [desktopFilter, setDesktopFilter]   = useState<'All' | 'Upcoming' | 'Done'>('All')
  const [search, setSearch]             = useState('')

  // Timeline state
  const [userId, setUserId]             = useState<string | null>(null)
  const [selectedDay, setSelectedDay]   = useState<'yesterday' | 'today' | 'tomorrow' | string>('today')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [dayCounts, setDayCounts]       = useState({ yesterday: 0, today: 0, tomorrow: 0 })
  const [dayAppts, setDayAppts]         = useState<TimelineAppt[]>([])
  const [dayLoading, setDayLoading]     = useState(true)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  // Existing load (desktop — all appointments)
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    setUserId(sanitizedId)
    const { data: rows } = await supabase
      .from('appointments').select('*').eq('user_id', sanitizedId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true, nullsFirst: false })
      .limit(50)
    const apptList = rows || []
    const estIds = apptList.flatMap(a => a.estimate_id ? [a.estimate_id as string] : [])
    let estMap = new Map<string, string>()
    if (estIds.length > 0) {
      const { data: ests } = await supabase.from('estimates').select('id, estimate_number').in('id', estIds)
      estMap = new Map((ests ?? []).map(e => [e.id, e.estimate_number]))
    }
    setAppts(apptList.map(a => ({ ...a, estimate_number: a.estimate_id ? (estMap.get(a.estimate_id) ?? null) : null })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load day counts
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [{ count: yc }, { count: tc }, { count: tmc }] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('appointment_date', getDayDateStr('yesterday')),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('appointment_date', getDayDateStr('today')),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('appointment_date', getDayDateStr('tomorrow')),
      ])
      setDayCounts({ yesterday: yc ?? 0, today: tc ?? 0, tomorrow: tmc ?? 0 })
    })()
  }, [userId])

  // Load day appointments when userId or selectedDay changes
  useEffect(() => {
    if (!userId) return
    setExpandedId(null)
    setDayLoading(true)
    ;(async () => {
      const dateStr = getDayDateStr(selectedDay)
      const todayDateStr = getDayDateStr('today')
      const isPast = dateStr < todayDateStr

      const { data: rows } = await supabase
        .from('appointments')
        .select('id, client_name, client_phone, client_address, appointment_time, status, estimate_id')
        .eq('user_id', userId)
        .eq('appointment_date', dateStr)
        .order('appointment_time', { ascending: true, nullsFirst: false })
        .limit(50)

      const rowList = rows || []
      const estIds = rowList.filter(a => a.estimate_id).map(a => a.estimate_id!)
      let estTotalMap = new Map<string, number>()
      if (estIds.length > 0) {
        const { data: ests } = await supabase.from('estimates').select('id, total').in('id', estIds)
        estTotalMap = new Map((ests ?? []).map(e => [e.id, e.total ?? 0]))
      }

      const mapped: TimelineAppt[] = rowList.map(a => {
        const total = a.estimate_id ? (estTotalMap.get(a.estimate_id) ?? null) : null
        return {
          id: a.id,
          name: a.client_name,
          rawTime: a.appointment_time ?? null,
          hour: toHour(a.appointment_time),
          phone: a.client_phone || '',
          address: a.client_address || '',
          status: (isPast || a.status === 'completed') ? 'completed' : 'upcoming',
          estimateId: a.estimate_id || null,
          estTotal: total !== null ? `CA$${total.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null,
        }
      })

      setDayAppts(mapped)
      setDayLoading(false)
    })()
  }, [userId, selectedDay])

  // ── Computed ────────────────────────────────────────────────────────────────
  const nowDate    = new Date()
  const todayStr   = getDayDateStr('today')
  const todayCount = appts.filter(a => a.appointment_date === todayStr).length
  const NOW        = nowDate.getHours() + nowDate.getMinutes() / 60

  const upcomingCount = dayAppts.filter(a => a.status === 'upcoming').length
  const doneCount     = dayAppts.filter(a => a.status === 'completed').length

  const nowInsertIdx = selectedDay === 'today'
    ? (() => { const i = dayAppts.findIndex(a => a.hour >= NOW); return i === -1 ? dayAppts.length : i })()
    : -1

  function buildGroups(list: Appt[]) {
    const map = new Map<string, Appt[]>(); const order: string[] = []
    list.forEach(a => {
      const lbl = dateLabel(a.appointment_date)
      if (!map.has(lbl)) { map.set(lbl, []); order.push(lbl) }
      map.get(lbl)!.push(a)
    })
    return order.map(lbl => {
      const items = map.get(lbl)!.slice().sort((a, b) => {
        const aR = toDesignStatus(a.status) === 'upcoming' ? 0 : 1
        const bR = toDesignStatus(b.status) === 'upcoming' ? 0 : 1
        if (aR !== bR) return aR - bR
        return (a.appointment_time ?? '') < (b.appointment_time ?? '') ? -1 : 1
      })
      return { label: lbl, items }
    })
  }

  const deskUpcomingList = appts.filter(a => toDesignStatus(a.status) === 'upcoming')
  const deskDoneList     = appts.filter(a => toDesignStatus(a.status) !== 'upcoming')
  const deskCounts = { all: appts.length, upcoming: deskUpcomingList.length, done: deskDoneList.length }
  const deskBase: Appt[] = desktopFilter === 'Upcoming' ? deskUpcomingList : desktopFilter === 'Done' ? deskDoneList : appts
  const deskFiltered = search.trim() ? deskBase.filter(a => a.client_name.toLowerCase().includes(search.toLowerCase()) || (a.client_address ?? '').toLowerCase().includes(search.toLowerCase())) : deskBase
  const deskToday  = deskFiltered.filter(a => a.appointment_date === todayStr)
  const deskFuture = deskFiltered.filter(a => a.appointment_date > todayStr)
  const deskPast   = [...deskFiltered.filter(a => a.appointment_date < todayStr)].sort((a, b) => a.appointment_date < b.appointment_date ? -1 : 1)
  const deskGroups = [...buildGroups(deskToday), ...buildGroups(deskFuture), ...buildGroups(deskPast).reverse()]

  // ── Actions ─────────────────────────────────────────────────────────────────
  function openEdit(a: Appt)  { setEditing(a); setEditOpen(true) }
  function closeEdit()        { setEditOpen(false); setTimeout(() => setEditing(null), 350) }

  async function saveEdit(id: string, patch: Partial<Appt>) {
    await supabase.from('appointments').update({ client_name: patch.client_name?.trim(), client_phone: patch.client_phone?.trim() || null, client_email: patch.client_email?.trim() || null, client_address: patch.client_address?.trim() || null, client_city: patch.client_city?.trim() || null, client_province: patch.client_province?.trim() || null, postal_code: patch.postal_code?.trim() || null, lead_source: patch.lead_source?.trim() || null, appointment_date: patch.appointment_date, appointment_time: patch.appointment_time || null }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    closeEdit(); flash('Saved')
  }

  async function deleteAppt(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppts(prev => prev.filter(a => a.id !== id))
    closeEdit(); flash('Deleted')
  }

  async function desktopSaveEdit(id: string, patch: Partial<Appt>) {
    await supabase.from('appointments').update({ client_name: patch.client_name?.trim(), client_phone: patch.client_phone?.trim() || null, client_email: patch.client_email?.trim() || null, client_address: patch.client_address?.trim() || null, client_city: patch.client_city?.trim() || null, client_province: patch.client_province?.trim() || null, postal_code: patch.postal_code?.trim() || null, lead_source: patch.lead_source?.trim() || null, appointment_date: patch.appointment_date, appointment_time: patch.appointment_time || null, notes: patch.notes?.trim() || null }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    setDesktopEditing(false); flash('Saved')
  }

  async function desktopDeleteAppt(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppts(prev => prev.filter(a => a.id !== id))
    setSelectedId(null); setDesktopEditing(false); flash('Deleted')
  }

  async function createEstimate(appt: Appt) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    setAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'completed' } : a))
    router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client_name)}&client_address=${encodeURIComponent(appt.client_address || '')}`)
  }

  // ── Desktop render ───────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: T.bg, fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: T.inkSoft, textTransform: 'uppercase' }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Appointments</div>
              <span style={{ fontSize: 13.5, color: T.inkSoft }}><span style={{ fontWeight: 600, color: T.ink }}>{todayCount} today</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 280, height: 40, background: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.inkSoft} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or address" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: T.ink, fontFamily: 'inherit' }} />
              </div>
              <button style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: T.card, color: T.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16V11a6 6 0 10-12 0v5l-2 3h16z" /><path d="M10 21h4" /></svg>
              </button>
              <button onClick={() => router.push('/dashboard/appointments/new')} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                New appointment
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['All', 'Upcoming', 'Done'] as const).map(f => {
              const active = desktopFilter === f
              const count = f === 'All' ? deskCounts.all : f === 'Upcoming' ? deskCounts.upcoming : deskCounts.done
              return (
                <button key={f} onClick={() => { setDesktopFilter(f); setDesktopEditing(false) }} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${active ? T.blue : T.borderStrong}`, background: active ? T.blueSoft : T.card, color: active ? T.blue : T.inkMid, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {f}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: active ? T.blue : 'rgba(15,23,42,0.06)', color: active ? '#fff' : T.inkSoft }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ width: 420, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, overflowY: 'auto' }}>
            {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: T.inkSoft, fontSize: 13 }}>Loading…</div>}
            {!loading && deskFiltered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 16px', color: T.inkSoft, fontSize: 13 }}>No appointments.</div>}
            {!loading && deskGroups.map(({ label, items }) => (
              <div key={label}>
                <DesktopSectionHeader label={label} color={sectionColor(label)} count={`${items.length} ${items.length === 1 ? 'visit' : 'visits'}`} />
                {items.map(appt => <DesktopListRow key={appt.id} appt={appt} active={selectedId === appt.id} onClick={() => { setSelectedId(appt.id); setDesktopEditing(false) }} />)}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
            {(() => {
              const sel = appts.find(a => a.id === selectedId) ?? null
              if (!sel) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: T.inkSoft, fontSize: 14 }}>Select an appointment to see details.</div></div>
              if (desktopEditing) return <DesktopEditPanel appt={sel} onCancel={() => setDesktopEditing(false)} onSave={desktopSaveEdit} onDelete={desktopDeleteAppt} />
              return <DesktopViewPanel appt={sel} onEdit={() => setDesktopEditing(true)} onCreateEstimate={createEstimate} onViewEstimate={id => router.push(`/dashboard/estimates/${id}`)} />
            })()}
          </div>
        </div>
        {toast && <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: T.ink, color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{toast}</div>}
      </div>
    )
  }

  // ── Mobile timeline render ───────────────────────────────────────────────────
  const dayTitle = selectedDay === 'today' ? 'Today' : selectedDay === 'yesterday' ? 'Yesterday' : 'Tomorrow'

  return (
    <>
      <style>{`.appt-tl-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F3F4F6', fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>

        {/* Header */}
        <div style={{ background: '#fff', padding: '2px 18px 12px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 2px))', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8A94A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                {getEyebrow(selectedDay)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0B1220', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {dayTitle}
              </div>
              <div style={{ fontSize: 13, color: '#8A94A6', marginTop: 3 }}>
                <span style={{ fontWeight: 700, color: '#2563EB' }}>{upcomingCount} upcoming</span>
                {' · '}{doneCount} done
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
              <button
                onClick={() => router.push('/dashboard/appointments/new')}
                style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 16px -5px rgba(37,99,235,0.6)' }}
              >
                + New
              </button>
            </div>
          </div>
        </div>

        {/* Day filter pills */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, background: '#fff', flexShrink: 0 }}>
          {(['yesterday', 'today', 'tomorrow'] as const).map(day => {
            const active = selectedDay === day
            const count = dayCounts[day]
            const label = day === 'yesterday' ? 'Yesterday' : day === 'today' ? 'Today' : 'Tomorrow'
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  flex: 1, height: 56, borderRadius: 14,
                  border: `1px solid ${active ? '#2563EB' : 'rgba(15,23,42,0.08)'}`,
                  background: active ? '#EFF4FF' : '#fff',
                  color: active ? '#2563EB' : '#0B1220',
                  cursor: 'pointer', padding: '0 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1 }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#2563EB' : '#8A94A6' }}>
                  {count === 0 ? 'No visits' : `${count} visit${count === 1 ? '' : 's'}`}
                </span>
              </button>
            )
          })}
          <label style={{ width: 46, height: 42, borderRadius: 11, border: '1px solid #E2E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
            <Calendar size={20} strokeWidth={1.8} color="#64748B" />
            <input
              type="date"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              onChange={e => {
                if (!e.target.value) return
                const today = new Date(); today.setHours(0,0,0,0)
                const selected = new Date(e.target.value + 'T00:00:00'); selected.setHours(0,0,0,0)
                const diff = Math.round((selected.getTime() - today.getTime()) / 86400000)
                if (diff === -1) setSelectedDay('yesterday')
                else if (diff === 0) setSelectedDay('today')
                else if (diff === 1) setSelectedDay('tomorrow')
                else setSelectedDay(e.target.value as 'yesterday' | 'today' | 'tomorrow')
              }}
            />
          </label>
        </div>

        {/* Timeline scroll area */}
        <div
          className="appt-tl-scroll"
          style={{ flex: 1, overflowY: 'auto', background: '#F3F4F6', scrollbarWidth: 'none' } as React.CSSProperties}
          onClick={() => setExpandedId(null)}
        >
          <div style={{ padding: '16px 16px 40px', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>

            {dayLoading && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#8A94A6', fontSize: 13 }}>Loading…</div>
            )}

            {!dayLoading && dayAppts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={28} color="#2563EB" strokeWidth={1.7} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1220', marginBottom: 6 }}>
                  No visits {dayTitle.toLowerCase()}
                </div>
                <button
                  onClick={() => router.push('/dashboard/appointments/new')}
                  style={{ marginTop: 4, height: 44, padding: '0 20px', borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Schedule one
                </button>
              </div>
            )}

            {!dayLoading && dayAppts.length > 0 && dayAppts.flatMap((appt, i) => {
              const rows: React.ReactNode[] = []
              if (selectedDay === 'today' && i === nowInsertIdx) {
                rows.push(<NowRow key="now" />)
              }
              rows.push(
                <TimelineRow
                  key={appt.id}
                  appt={appt}
                  isLast={i === dayAppts.length - 1}
                  expanded={expandedId === appt.id}
                  onToggle={() => setExpandedId(prev => prev === appt.id ? null : appt.id)}
                  onNavigate={path => router.push(path)}
                />
              )
              return rows
            })}
            {!dayLoading && selectedDay === 'today' && nowInsertIdx === dayAppts.length && dayAppts.length > 0 && (
              <NowRow key="now-end" />
            )}

          </div>
        </div>

        {/* Edit screen */}
        <EditScreen open={editOpen} appt={editing} onClose={closeEdit} onSave={saveEdit} onDelete={deleteAppt} />

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#0B1220', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {toast}
          </div>
        )}
      </div>
    </>
  )
}
