'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Phone, MapPin, Pencil, Calendar } from 'lucide-react'
import { formatPhone, validateName, validatePhone, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import { TAX_RATES } from '@/lib/pricing'
import ConfirmModal from '@/components/ConfirmModal'
import TimePickerDropdown from '@/components/TimePickerDropdown'
import AppTopBar from '@/components/AppTopBar'
import { SuccessBanner } from '@/components/SuccessBanner'
import { getTeamUserIds } from '@/lib/teamScope'

// ─── Rep avatar gradients (cycle per index, consistent across both pages) ─────
const REP_GRADIENTS = [
  'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
  'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)',
  'linear-gradient(135deg,#059669 0%,#047857 100%)',
  'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)',
  'linear-gradient(135deg,#D97706 0%,#B45309 100%)',
]

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
  appointment_end_time: string | null
  notes: string | null
  lead_source: string | null
  status: string
  estimate_id: string | null
  estimate_number: string | null
}

interface TimelineAppt {
  id: string
  user_id: string
  name: string
  rawTime: string | null
  endTime: string | null
  hour: number
  phone: string
  address: string
  status: 'upcoming' | 'completed' | 'cancelled'
  estimateId: string | null
  estTotal: string | null
  notes: string | null
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

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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
function TimelineRow({ appt, isLast, expanded, onToggle, onNavigate, isFollowUp }: {
  appt: TimelineAppt
  isLast: boolean
  expanded: boolean
  onToggle: () => void
  onNavigate: (path: string) => void
  isFollowUp?: boolean
}) {
  const [navigating, setNavigating] = useState(false)
  const { time, ampm } = fmtTimeParts(appt.rawTime)
  const endFmt = appt.endTime ? fmt12h(appt.endTime) : null
  const dotColor = appt.status === 'completed' ? '#16A34A' : isFollowUp ? '#F97316' : '#2563EB'

  return (
    <div style={{ display: 'flex', marginBottom: 10 }}>
      {/* Time col */}
      <div style={{ width: 52, flexShrink: 0, paddingTop: 13, paddingRight: 8, textAlign: 'right' }}>
        {appt.rawTime ? (
          endFmt ? (
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0B1220', lineHeight: 1.4 }}>
              {time}<span style={{ fontSize: 9, color: '#B3BAC6' }}>{ampm}</span>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#8A94A6', lineHeight: 1.2 }}>– {endFmt}</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B1220', lineHeight: 1.15 }}>{time}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#B3BAC6', marginTop: 1 }}>{ampm}</div>
            </>
          )
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
            {isFollowUp && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#F97316', marginTop: 3 }}>Needs follow-up</div>
            )}
          </div>
          {!expanded && (
            appt.estimateId ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F8A4D', flexShrink: 0 }}>
                {appt.estTotal}
              </div>
            ) : (
              <button
                disabled={navigating}
                onClick={e => {
                  e.stopPropagation()
                  if (navigating) return
                  setNavigating(true)
                  onNavigate(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.name)}&client_address=${encodeURIComponent(appt.address)}&rep_id=${encodeURIComponent(appt.user_id)}`)
                }}
                style={{
                  height: 30, padding: '0 11px', borderRadius: 9,
                  background: '#EFF4FF', border: 'none',
                  color: '#2563EB', fontSize: 12, fontWeight: 700,
                  cursor: navigating ? 'default' : 'pointer', flexShrink: 0,
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

              {/* Notes */}
              {appt.notes && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B3BAC6', marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 12.5, color: '#475467', lineHeight: 1.55 }}>{appt.notes}</div>
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
                  disabled={navigating}
                  onClick={e => {
                    e.stopPropagation()
                    if (navigating) return
                    setNavigating(true)
                    onNavigate(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.name)}&client_address=${encodeURIComponent(appt.address)}&rep_id=${encodeURIComponent(appt.user_id)}`)
                  }}
                  style={{
                    display: 'block', width: '100%', height: 50, marginTop: 12, borderRadius: 13,
                    border: 'none', background: navigating ? '#9CA3AF' : '#2563EB', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: navigating ? 'default' : 'pointer',
                    boxShadow: navigating ? 'none' : '0 8px 20px -6px rgba(37,99,235,0.55)',
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
  const [navigating, setNavigating] = useState(false)
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
              <button disabled={navigating} onClick={e => { e.stopPropagation(); if (navigating) return; setNavigating(true); onCreateEstimate(appt) }} style={{ flex: 1.6, height: 36, borderRadius: 9, border: 'none', background: T.blueSoft, color: T.blue, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: navigating ? 'default' : 'pointer' }}>+ Create estimate</button>
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
  const [navigating, setNavigating] = useState(false)
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
          <button disabled={navigating} onClick={() => { if (navigating) return; setNavigating(true); onCreateEstimate(appt) }} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: navigating ? T.inkSoft : T.blue, color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: navigating ? 'default' : 'pointer' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>Create estimate</button>
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
    setDraft({ client_name: appt.client_name, client_phone: appt.client_phone ?? '', client_email: appt.client_email ?? '', client_address: appt.client_address ?? '', client_city: appt.client_city ?? '', client_province: appt.client_province ?? '', postal_code: appt.postal_code ?? '', lead_source: appt.lead_source ?? '', appointment_date: appt.appointment_date, appointment_time: appt.appointment_time ?? '', appointment_end_time: appt.appointment_end_time ?? '', notes: appt.notes ?? '' })
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={fldLbl}>Date</label>
              <input type="date" lang="en" value={draft.appointment_date ?? ''} onChange={e => set('appointment_date')(e.target.value)} style={{ width: '100%', border: '1px solid #E8E8E8', borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={fldLbl}>Time</label>
              <TimePickerDropdown value={draft.appointment_time ?? ''} date={draft.appointment_date ?? ''} onChange={v => set('appointment_time')(v)} />
            </div>
            <div>
              <label style={fldLbl}>Until (optional)</label>
              <TimePickerDropdown value={draft.appointment_end_time ?? ''} date={draft.appointment_date ?? ''} onChange={v => set('appointment_end_time')(v)} allowNone noTodayFilter minAfter={draft.appointment_time ?? ''} />
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
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  // Existing state
  const [appts, setAppts]               = useState<Appt[]>([])
  const [loading, setLoading]           = useState(true)
  const [openId, setOpenId]             = useState<string | null>(null)
  const [editing, setEditing]           = useState<Appt | null>(null)
  const [editOpen, setEditOpen]         = useState(false)
  const [toast, setToast]               = useState<{ message: string; variant?: 'success' | 'error' | 'neutral' } | null>(null)
  const [isDesktop, setIsDesktop]       = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [desktopEditing, setDesktopEditing] = useState(false)
  const [desktopFilter, setDesktopFilter]   = useState<'All' | 'Upcoming' | 'Done'>('All')
  const [search, setSearch]             = useState('')

  // Timeline state
  const [userId, setUserId]             = useState<string | null>(null)
  const [teamUserIds, setTeamUserIds]   = useState<string[] | null>(null)
  const [repFilter, setRepFilter]       = useState<string>(searchParams?.get('rep') || 'all')
  const [teamReps, setTeamReps]         = useState<{ id: string; name: string }[]>([])
  const [expandedRepIds, setExpandedRepIds] = useState<Set<string>>(new Set())
  const [selectedDay, setSelectedDay]   = useState<'yesterday' | 'today' | 'tomorrow' | string>('today')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [dayCounts, setDayCounts]       = useState({ yesterday: 0, today: 0, tomorrow: 0 })
  const [dayAppts, setDayAppts]         = useState<TimelineAppt[]>([])
  const [dayLoading, setDayLoading]     = useState(true)
  const _now = new Date()
  const [calYear,     setCalYear]     = useState(_now.getFullYear())
  const [calMonth,    setCalMonth]    = useState(_now.getMonth())
  const [monthDots,   setMonthDots]   = useState<Set<string>>(new Set())
  const [calendarOpen, setCalendarOpen] = useState(false)

  const flash = (m: string, opts?: { variant?: 'success' | 'error' | 'neutral' }) => { setToast({ message: m, ...opts }); setTimeout(() => setToast(null), 3500) }

  // Existing load (desktop — all appointments)
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    setUserId(sanitizedId)
    const { userIds, isOwnerOrManager } = await getTeamUserIds(supabase, user.id)
    setTeamUserIds(userIds)
    if (isOwnerOrManager && userIds.length > 1) {
      const { data: profs } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      const reps = userIds.map(uid => {
        const p = (profs || []).find((x: any) => x.id === uid)
        return { id: uid, name: uid === sanitizedId ? 'You' : ([p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Team member') }
      })
      setTeamReps(reps)
      setExpandedRepIds(new Set([reps[0].id]))
    }
    const { data: rows } = await supabase
      .from('appointments').select('*')
      .or(`user_id.in.(${userIds.join(',')}),assigned_to.in.(${userIds.join(',')})`)
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
    setAppts(apptList.map(a => ({ ...a, user_id: (a as any).assigned_to || a.user_id, estimate_number: a.estimate_id ? (estMap.get(a.estimate_id) ?? null) : null })))
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
    if (!teamUserIds) return
    ;(async () => {
      const apptIdFilter = `user_id.in.(${teamUserIds.join(',')}),assigned_to.in.(${teamUserIds.join(',')})`
      const [{ count: yc }, { count: tc }, { count: tmc }] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).or(apptIdFilter).eq('appointment_date', getDayDateStr('yesterday')),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).or(apptIdFilter).eq('appointment_date', getDayDateStr('today')),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).or(apptIdFilter).eq('appointment_date', getDayDateStr('tomorrow')),
      ])
      setDayCounts({ yesterday: yc ?? 0, today: tc ?? 0, tomorrow: tmc ?? 0 })
    })()
  }, [teamUserIds])

  // Load dots for the displayed calendar month
  useEffect(() => {
    if (!teamUserIds) return
    const firstDay = toDateStr(calYear, calMonth, 1)
    const lastDate = new Date(calYear, calMonth + 1, 0).getDate()
    const lastDay  = toDateStr(calYear, calMonth, lastDate)
    supabase
      .from('appointments')
      .select('appointment_date')
      .or(`user_id.in.(${teamUserIds.join(',')}),assigned_to.in.(${teamUserIds.join(',')})`)
      .gte('appointment_date', firstDay)
      .lte('appointment_date', lastDay)
      .then(({ data }) => setMonthDots(new Set((data || []).map((a: { appointment_date: string }) => a.appointment_date))))
  }, [teamUserIds, calYear, calMonth])

  // Load day appointments when userId or selectedDay changes
  useEffect(() => {
    if (!teamUserIds) return
    setExpandedId(null)
    setDayLoading(true)
    ;(async () => {
      const dateStr = getDayDateStr(selectedDay)
      const todayDateStr = getDayDateStr('today')
      const isPast = dateStr < todayDateStr

      const { data: rows } = await supabase
        .from('appointments')
        .select('id, user_id, assigned_to, client_name, client_phone, client_address, appointment_time, appointment_end_time, status, estimate_id, notes')
        .or(`user_id.in.(${teamUserIds.join(',')}),assigned_to.in.(${teamUserIds.join(',')})`)
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
          user_id: (a as any).assigned_to || (a as any).user_id,
          name: a.client_name,
          rawTime: a.appointment_time ?? null,
          endTime: (a as any).appointment_end_time || null,
          hour: toHour(a.appointment_time),
          phone: a.client_phone || '',
          address: a.client_address || '',
          status: a.status === 'cancelled' ? 'cancelled' : (isPast || a.status === 'completed') ? 'completed' : 'upcoming',
          estimateId: a.estimate_id || null,
          estTotal: total !== null ? `CA$${total.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null,
          notes: a.notes || null,
        }
      })

      setDayAppts(mapped)
      setDayLoading(false)
    })()
  }, [teamUserIds, selectedDay])

  // ── Computed ────────────────────────────────────────────────────────────────
  const nowDate  = new Date()
  const todayStr = getDayDateStr('today')
  const NOW      = nowDate.getHours() + nowDate.getMinutes() / 60

  const followUpEnd = (a: TimelineAppt): number =>
    a.endTime ? toHour(a.endTime) : a.hour + 0.5

  // Rep-filter derived sets
  const repFilteredAppts  = repFilter !== 'all' ? appts.filter(a => (a as any).user_id === repFilter) : appts
  const displayedDayAppts = repFilter !== 'all' ? dayAppts.filter(a => a.user_id === repFilter) : dayAppts
  const showRepGrouped    = repFilter === 'all' && teamReps.length > 1

  const todayCount         = repFilteredAppts.filter(a => a.appointment_date === todayStr).length
  const needsFollowUpCount = selectedDay === 'today'
    ? displayedDayAppts.filter(a => a.status === 'upcoming' && followUpEnd(a) < NOW).length : 0
  const upcomingCount  = displayedDayAppts.filter(a =>
    a.status === 'upcoming' && (selectedDay !== 'today' || followUpEnd(a) >= NOW)
  ).length
  const doneCount      = displayedDayAppts.filter(a => a.status === 'completed').length
  const cancelledCount = displayedDayAppts.filter(a => a.status === 'cancelled').length

  const nowInsertIdx = selectedDay === 'today' && !showRepGrouped
    ? (() => { const i = displayedDayAppts.findIndex(a => a.hour >= NOW); return i === -1 ? displayedDayAppts.length : i })()
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

  const deskUpcomingList = repFilteredAppts.filter(a => toDesignStatus(a.status) === 'upcoming')
  const deskDoneList     = repFilteredAppts.filter(a => toDesignStatus(a.status) !== 'upcoming')
  const deskCounts = { all: repFilteredAppts.length, upcoming: deskUpcomingList.length, done: deskDoneList.length }
  const deskBase: Appt[] = desktopFilter === 'Upcoming' ? deskUpcomingList : desktopFilter === 'Done' ? deskDoneList : repFilteredAppts
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
    closeEdit(); flash('Deleted', { variant: 'neutral' })
  }

  async function desktopSaveEdit(id: string, patch: Partial<Appt>) {
    await supabase.from('appointments').update({ client_name: patch.client_name?.trim(), client_phone: patch.client_phone?.trim() || null, client_email: patch.client_email?.trim() || null, client_address: patch.client_address?.trim() || null, client_city: patch.client_city?.trim() || null, client_province: patch.client_province?.trim() || null, postal_code: patch.postal_code?.trim() || null, lead_source: patch.lead_source?.trim() || null, appointment_date: patch.appointment_date, appointment_time: patch.appointment_time || null, appointment_end_time: patch.appointment_end_time || null, notes: patch.notes?.trim() || null }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    setDesktopEditing(false); flash('Saved')
  }

  async function desktopDeleteAppt(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppts(prev => prev.filter(a => a.id !== id))
    setSelectedId(null); setDesktopEditing(false); flash('Deleted', { variant: 'neutral' })
  }

  function createEstimate(appt: Appt) {
    router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client_name)}&client_address=${encodeURIComponent(appt.client_address || '')}&rep_id=${encodeURIComponent((appt as any).user_id || '')}`)
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
          {teamReps.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {[{ id: 'all', name: 'All reps' }, ...teamReps].map(m => {
                const active = repFilter === m.id
                return (
                  <button key={m.id} onClick={() => { setRepFilter(m.id); setDesktopEditing(false) }} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 99, border: `1.5px solid ${active ? T.blue : T.borderStrong}`, background: active ? T.blueSoft : T.card, color: active ? T.blue : T.inkMid, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ width: 420, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, overflowY: 'auto' }}>
            {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: T.inkSoft, fontSize: 13 }}>Loading…</div>}
            {!loading && deskFiltered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(37,99,235,.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={22} color="#2563EB" strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No visits yet</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Schedule your first appointment to get started.</div>
                <button
                  onClick={() => router.push('/dashboard/appointments/new')}
                  style={{ height: 40, padding: '0 20px', borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Schedule one
                </button>
              </div>
            )}
            {/* Flat date-grouped (single rep or no team) */}
            {!loading && !showRepGrouped && deskGroups.map(({ label, items }) => (
              <div key={label}>
                <DesktopSectionHeader label={label} color={sectionColor(label)} count={`${items.length} ${items.length === 1 ? 'visit' : 'visits'}`} />
                {items.map(appt => <DesktopListRow key={appt.id} appt={appt} active={selectedId === appt.id} onClick={() => { setSelectedId(appt.id); setDesktopEditing(false) }} />)}
              </div>
            ))}
            {/* Rep-grouped (All reps + team) */}
            {!loading && showRepGrouped && teamReps.map((rep, ri) => {
              const repAppts = deskFiltered.filter(a => (a as any).user_id === rep.id)
              if (repAppts.length === 0) return null
              const rt = repAppts.filter(a => a.appointment_date === todayStr)
              const rf = repAppts.filter(a => a.appointment_date > todayStr)
              const rp = [...repAppts.filter(a => a.appointment_date < todayStr)].sort((a, b) => a.appointment_date < b.appointment_date ? -1 : 1)
              const rg = [...buildGroups(rt), ...buildGroups(rf), ...buildGroups(rp).reverse()]
              return (
                <div key={rep.id}>
                  <button onClick={() => setExpandedRepIds(prev => { const s = new Set(prev); s.has(rep.id) ? s.delete(rep.id) : s.add(rep.id); return s })} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px 6px', border: 'none', borderBottom: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {rep.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.ink }}>{rep.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>{repAppts.length} {repAppts.length === 1 ? 'visit' : 'visits'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.inkSoft} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedRepIds.has(rep.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {expandedRepIds.has(rep.id) && rg.map(({ label, items }) => (
                    <div key={label}>
                      <DesktopSectionHeader label={label} color={sectionColor(label)} count={`${items.length} ${items.length === 1 ? 'visit' : 'visits'}`} />
                      {items.map(appt => <DesktopListRow key={appt.id} appt={appt} active={selectedId === appt.id} onClick={() => { setSelectedId(appt.id); setDesktopEditing(false) }} />)}
                    </div>
                  ))}
                </div>
              )
            })}
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
        {toast && <SuccessBanner message={toast.message} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  // ── Mobile timeline render ───────────────────────────────────────────────────
  const dayTitle = selectedDay === 'today' ? 'Today' : selectedDay === 'yesterday' ? 'Yesterday' : selectedDay === 'tomorrow' ? 'Tomorrow' : new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <>
      <style>{`.appt-tl-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F3F4F6', fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>

        {/* Header */}
        <AppTopBar
          right={<button onClick={() => router.push('/dashboard/appointments/new')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 16px -5px rgba(37,99,235,0.6)' }}>+ New</button>}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8A94A6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{getEyebrow(selectedDay)}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0B1220', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{dayTitle}</div>
            <div style={{ fontSize: 13, color: '#8A94A6', marginTop: 3 }}>
              <span style={{ fontWeight: 700, color: '#2563EB' }}>{upcomingCount} upcoming</span>
              {' · '}{doneCount} done
              {cancelledCount > 0 ? ` · ${cancelledCount} cancelled` : ''}
              {needsFollowUpCount > 0 ? <span style={{ color: '#F97316', fontWeight: 700 }}> · {needsFollowUpCount} needs follow-up</span> : ''}
            </div>
          </div>
        </AppTopBar>

        {/* Rep chip row — owner/manager with team only */}
        {teamReps.length > 1 && (
          <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 6, overflowX: 'auto', background: '#fff', flexShrink: 0, WebkitOverflowScrolling: 'touch' as any }}>
            {[{ id: 'all', name: 'All reps' }, ...teamReps].map(m => {
              const isMe = m.id === userId
              const repDayCount = m.id === 'all' ? dayAppts.length : dayAppts.filter(a => a.user_id === m.id).length
              if (m.id !== 'all' && !isMe && repDayCount === 0) return null
              const active = repFilter === m.id
              return (
                <button key={m.id} onClick={() => setRepFilter(m.id)} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 99, border: `1.5px solid ${active ? T.blue : 'rgba(15,23,42,0.08)'}`, background: active ? T.blueSoft : '#fff', color: active ? T.blue : T.inkMid, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {m.name}
                </button>
              )
            })}
          </div>
        )}

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
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setCalendarOpen(v => !v)}
              style={{ width: 46, height: 46, borderRadius: 11, border: calendarOpen ? '1px solid #2563EB' : '1px solid #E2E8F0', background: calendarOpen ? '#EFF4FF' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Calendar size={20} strokeWidth={1.8} color={calendarOpen ? '#2563EB' : '#64748B'} />
            </button>

            {calendarOpen && (() => {
              const DAYS_OF_WEEK = ['S','M','T','W','T','F','S']
              const firstWeekday = new Date(calYear, calMonth, 1).getDay()
              const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate()
              const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
              const todayStr2    = getDayDateStr('today')
              const selectedDateStr =
                selectedDay === 'today'     ? getDayDateStr('today')     :
                selectedDay === 'yesterday' ? getDayDateStr('yesterday') :
                selectedDay === 'tomorrow'  ? getDayDateStr('tomorrow')  : selectedDay
              const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

              function navMonth(delta: number) {
                let m = calMonth + delta, y = calYear
                if (m < 0)  { m = 11; y-- }
                if (m > 11) { m = 0;  y++ }
                setCalMonth(m); setCalYear(y)
              }

              function clickDay(cellIdx: number) {
                const dayNum = cellIdx - firstWeekday + 1
                if (dayNum < 1 || dayNum > daysInMonth) return
                const ds = toDateStr(calYear, calMonth, dayNum)
                if (ds === getDayDateStr('today'))          setSelectedDay('today')
                else if (ds === getDayDateStr('yesterday')) setSelectedDay('yesterday')
                else if (ds === getDayDateStr('tomorrow'))  setSelectedDay('tomorrow')
                else setSelectedDay(ds)
                setCalendarOpen(false)
              }

              return (
                <>
                  {/* Scrim — closes popup on outside click */}
                  <div onClick={() => setCalendarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                  {/* Calendar popup */}
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 99, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(15,23,42,0.16)', padding: '12px 14px 10px', width: 'min(calc(100vw - 32px), 320px)' }}>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <button onClick={e => { e.stopPropagation(); navMonth(-1) }} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(15,23,42,0.10)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475467' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0B1220', letterSpacing: '-0.01em' }}>{monthLabel}</span>
                      <button onClick={e => { e.stopPropagation(); navMonth(1) }} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(15,23,42,0.10)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475467' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                    {/* Day-of-week headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                      {DAYS_OF_WEEK.map((d, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#8A94A6', letterSpacing: '0.04em', paddingBottom: 4 }}>{d}</div>
                      ))}
                    </div>
                    {/* Date cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
                      {Array.from({ length: totalCells }, (_, i) => {
                        const dayNum    = i - firstWeekday + 1
                        const isValid   = dayNum >= 1 && dayNum <= daysInMonth
                        const ds        = isValid ? toDateStr(calYear, calMonth, dayNum) : ''
                        const isToday   = ds === todayStr2
                        const isSelected = ds === selectedDateStr
                        const hasDot    = isValid && monthDots.has(ds)
                        return (
                          <div
                            key={i}
                            onClick={() => isValid && clickDay(i)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 6, cursor: isValid ? 'pointer' : 'default' }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: isToday || isSelected ? 800 : 500,
                              background: isSelected ? '#2563EB' : isToday ? '#EFF4FF' : 'transparent',
                              color: isSelected ? '#fff' : isToday ? '#2563EB' : isValid ? '#0B1220' : 'transparent',
                              border: isToday && !isSelected ? '1.5px solid #2563EB' : '1.5px solid transparent',
                            }}>
                              {isValid ? dayNum : ''}
                            </div>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', marginTop: 2, background: hasDot ? (isSelected ? '#fff' : '#2563EB') : 'transparent' }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
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

            {/* Empty state */}
            {!dayLoading && displayedDayAppts.length === 0 && !(showRepGrouped && dayAppts.length > 0) && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(37,99,235,.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={22} color="#2563EB" strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No visits yet</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Schedule your first appointment to get started.</div>
                <button onClick={() => router.push('/dashboard/appointments/new')} style={{ height: 40, padding: '0 20px', borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Schedule one
                </button>
              </div>
            )}

            {/* Rep-grouped view (All reps + team) */}
            {!dayLoading && showRepGrouped && dayAppts.length > 0 && teamReps.map((rep, ri) => {
              const repAppts = dayAppts.filter(a => a.user_id === rep.id)
              if (repAppts.length === 0) return null
              return (
                <div key={rep.id} style={{ marginBottom: 20 }}>
                  <button onClick={() => setExpandedRepIds(prev => { const s = new Set(prev); s.has(rep.id) ? s.delete(rep.id) : s.add(rep.id); return s })} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 12, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {rep.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.ink }}>{rep.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>{repAppts.length} {repAppts.length === 1 ? 'visit' : 'visits'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.inkSoft} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedRepIds.has(rep.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {expandedRepIds.has(rep.id) && repAppts.map((appt, i) => (
                    <TimelineRow key={appt.id} appt={appt} isLast={i === repAppts.length - 1} expanded={expandedId === appt.id} onToggle={() => setExpandedId(p => p === appt.id ? null : appt.id)} onNavigate={path => router.push(path)} isFollowUp={false} />
                  ))}
                </div>
              )
            })}

            {/* Flat / single-rep view */}
            {!dayLoading && !showRepGrouped && displayedDayAppts.length > 0 && displayedDayAppts.flatMap((appt, i) => {
              const rows: React.ReactNode[] = []
              if (selectedDay === 'today' && i === nowInsertIdx) rows.push(<NowRow key="now" />)
              rows.push(
                <TimelineRow key={appt.id} appt={appt} isLast={i === displayedDayAppts.length - 1} expanded={expandedId === appt.id} onToggle={() => setExpandedId(prev => prev === appt.id ? null : appt.id)} onNavigate={path => router.push(path)} isFollowUp={selectedDay === 'today' && appt.status === 'upcoming' && (appt.endTime ? toHour(appt.endTime) : appt.hour + 0.5) < NOW} />
              )
              return rows
            })}
            {!dayLoading && !showRepGrouped && selectedDay === 'today' && nowInsertIdx === displayedDayAppts.length && displayedDayAppts.length > 0 && (
              <NowRow key="now-end" />
            )}

          </div>
        </div>

        {/* Edit screen */}
        <EditScreen open={editOpen} appt={editing} onClose={closeEdit} onSave={saveEdit} onDelete={deleteAppt} />

        {/* Toast */}
        {toast && <SuccessBanner message={toast.message} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
      </div>
    </>
  )
}
