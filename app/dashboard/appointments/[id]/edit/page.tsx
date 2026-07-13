'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, validateName, validatePhone, validateEmail, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import { TAX_RATES } from '@/lib/pricing'
import TimePickerDropdown from '@/components/TimePickerDropdown'
import ConfirmModal from '@/components/ConfirmModal'
import AppTopBar from '@/components/AppTopBar'

interface TeamMember { id: string; name: string }

const LEAD_SOURCES = ['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']
const STATUSES = [
  { key: 'scheduled',   label: 'Scheduled'   },
  { key: 'in_progress', label: 'In Progress'  },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
]

function formatPostal(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const T = {
  bg:           '#F3F4F6',
  card:         '#FFFFFF',
  border:       'rgba(15,23,42,0.06)',
  borderStrong: 'rgba(15,23,42,0.10)',
  ink:          '#0B1220',
  inkMid:       '#475467',
  inkSoft:      '#8A94A6',
  blue:         '#2563EB',
  red:          '#C0341A',
}

const errStyle: React.CSSProperties = { fontSize: 11, color: T.red, marginTop: 4 }
const errBorder = `1.5px solid ${T.red}`

export default function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errors, setErrors]       = useState<ClientErrors>({})
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [overlapWarning, setOverlapWarning] = useState<{ clientName: string; time: string } | null>(null)

  const [form, setForm] = useState({
    client_name:      '',
    client_phone:     '',
    client_email:     '',
    client_address:   '',
    client_city:      '',
    client_province:  '',
    postal_code:      '',
    appointment_date:     '',
    appointment_time:     '',
    appointment_end_time: '',
    lead_source:          '',
    notes:            '',
    status:           'scheduled',
    assigned_to:      '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setErr = (k: keyof ClientErrors, v: string | null) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: keyof ClientErrors) => setErr(k, null)

  // Reset end time if start time changes and end is no longer after start
  useEffect(() => {
    if (form.appointment_end_time && form.appointment_time && form.appointment_end_time <= form.appointment_time) {
      set('appointment_end_time', '')
    }
  }, [form.appointment_time])

  useEffect(() => {
    async function check() {
      if (!form.appointment_date || !form.appointment_time || !form.appointment_end_time || !form.assigned_to) {
        setOverlapWarning(null); return
      }
      const { data } = await supabase.from('appointments')
        .select('client_name, appointment_time')
        .eq('assigned_to', form.assigned_to)
        .eq('appointment_date', form.appointment_date)
        .lt('appointment_time', form.appointment_end_time)
        .gt('appointment_end_time', form.appointment_time)
        .neq('id', id)
        .limit(1)
      setOverlapWarning(data?.length ? { clientName: (data[0] as any).client_name || 'a client', time: (data[0] as any).appointment_time } : null)
    }
    check()
  }, [form.appointment_date, form.appointment_time, form.appointment_end_time, form.assigned_to])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      const [{ data: appt }, { data: prof }, { data: members }] = await Promise.all([
        supabase.from('appointments').select('*').eq('id', id).single(),
        supabase.from('profiles').select('first_name, last_name').eq('id', sanitizedId).single(),
        supabase.from('profiles').select('id, first_name, last_name, email').eq('team_owner_id', sanitizedId),
      ])

      if (!appt) { router.push('/dashboard/appointments'); return }

      const ownerName = prof
        ? [(prof as any).first_name, (prof as any).last_name].filter(Boolean).join(' ') || 'You'
        : 'You'
      const owner: TeamMember = { id: sanitizedId, name: ownerName }
      const extras: TeamMember[] = (members || []).map((m: any) => ({
        id: m.id,
        name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Team member',
      }))
      setTeamMembers([owner, ...extras])
      const validIds = new Set([sanitizedId, ...(members || []).map((m: any) => m.id)])

      setForm({
        client_name:      appt.client_name ?? '',
        client_phone:     appt.client_phone ?? '',
        client_email:     appt.client_email ?? '',
        client_address:   appt.client_address ?? '',
        client_city:      appt.client_city ?? '',
        client_province:  appt.client_province ?? '',
        postal_code:      appt.postal_code ?? '',
        appointment_date:     appt.appointment_date     ?? '',
        appointment_time:     appt.appointment_time     ?? '',
        appointment_end_time: appt.appointment_end_time ?? '',
        lead_source:          appt.lead_source          ?? '',
        notes:            appt.notes ?? '',
        status:           appt.status ?? 'scheduled',
        assigned_to:      validIds.has(appt.assigned_to ?? '') ? (appt.assigned_to ?? '') : '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  async function save() {
    const nameErr  = validateName(form.client_name)
    const phoneErr = validatePhone(form.client_phone)
    const emailErr = validateEmail(form.client_email)
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_email: emailErr }
    setErrors(newErrors)
    if (hasErrors(newErrors)) return

    setSaving(true)
    const { error } = await supabase.from('appointments').update({
      client_name:      form.client_name.trim(),
      client_phone:     form.client_phone.trim()    || null,
      client_email:     form.client_email.trim()    || null,
      client_address:   form.client_address.trim()  || null,
      client_city:      form.client_city.trim()     || null,
      client_province:  form.client_province        || null,
      postal_code:      form.postal_code.trim()     || null,
      appointment_date: form.appointment_date,
      appointment_time:     form.appointment_time     || null,
      appointment_end_time: form.appointment_end_time || null,
      lead_source:          form.lead_source          || null,
      notes:            form.notes.trim()           || null,
      status:           form.status,
      assigned_to:      form.assigned_to            || null,
    }).eq('id', id)

    setSaving(false)
    if (!error) router.push('/dashboard/appointments')
  }

  async function deleteAppt() {
    await supabase.from('appointments').delete().eq('id', id)
    router.push('/dashboard/appointments')
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
    border: `1px solid ${T.borderStrong}`, background: T.card, color: T.ink,
    fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const chevSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`
  const selStyle: React.CSSProperties = { ...inp, appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: 32 }
  const fldLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: T.inkSoft, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const secHdr: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: T.inkSoft, textTransform: 'uppercase', padding: '20px 0 10px' }
  const card: React.CSSProperties  = { background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.inkSoft, fontSize: 14 }}>
      Loading…
    </div>
  )

  return (
    <>
      <ConfirmModal
        open={deleteOpen}
        icon="trash"
        title="Delete appointment?"
        body="This appointment will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { setDeleteOpen(false); deleteAppt() }}
        onCancel={() => setDeleteOpen(false)}
      />

      <div style={{
        minHeight: '100vh', background: T.bg,
        fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* Top bar */}
        <AppTopBar onBack={() => router.back()} backLabel="Back" eyebrow="SCHEDULE" title="Edit appointment" />

        {/* Form */}
        <div style={{ padding: '8px 16px 40px', maxWidth: 640, margin: '0 auto' }}>

          {/* CLIENT */}
          <div style={secHdr}>Client</div>
          <div style={card}>
            <div>
              <label style={fldLbl}>Name</label>
              <input
                style={errors.client_name ? { ...inp, border: errBorder } : inp}
                value={form.client_name}
                onChange={e => { clearErr('client_name'); set('client_name', e.target.value) }}
                onBlur={() => setErr('client_name', validateName(form.client_name))}
                placeholder="Jane Smith"
              />
              {errors.client_name && <div style={errStyle}>{errors.client_name}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fldLbl}>Phone</label>
                <input
                  type="tel"
                  style={errors.client_phone ? { ...inp, border: errBorder } : inp}
                  value={form.client_phone}
                  onChange={e => { clearErr('client_phone'); set('client_phone', formatPhone(e.target.value)) }}
                  onBlur={() => setErr('client_phone', validatePhone(form.client_phone))}
                  placeholder="(403) 555-0100"
                />
                {errors.client_phone && <div style={errStyle}>{errors.client_phone}</div>}
              </div>
              <div>
                <label style={fldLbl}>Email</label>
                <input
                  type="email"
                  style={errors.client_email ? { ...inp, border: errBorder } : inp}
                  value={form.client_email}
                  onChange={e => { clearErr('client_email'); set('client_email', e.target.value) }}
                  onBlur={() => setErr('client_email', validateEmail(form.client_email))}
                  placeholder="jane@email.com"
                />
                {errors.client_email && <div style={errStyle}>{errors.client_email}</div>}
              </div>
            </div>

            <div>
              <label style={fldLbl}>Lead source</label>
              <select style={selStyle} value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
                <option value="">Select source</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={fldLbl}>Address</label>
              <input
                style={inp}
                value={form.client_address}
                onChange={e => set('client_address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fldLbl}>City</label>
                <input style={inp} value={form.client_city} onChange={e => set('client_city', e.target.value)} placeholder="Calgary" />
              </div>
              <div>
                <label style={fldLbl}>Postal code</label>
                <input style={inp} value={form.postal_code} onChange={e => set('postal_code', formatPostal(e.target.value))} placeholder="T2P 1J9" maxLength={7} />
              </div>
            </div>

            <div>
              <label style={fldLbl}>Province</label>
              <select style={selStyle} value={form.client_province} onChange={e => set('client_province', e.target.value)}>
                <option value="">Select province</option>
                {Object.entries(TAX_RATES).sort().map(([code]) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* WHEN */}
          <div style={secHdr}>When</div>
          <div style={{ background: '#EEF3FF', borderRadius: 14, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                <label style={fldLbl}>Date</label>
                <input type="date" lang="en" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)}
                  style={{ width: '100%', border: '1px solid #E8E8E8', borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', WebkitAppearance: 'none', appearance: 'none', color: form.appointment_date ? '#0A1628' : '#9CA3AF' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={fldLbl}>Arrives after</label>
                <TimePickerDropdown
                  value={form.appointment_time}
                  date={form.appointment_date}
                  onChange={v => set('appointment_time', v)}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={fldLbl}>Arrives before</label>
                <TimePickerDropdown
                  value={form.appointment_end_time}
                  date={form.appointment_date}
                  onChange={v => set('appointment_end_time', v)}
                  allowNone
                  noTodayFilter
                  minAfter={form.appointment_time}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: overlapWarning ? 10 : 0 }}>
              {[60, 120, 180, 240].map(mins => {
                const expectedEnd = form.appointment_time ? addMinutesToTime(form.appointment_time, mins) : ''
                const isActive = !!form.appointment_time && !!form.appointment_end_time && form.appointment_end_time === expectedEnd
                return (
                  <button key={mins} type="button"
                    onClick={() => { if (form.appointment_time) set('appointment_end_time', addMinutesToTime(form.appointment_time, mins)) }}
                    style={{
                      height: 30, padding: '0 12px', borderRadius: 99,
                      background: isActive ? '#2563EB' : '#fff',
                      color: isActive ? '#fff' : '#475467',
                      border: isActive ? 'none' : '1px solid #D0D5DD',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {mins / 60} hr
                  </button>
                )
              })}
            </div>

            {overlapWarning && (
              <div style={{ background: '#FEF3E2', border: '1px solid #FBDFA8', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, lineHeight: '20px' }}>⚠️</span>
                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                  <strong>{teamMembers.find(m => m.id === form.assigned_to)?.name || 'This rep'}</strong> already has an appointment with <strong>{overlapWarning.clientName}</strong> at {overlapWarning.time} that overlaps.
                </div>
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div style={secHdr}>Details</div>
          <div style={card}>
            <div>
              <label style={fldLbl}>Assigned to</label>
              {teamMembers.length >= 2 ? (
                <select style={selStyle} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={{ ...inp, opacity: 0.5, cursor: 'not-allowed' }}
                  value={teamMembers[0]?.name ?? ''}
                  disabled
                  placeholder="Only you on the team"
                />
              )}
            </div>

            <div>
              <label style={fldLbl}>Notes</label>
              <textarea
                style={{ ...inp, height: 88, padding: 14, resize: 'vertical' as const }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="What does the client need?"
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button onClick={() => router.back()} style={{
              flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.borderStrong}`,
              background: T.card, color: T.inkMid, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving || hasErrors(errors)} style={{
              flex: 2, height: 48, borderRadius: 12, border: 'none',
              background: (saving || hasErrors(errors)) ? T.inkSoft : T.blue,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: (saving || hasErrors(errors)) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <button onClick={() => setDeleteOpen(true)} style={{
            marginTop: 12, width: '100%', padding: 14, borderRadius: 12,
            background: '#FEF2F2', color: '#EF4444', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Delete appointment
          </button>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </>
  )
}
