'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, ArrowLeft } from 'lucide-react'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

const selectBase: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
  borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
  color: '#0A1628', background: '#fff', outline: 'none',
}

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

function ProvinceSelect({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectBase}>
        <option value="">— Select —</option>
        {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
      </select>
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 13px',
          border: `1px solid ${focused ? '#2563EB' : '#E2E5EA'}`,
          borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          color: '#0A1628', background: '#fff', outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          resize: 'vertical', boxSizing: 'border-box',
        }}
      />
      {hint && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{hint}</div>}
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

const INIT = {
  companyName: '', phone: '', website: '', addressLine: '', city: '',
  province: 'AB', postal: '', licence: '', insurance: '', interacEmail: '',
  gstHstNumber: '', companyContactEmail: '',
  licenceIssuingProvince: '', licenceExpiry: '',
  insuranceProvider: '', insuranceExpiry: '',
  wsibNumber: '', signingRepName: '', signingRepTitle: '', warrantySummary: '',
}

export default function CompanySettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [values, setValues] = useState(INIT)
  const [initial, setInitial] = useState(INIT)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = dirty && !!values.companyName
  const set = (k: keyof typeof INIT) => (v: string) => setValues(s => ({ ...s, [k]: v }))
  const [userId, setUserId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [toast, setToast] = useState('')

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_name, phone, website, address, city, province, postal, licence, insurance, logo_url, interac_email, gst_hst_number, company_contact_email, licence_issuing_province, licence_expiry_date, insurance_provider, insurance_expiry_date, wsib_number, signing_rep_name, signing_rep_title, warranty_summary')
        .eq('id', sanitizedId)
        .single()
      if (prof) {
        const loaded: typeof INIT = {
          companyName:           (prof as any).company_name              || '',
          phone:                 (prof as any).phone                     || '',
          website:               (prof as any).website                   || '',
          addressLine:           (prof as any).address                   || '',
          city:                  (prof as any).city                      || '',
          province:              (prof as any).province                  || 'AB',
          postal:                (prof as any).postal                    || '',
          licence:               (prof as any).licence                   || '',
          insurance:             (prof as any).insurance                 || '',
          interacEmail:          (prof as any).interac_email             || '',
          gstHstNumber:          (prof as any).gst_hst_number            || '',
          companyContactEmail:   (prof as any).company_contact_email     || '',
          licenceIssuingProvince:(prof as any).licence_issuing_province  || '',
          licenceExpiry:         (prof as any).licence_expiry_date       || '',
          insuranceProvider:     (prof as any).insurance_provider        || '',
          insuranceExpiry:       (prof as any).insurance_expiry_date     || '',
          wsibNumber:            (prof as any).wsib_number               || '',
          signingRepName:        (prof as any).signing_rep_name          || '',
          signingRepTitle:       (prof as any).signing_rep_title         || '',
          warrantySummary:       (prof as any).warranty_summary          || '',
        }
        setValues(loaded)
        setInitial(loaded)
        if ((prof as any).logo_url) setLogoUrl((prof as any).logo_url)
      }
    })
  }, [])

  async function saveCompany() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      company_name:             values.companyName,
      phone:                    values.phone                  || null,
      website:                  values.website                || null,
      address:                  values.addressLine            || null,
      city:                     values.city                   || null,
      province:                 values.province               || null,
      postal:                   values.postal                 || null,
      licence:                  values.licence                || null,
      insurance:                values.insurance              || null,
      interac_email:            values.interacEmail           || null,
      gst_hst_number:           values.gstHstNumber           || null,
      company_contact_email:    values.companyContactEmail    || null,
      licence_issuing_province: values.licenceIssuingProvince || null,
      licence_expiry_date:      values.licenceExpiry          || null,
      insurance_provider:       values.insuranceProvider      || null,
      insurance_expiry_date:    values.insuranceExpiry        || null,
      insurance_policy_number:  values.insurance              || null,
      wsib_number:              values.wsibNumber             || null,
      signing_rep_name:         values.signingRepName         || null,
      signing_rep_title:        values.signingRepTitle        || null,
      warranty_summary:         values.warrantySummary        || null,
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
      <div className="page-hd" style={{ background: '#fff', borderBottom: '0.5px solid #F1F3F5', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 20px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <button
          onClick={() => router.push('/dashboard/settings')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0A1628', fontFamily: 'inherit' }}
        >
          <ArrowLeft size={18} strokeWidth={2} color="#0A1628" />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>Company</span>
        </button>
      </div>

      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Business details */}
        <Card>
          <SectionLabel>Business details</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Company Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0, border: logoUrl ? '1px solid #E5E7EB' : '2px dashed #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: logoUploading ? 'not-allowed' : 'pointer', opacity: logoUploading ? 0.7 : 1 }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><ImagePlus size={24} color="#9CA3AF" strokeWidth={1.5} /><span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Logo</span></>
                }
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>PNG, JPG, SVG or WebP · Max 5 MB</div>
                {logoUrl && (
                  <button onClick={async () => { if (!userId) return; await supabase.from('profiles').update({ logo_url: null }).eq('id', userId); setLogoUrl(null); flash('Logo removed') }}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
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

        {/* Address */}
        <Card>
          <SectionLabel>Address</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Street address</label>
            <AddressAutocomplete
              value={values.addressLine}
              placeholder="123 Maple St"
              onChange={v => setValues(p => ({ ...p, addressLine: v }))}
              onSelect={({ street, city, province, postalCode }) => setValues(p => ({
                ...p, addressLine: street,
                ...(city ? { city } : {}),
                ...(province ? { province } : {}),
                ...(postalCode ? { postal: postalCode } : {}),
              }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0 12px' }}>
            <Field label="City" value={values.city} onChange={set('city')} required />
            <ProvinceSelect label="Province" value={values.province} onChange={set('province')} required />
            <Field label="Postal Code" value={values.postal} onChange={set('postal')} />
          </div>
        </Card>

        {/* Business credentials */}
        <Card>
          <SectionLabel>Business credentials</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Licence #" value={values.licence} onChange={set('licence')} />
            <ProvinceSelect label="Issuing Province" value={values.licenceIssuingProvince} onChange={set('licenceIssuingProvince')} />
          </div>
          <Field label="Licence Expiry Date" value={values.licenceExpiry} onChange={set('licenceExpiry')} type="date" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Insurance Provider" value={values.insuranceProvider} onChange={set('insuranceProvider')} placeholder="e.g. Intact Insurance" />
            <Field label="Policy #" value={values.insurance} onChange={set('insurance')} />
          </div>
          <Field label="Insurance Expiry Date" value={values.insuranceExpiry} onChange={set('insuranceExpiry')} type="date" />
          <Field label="WSIB / WCB Number" value={values.wsibNumber} onChange={set('wsibNumber')} />
        </Card>

        {/* Tax & Compliance */}
        <Card>
          <SectionLabel>Tax &amp; Compliance</SectionLabel>
          <Field label="GST / HST Number" value={values.gstHstNumber} onChange={set('gstHstNumber')} hint="Shown on invoices" />
          <Field label="Company Contact Email" value={values.companyContactEmail} onChange={set('companyContactEmail')} type="email" placeholder="contact@yourcompany.ca" hint="Used as reply-to on emails sent to clients, and shown on PDFs" />
        </Card>

        {/* Defaults */}
        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <Field label="Interac e-Transfer Email" value={values.interacEmail} onChange={set('interacEmail')} placeholder="payments@yourcompany.ca" hint="Shown on deposit invoice emails sent to clients" />
        </Card>

        {/* Documents & Signature */}
        <Card>
          <SectionLabel>Documents &amp; Signature</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Signing Representative Name" value={values.signingRepName} onChange={set('signingRepName')} placeholder="Jane Smith" />
            <Field label="Title" value={values.signingRepTitle} onChange={set('signingRepTitle')} placeholder="Owner / GM" />
          </div>
          <TextArea label="Warranty Summary" value={values.warrantySummary} onChange={set('warrantySummary')} placeholder="Describe your warranty terms..." hint="Appears in the Warranty section of contracts" />
        </Card>

        <SaveBar dirty={dirty} valid={valid} onSave={saveCompany} onDiscard={() => setValues({ ...initial })} />
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
