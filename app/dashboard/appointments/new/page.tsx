'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LEAD_SOURCES = ['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']
const STATUSES = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

interface TeamMember { id: string; name: string }

export default function NewAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_address: '',
    appointment_date: today,
    appointment_time: '09:00',
    lead_source: 'Phone call',
    notes: '',
    assigned_to: '',
    status: 'scheduled',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      // Load team members if any exist
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
    if (!form.client_name.trim()) return setError('Client name is required')
    if (!form.appointment_date) return setError('Date is required')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { error: e } = await supabase.from('appointments').insert({
      user_id: user.id,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
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
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/appointments')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Schedule</div>
          <div className="h-big">New Appointment</div>
          <div className="h-sub">Add a client visit or lead</div>
        </div>
      </div>

      <div className="card screen-enter">
        {error && <div className="error-msg">{error}</div>}

        <div className="sl">Client</div>

        <div className="r1"><div className="f">
          <label>Client Name *</label>
          <input placeholder="Jane Smith" value={form.client_name}
            onChange={e => set('client_name', e.target.value)} />
        </div></div>

        <div className="r2">
          <div className="f">
            <label>Phone</label>
            <input type="tel" placeholder="(403) 555-0100" value={form.client_phone}
              onChange={e => set('client_phone', e.target.value)} />
          </div>
          <div className="f">
            <label>Lead Source</label>
            <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="r1"><div className="f">
          <label>Address</label>
          <input placeholder="123 Maple St, Calgary, AB" value={form.client_address}
            onChange={e => set('client_address', e.target.value)} />
        </div></div>

        <div className="sl">When</div>

        <div className="r2">
          <div className="f">
            <label>Date</label>
            <input type="date" value={form.appointment_date}
              onChange={e => set('appointment_date', e.target.value)} />
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
        {/* Assigned to — shown only if team members exist */}
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

        <button className="btn-next" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Appointment →'}
        </button>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
