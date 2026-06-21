'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, validateName, validatePhone, validateEmail, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import { TAX_RATES } from '@/lib/pricing'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import TimePickerDropdown from '@/components/TimePickerDropdown'
import AppTopBar from '@/components/AppTopBar'

const LEAD_SOURCES = ['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']
const STATUSES = [
  { key: 'scheduled',   label: 'Scheduled'   },
  { key: 'in_progress', label: 'In Progress'  },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
]

interface TeamMember { id: string; name: string }

const errStyle: React.CSSProperties = { fontSize: 11, color: '#C0341A', marginTop: 4 }
const errBorder = '1.5px solid #C0341A'

function formatPostal(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw
}

export default function NewAppointmentPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [allMembers, setAllMembers] = useState<TeamMember[]>([])
  const [errors, setErrors] = useState<ClientErrors>({})
  const [prefillClientId] = useState(searchParams.get('prefill_client_id') || '')

  const now   = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [form, setForm] = useState({
    client_name:     searchParams.get('prefill_name')     || '',
    client_phone:    searchParams.get('prefill_phone')    || '',
    client_email:    searchParams.get('prefill_email')    || '',
    client_address:  searchParams.get('prefill_address')  || '',
    client_city:     searchParams.get('prefill_city')     || '',
    client_province: searchParams.get('prefill_province') || 'AB',
    postal_code:     searchParams.get('prefill_postal')   || '',
    appointment_date: today,
    appointment_time: '09:00',
    appointment_end_time: '',
    lead_source: 'Phone call',
    notes: '',
    assigned_to: '',
    status: 'scheduled',
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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const [{ data: prof }, { data: members }] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name').eq('id', sanitizedId).single(),
        supabase.from('profiles').select('id, first_name, last_name, email').eq('team_owner_id', sanitizedId),
      ])
      const ownerName = prof
        ? [( prof as any).first_name, (prof as any).last_name].filter(Boolean).join(' ') || 'You'
        : 'You'
      const owner: TeamMember = { id: sanitizedId, name: ownerName }
      const extras: TeamMember[] = (members || []).map((m: any) => ({
        id: m.id,
        name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Team member',
      }))
      const all = [owner, ...extras]
      setTeamMembers(extras)
      setAllMembers(all)
      set('assigned_to', ownerName)
    })
  }, [])

  async function save() {
    console.log('[appointments/new] save() called')
    setError('')
    const nameErr = validateName(form.client_name)
    const phoneErr = validatePhone(form.client_phone)
    const emailErr = validateEmail(form.client_email)
    const addrErr = validateAddress(form.client_address)
    const newErrors: ClientErrors = { client_name: nameErr, client_phone: phoneErr, client_email: emailErr, client_address: addrErr }
    setErrors(newErrors)
    console.log('[appointments/new] form:', JSON.stringify({ client_name: form.client_name, client_phone: form.client_phone, client_email: form.client_email }))
    console.log('[appointments/new] validation errors:', JSON.stringify(newErrors))
    console.log('[appointments/new] hasErrors:', hasErrors(newErrors))
    if (hasErrors(newErrors)) return
    if (!form.appointment_date) return setError('Date is required')
    const apptDateTime = new Date(`${form.appointment_date}T${form.appointment_time || '00:00'}`)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    console.log('[appointments/new] sanitizedId:', sanitizedId)

    // Resolve team owner ID so all team members share the same client list
    let ownerId = sanitizedId
    try {
      const { data: prof } = await supabase
        .from('profiles').select('team_owner_id').eq('id', sanitizedId).single()
      if (prof?.team_owner_id) ownerId = prof.team_owner_id
    } catch {}
    console.log('[appointments/new] ownerId:', ownerId)

    // Find-or-create client record (skip lookup if pre-filled from client card)
    let clientId: string | null = prefillClientId || null
    console.log('[appointments/new] prefillClientId:', prefillClientId, '→ clientId:', clientId)
    if (!clientId) {
      try {
        const phone = form.client_phone.trim() || null
        const email = form.client_email.trim() || null
        console.log('[appointments/new] looking up client by phone:', phone, 'email:', email)
        if (phone) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('owner_id', ownerId).eq('phone', phone).maybeSingle()
          clientId = existing?.id ?? null
          console.log('[appointments/new] lookup by phone result:', clientId)
        }
        if (!clientId && !phone && email) {
          const { data: byEmail } = await supabase
            .from('clients')
            .select('id')
            .eq('owner_id', ownerId)
            .eq('email', email)
            .maybeSingle()
          if (byEmail) clientId = byEmail.id
          console.log('[appointments/new] lookup by email result:', clientId)
        }
        console.log('[appointments/new] clientId before insert:', clientId)
        if (!clientId) {
          console.log('[appointments/new] about to insert client')
          const { data: created, error: createErr } = await supabase
            .from('clients').insert({
              owner_id:    sanitizedId,
              name:        form.client_name.trim(),
              phone:       phone,
              email:       email,
              address:     form.client_address.trim() || null,
              city:        form.client_city.trim() || null,
              province:    form.client_province || null,
              postal_code: form.postal_code.trim() || null,
            }).select('id').maybeSingle()
          if (createErr) {
            console.error('[appointments/new] client insert error:', createErr)
          }
          clientId = created?.id ?? null
          console.log('[appointments/new] client created, id:', clientId)
        }
      } catch (err) {
        console.error('[appointments/new] client create error:', err)
      }
    }
    console.log('[appointments/new] final clientId:', clientId)

    const { error: e } = await supabase.from('appointments').insert({
      user_id: sanitizedId,
      client_id: clientId,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      client_email: form.client_email.trim() || null,
      client_address: form.client_address.trim() || null,
      client_city: form.client_city.trim() || null,
      client_province: form.client_province || null,
      postal_code: form.postal_code.trim() || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      appointment_end_time: form.appointment_end_time || null,
      lead_source: form.lead_source || null,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to.trim() || null,
      status: form.status,
    })

    if (e) { setError(e.message); setSaving(false); return }
    router.push(prefillClientId ? `/dashboard/clients/${prefillClientId}` : '/dashboard/appointments')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Back" eyebrow="SCHEDULE" title="New Appointment" />

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
          <AddressAutocomplete
            value={form.client_address}
            placeholder="123 Maple St, Calgary, AB"
            error={!!errors.client_address}
            onChange={v => { clearErr('client_address'); set('client_address', v) }}
            onBlur={() => setErr('client_address', validateAddress(form.client_address))}
            onSelect={({ street, city, province, postalCode }) => {
              clearErr('client_address')
              set('client_address', street)
              if (city) set('client_city', city)
              if (province && TAX_RATES[province]) set('client_province', province)
              if (postalCode) set('postal_code', formatPostal(postalCode))
            }}
          />
          {errors.client_address && <div style={errStyle}>{errors.client_address}</div>}
        </div></div>

        <div className="r2">
          <div className="f">
            <label>City</label>
            <input
              placeholder="Calgary"
              value={form.client_city}
              onChange={e => set('client_city', e.target.value)}
            />
          </div>
          <div className="f">
            <label>Province</label>
            <select value={form.client_province} onChange={e => set('client_province', e.target.value)}>
              {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                <option key={k} value={k}>{k} — {lbl}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="r1"><div className="f">
          <label>Postal Code</label>
          <input
            placeholder="A1A 1A1"
            value={form.postal_code}
            onChange={e => set('postal_code', formatPostal(e.target.value))}
          />
        </div></div>

        <div className="sl">When</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div className="f">
            <label>Date</label>
            <input type="date" lang="en" min={today} value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)}
              style={{ width: '100%', border: '1px solid #E8E8E8', borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div className="f">
            <label>Time</label>
            <TimePickerDropdown
              value={form.appointment_time}
              date={form.appointment_date}
              onChange={v => set('appointment_time', v)}
            />
          </div>
          <div className="f">
            <label>Until (optional)</label>
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

        <div className="sl">Details</div>

        <div className="r1"><div className="f">
          <label>Notes</label>
          <textarea
            placeholder="What does the client need? Rotted frames, 3 windows, second floor..."
            rows={3} value={form.notes}
            style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical' }}
            onChange={e => set('notes', e.target.value)} />
        </div></div>

        <div className="r1"><div className="f">
          <label>Assigned To</label>
          {allMembers.length >= 2 ? (
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              {allMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          ) : (
            <input
              value=""
              disabled
              placeholder="Only you on the team"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          )}
        </div></div>

        <div style={{ height: 16 }} />

        <button className="btn-next" style={{ width: '100%' }} onClick={save} disabled={saving || hasErrors(errors)}>
          {saving ? 'Saving...' : 'Save Appointment →'}
        </button>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
