'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, validateName, validatePhone, validateEmail } from '@/lib/clientValidation'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import AppTopBar from '@/components/AppTopBar'

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

function formatPostal(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw
}

const C = {
  ink: '#0B1220', inkMid: '#475467', inkSoft: '#8A94A6',
  border: 'rgba(15,23,42,0.12)',
  bg: '#F4F6FB', card: '#FFFFFF',
  blue: '#2563EB',
  err: '#C0341A',
}

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  fontSize: 15, color: C.ink, background: C.card,
  outline: 'none', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: C.inkMid, letterSpacing: '0.04em',
  textTransform: 'uppercase', marginBottom: 6,
}
const errStyle: React.CSSProperties = { fontSize: 11, color: C.err, marginTop: 4 }
const errBorder = `1.5px solid ${C.err}`

type Errors = Partial<Record<'name' | 'phone' | 'email', string | null>>

export default function NewClientPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [saving,      setSaving]      = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [errors,      setErrors]      = useState<Errors>({})

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', city: '', province: 'AB', postal_code: '',
    notes: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  function clr(k: keyof Errors)      { setErrors(p => ({ ...p, [k]: null })) }

  async function save() {
    setGlobalError('')
    const nameErr  = validateName(form.name)
    const phoneErr = !form.phone.trim() ? 'Phone is required' : validatePhone(form.phone)
    const emailErr = validateEmail(form.email)
    const errs: Errors = { name: nameErr, phone: phoneErr, email: emailErr }
    setErrors(errs)
    if (Object.values(errs).some(v => !!v)) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const uid = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      // Resolve team owner so all team members share one client pool
      let ownerId = uid
      try {
        const { data: prof } = await supabase
          .from('profiles').select('team_owner_id').eq('id', uid).single()
        if (prof?.team_owner_id) ownerId = prof.team_owner_id
      } catch {}

      const { data: created, error: dbErr } = await supabase
        .from('clients')
        .insert({
          owner_id:    ownerId,
          name:        form.name.trim(),
          phone:       form.phone.trim()       || null,
          email:       form.email.trim()       || null,
          address:     form.address.trim()     || null,
          city:        form.city.trim()        || null,
          province:    form.province           || null,
          postal_code: form.postal_code.trim() || null,
          notes:       form.notes.trim()       || null,
        })
        .select('id')
        .single()

      if (dbErr || !created) {
        setGlobalError('Failed to save client. Please try again.')
        return
      }
      router.push(`/dashboard/clients/${created.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <AppTopBar
        onBack={() => router.push('/dashboard/clients')}
        backLabel="Clients"
        title="New client"
      />

      <div style={{ flex: 1, padding: '24px 16px 120px', maxWidth: 560, width: '100%', margin: '0 auto' }}>

        {/* Contact info */}
        <div style={{ background: C.card, borderRadius: 16, padding: '20px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.inkSoft, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
            Contact info
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Full name *</label>
            <input
              value={form.name}
              onChange={e => { set('name', e.target.value); clr('name') }}
              placeholder="Jane Smith"
              style={{ ...inp, border: errors.name ? errBorder : inp.border }}
            />
            {errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Phone *</label>
            <input
              value={form.phone}
              onChange={e => { set('phone', formatPhone(e.target.value)); clr('phone') }}
              placeholder="(780) 555-0100"
              inputMode="tel"
              style={{ ...inp, border: errors.phone ? errBorder : inp.border }}
            />
            {errors.phone && <div style={errStyle}>{errors.phone}</div>}
          </div>

          <div>
            <label style={lbl}>Email</label>
            <input
              value={form.email}
              onChange={e => { set('email', e.target.value); clr('email') }}
              placeholder="jane@example.com"
              inputMode="email"
              autoCapitalize="off"
              style={{ ...inp, border: errors.email ? errBorder : inp.border }}
            />
            {errors.email && <div style={errStyle}>{errors.email}</div>}
          </div>
        </div>

        {/* Address */}
        <div style={{ background: C.card, borderRadius: 16, padding: '20px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.inkSoft, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
            Address
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Street address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={v => set('address', v)}
              onSelect={r => {
                set('address',     r.street)
                set('city',        r.city)
                set('province',    r.province)
                set('postal_code', formatPostal(r.postalCode))
              }}
              placeholder="123 Main St"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>City</label>
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Edmonton"
              style={inp}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Province</label>
              <select
                value={form.province}
                onChange={e => set('province', e.target.value)}
                style={{
                  ...inp, cursor: 'pointer', paddingRight: 32,
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23475467' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                  appearance: 'none',
                }}
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Postal code</label>
              <input
                value={form.postal_code}
                onChange={e => set('postal_code', formatPostal(e.target.value))}
                placeholder="T5J 2R7"
                autoCapitalize="characters"
                style={inp}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: C.card, borderRadius: 16, padding: '20px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.inkSoft, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
            Notes
          </div>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any details about this client…"
            rows={4}
            style={{ ...inp, resize: 'none', lineHeight: 1.55 }}
          />
        </div>

        {globalError && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: '#FEF2F2', borderRadius: 10, fontSize: 13, color: C.err }}>
            {globalError}
          </div>
        )}
      </div>

      {/* Sticky save button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: `12px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)`,
        background: C.bg, borderTop: '1px solid rgba(15,23,42,0.07)',
      }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14,
            background: saving ? '#93C5FD' : C.blue,
            border: 'none', color: '#fff',
            fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
          }}
        >
          {saving ? 'Saving…' : 'Save client'}
        </button>
      </div>
    </div>
  )
}
