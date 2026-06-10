'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, ImagePlus, ArrowLeft } from 'lucide-react'
import AddressAutocomplete from '@/components/AddressAutocomplete'

// ── SHARED PRIMITIVES ────────────────────────────

function Card({ children, padding = 22 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, hint, error, required, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string; error?: string
  required?: boolean; prefix?: string; suffix?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 13, fontSize: 14, color: '#64748B' }}>{prefix}</span>}
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 13px',
            paddingLeft: prefix ? 28 : 13,
            paddingRight: suffix ? 28 : 13,
            border: `1px solid ${error ? '#DC2626' : focused ? '#2563EB' : '#E2E5EA'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
            color: '#0A1628', background: '#fff', outline: 'none',
            boxShadow: focused ? (error ? '0 0 0 3px rgba(220,38,38,0.12)' : '0 0 0 3px rgba(37,99,235,0.12)') : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: 13, fontSize: 14, color: '#64748B' }}>{suffix}</span>}
      </div>
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function SaveBar({ dirty, valid, onSave, onDiscard }: { dirty: boolean; valid: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginTop: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onDiscard} disabled={!dirty} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: dirty ? '#475467' : '#94A3B8', fontSize: 15, fontWeight: 500, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Discard
        </button>
        <button onClick={onSave} disabled={!valid} style={{ flex: 1, height: 52, borderRadius: 12, border: 'none', background: dirty && valid ? '#2563EB' : '#93aef5', color: '#fff', fontSize: 15, fontWeight: 600, cursor: dirty && valid ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Save changes
        </button>
      </div>
    </div>
  )
}

function Toast({ text }: { text: string }) {
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#0A1628', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      {text}
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────

export default function CompanySettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [values, setValues] = useState({ companyName: '', phone: '', website: '', addressLine: '', city: '', province: 'AB', postal: '', licence: '', insurance: '', currency: 'CAD', interacEmail: '' })
  const [initial, setInitial] = useState({ companyName: '', phone: '', website: '', addressLine: '', city: '', province: 'AB', postal: '', licence: '', insurance: '', currency: 'CAD', interacEmail: '' })
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = dirty && !!values.companyName
  const set = (k: string) => (v: string) => setValues(s => ({ ...s, [k]: v }))
  const [pricingMode, setPricingMode] = useState<'single' | 'gbb'>('single')
  const [userId, setUserId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [toast, setToast] = useState('')

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_name, phone, website, address, city, province, postal, licence, insurance, logo_url, interac_email, pricing_mode')
        .eq('id', sanitizedId)
        .single()
      if (prof) {
        const loaded = {
          companyName: (prof as any).company_name || '',
          phone:       (prof as any).phone        || '',
          website:     (prof as any).website      || '',
          addressLine: (prof as any).address      || '',
          city:        (prof as any).city         || '',
          province:    (prof as any).province     || 'AB',
          postal:      (prof as any).postal       || '',
          licence:     (prof as any).licence      || '',
          insurance:   (prof as any).insurance    || '',
          currency:    'CAD',
          interacEmail: (prof as any).interac_email || '',
        }
        setValues(loaded)
        setInitial(loaded)
        if ((prof as any).logo_url) setLogoUrl((prof as any).logo_url)
        if ((prof as any).pricing_mode === 'gbb') setPricingMode('gbb')
      }
    })
  }, [])

  async function saveCompany() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      company_name:  values.companyName,
      phone:         values.phone         || null,
      website:       values.website       || null,
      address:       values.addressLine   || null,
      city:          values.city          || null,
      province:      values.province      || null,
      postal:        values.postal        || null,
      licence:       values.licence       || null,
      insurance:     values.insurance     || null,
      interac_email: values.interacEmail  || null,
      pricing_mode:  pricingMode,
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message); return }
    setInitial({ ...values })
    flash('Company saved')
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) { flash('Only PNG, JPG, SVG or WebP allowed'); return }
    if (file.size > 5 * 1024 * 1024) { flash('File must be under 5 MB'); return }
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { flash('Upload failed'); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ logo_url: url }).eq('id', userId)
    setLogoUrl(url)
    setLogoUploading(false)
    flash('Logo uploaded')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      {/* Back header */}
      <div className="page-hd" style={{ background: '#fff', borderBottom: '0.5px solid #F1F3F5', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 20px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => router.push('/dashboard/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0A1628', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={18} strokeWidth={2} color="#0A1628" />
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>Company</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Card 1 — Business details */}
        <Card>
          <SectionLabel>Business details</SectionLabel>

          {/* Logo upload */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Company Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{
                width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                border: logoUrl ? '1px solid #E5E7EB' : '2px dashed #E5E7EB',
                background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: logoUploading ? 'not-allowed' : 'pointer',
                opacity: logoUploading ? 0.7 : 1,
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <>
                      <ImagePlus size={24} color="#9CA3AF" strokeWidth={1.5} />
                      <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Logo</span>
                    </>
                }
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>PNG, JPG, SVG or WebP · Max 5 MB</div>
                {logoUrl && (
                  <button
                    onClick={async () => {
                      if (!userId) return
                      await supabase.from('profiles').update({ logo_url: null }).eq('id', userId)
                      setLogoUrl(null)
                      flash('Logo removed')
                    }}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <Field label="Company name" value={values.companyName} onChange={set('companyName')} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Phone" value={values.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
            <Field label="Website" value={values.website} onChange={set('website')} placeholder="https://" />
          </div>
        </Card>

        {/* Card 2 — Address */}
        <Card>
          <SectionLabel>Address</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Street address</label>
            <AddressAutocomplete
              value={values.addressLine}
              placeholder="123 Maple St"
              onChange={v => setValues(p => ({ ...p, addressLine: v }))}
              onSelect={({ street, city, province, postalCode }) => setValues(p => ({
                ...p,
                addressLine: street,
                ...(city       ? { city }     : {}),
                ...(province   ? { province } : {}),
                ...(postalCode ? { postal: postalCode } : {}),
              }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0 12px' }}>
            <Field label="City" value={values.city} onChange={set('city')} required />
            <Field label="Province" value={values.province} onChange={set('province')} required />
            <Field label="Postal Code" value={values.postal} onChange={set('postal')} />
          </div>
        </Card>

        {/* Card 3 — Business credentials */}
        <Card>
          <SectionLabel>Business credentials</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Licence #" value={values.licence} onChange={set('licence')} />
            <Field label="Insurance #" value={values.insurance} onChange={set('insurance')} />
          </div>
        </Card>

        {/* Card 4 — Defaults */}
        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <Field
            label="Interac e-Transfer Email"
            value={values.interacEmail}
            onChange={set('interacEmail')}
            placeholder="payments@yourcompany.ca"
            hint="Shown on deposit invoice emails sent to clients"
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Currency</label>
            <select
              value={values.currency}
              onChange={e => set('currency')(e.target.value)}
              style={{
                width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628',
                background: '#fff', outline: 'none',
              }}
            >
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>Good / Better / Best pricing</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Show clients three pricing options on estimates</div>
            </div>
            <div
              onClick={() => setPricingMode(prev => prev === 'gbb' ? 'single' : 'gbb')}
              style={{
                width: 44, height: 24, borderRadius: 999, flexShrink: 0,
                background: pricingMode === 'gbb' ? '#2563EB' : '#E2E5EA',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: pricingMode === 'gbb' ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>
        </Card>

        <SaveBar dirty={dirty} valid={valid} onSave={saveCompany} onDiscard={() => setValues({ ...initial })} />
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
