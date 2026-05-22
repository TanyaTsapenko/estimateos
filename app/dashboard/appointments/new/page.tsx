'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, validateName, validatePhone, validateEmail, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'

const LEAD_SOURCES = ['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']
const STATUSES = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

interface TeamMember { id: string; name: string }

const errStyle: React.CSSProperties = { fontSize: 11, color: '#C0341A', marginTop: 4 }
const errBorder = '1.5px solid #C0341A'

export default function NewAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [errors, setErrors] = useState<ClientErrors>({})

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    appointment_date: today,
    appointment_time: '09:00',
    lead_source: 'Phone call',
    notes: '',
    assigned_to: '',
    status: 'scheduled',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setErr = (k: keyof ClientErrors, v: string | null) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: keyof ClientErrors) => setErr(k, null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: members } = await supabase
        .from('team_members')
        .select('id, first_name, last_name, email')
        .eq('owner_id', user.id)
      if (members && members.length > 0) {
        setTeamMembers(members.map((m: any) => ({
          id: m.id,
          name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Team member',
        })))
      }
    })
  }, [])

  async function save() {
    setError('')
    const nameErr = validateName(form.client_name)
    const phoneErr = validatePhone(form.client_phone)
    const emailErr = validateEmail(form.client_email)
    const addrErr = validateAddress(form.client_address)
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_email: emailErr, client_address: addrErr }
    setErrors(newErrors)
    if (hasErrors(newErrors)) return
    if (!form.appointment_date) return setError('Date is required')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { error: e } = await supabase.from('appointments').insert({
      user_id: user.id,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      client_email: form.client_email.trim() || null,
      client_address: form.client_address.trim() || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      lead_source: form.lead_source || null,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to.trim() || null,
      status: form.status,
    })

    if (e) { setError(e.message); setSaving(false); return }
    router.push('/dashboard/appointments')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          background: '#F5F6F8', border: 'none', borderRadius: 8,
          width: 32, height: 32, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#64748B',
        }}>←</button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>SCHEDULE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>New Appointment</div>
        </div>
      </div>

      <div className="card screen-enter">
        {error && <div className="error-msg">{error}</div>}

        <div className="sl">Client</div>

        <div className="r1"><div className="f">
          <label>Client Name *</label>
          <input
            placeholder="Jane Smith"
            value={form.client_name}
            style={errors.client_name ? { border: errBorder } : undefined}
            onChange={e => { clearErr('client_name'); set('client_name', e.target.value) }}
            onBlur={() => setErr('client_name', validateName(form.client_name))}
          />
          {errors.client_name && <div style={errStyle}>{errors.client_name}</div>}
        </div></div>

        <div className="r2">
          <div className="f">
            <label>Phone</label>
            <input
              type="tel"
              placeholder="(403) 555-0100"
              value={form.client_phone}
              style={errors.client_phone ? { border: errBorder } : undefined}
              onChange={e => { clearErr('client_phone'); set('client_phone', formatPhone(e.target.value)) }}
              onBlur={() => setErr('client_phone', validatePhone(form.client_phone))}
            />
            {errors.client_phone && <div style={errStyle}>{errors.client_phone}</div>}
          </div>
          <div className="f">
            <label>Email</label>
            <input
              type="email"
              placeholder="jane@email.com"
              value={form.client_email}
              style={errors.client_email ? { border: errBorder } : undefined}
              onChange={e => { clearErr('client_email'); set('client_email', e.target.value) }}
              onBlur={() => setErr('client_email', validateEmail(form.client_email))}
            />
            {errors.client_email && <div style={errStyle}>{errors.client_email}</div>}
          </div>
        </div>

        <div className="r1"><div className="f">
          <label>Lead Source</label>
          <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div></div>

        <div className="r1"><div className="f">
          <label>Address</label>
          <input
            placeholder="123 Maple St, Calgary, AB"
            value={form.client_address}
            style={errors.client_address ? { border: errBorder } : undefined}
            onChange={e => { clearErr('client_address'); set('client_address', e.target.value) }}
            onBlur={() => setErr('client_address', validateAddress(form.client_address))}
          />
          {errors.client_address && <div style={errStyle}>{errors.client_address}</div>}
        </div></div>

        <div className="sl">When</div>

        <div className="r2">
          <div className="f">
            <label>Date</label>
            <input type="date" lang="en" value={form.appointment_date}
              onChange={e => set('appointment_date', e.target.value)} />
            {form.appointment_date && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                {new Date(form.appointment_date + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
          <div className="f">
            <label>Time</label>
            <input type="time" value={form.appointment_time}
              onChange={e => set('appointment_time', e.target.value)} />
          </div>
        </div>

        <div className="sl">Details</div>

        <div className="r1"><div className="f">
          <label>Notes</label>
          <textarea
            placeholder="What does the client need? Rotted frames, 3 windows, second floor..."
            rows={3} value={form.notes}
            style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical' }}
            onChange={e => set('notes', e.target.value)} />
        </div></div>

        {teamMembers.length > 0 && (
          <div className="r1"><div className="f">
            <label>Assigned To</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Anyone / Unassigned</option>
              {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div></div>
        )}

        {teamMembers.length === 0 && (
          <div className="r1"><div className="f">
            <label>Assigned To (optional)</label>
            <input placeholder="Your name or team member" value={form.assigned_to}
              onChange={e => set('assigned_to', e.target.value)} />
          </div></div>
        )}

        <div style={{ height: 16 }} />

        <button className="btn-next" style={{ width: '100%' }} onClick={save} disabled={saving || hasErrors(errors)}>
          {saving ? 'Saving...' : 'Save Appointment →'}
        </button>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
