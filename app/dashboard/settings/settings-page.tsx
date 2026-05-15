'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { SIcon } from '@/components/SIcon'
import type { IconName } from '@/components/SIcon'

// ── TYPES ────────────────────────────────────────
type SectionId = 'profile' | 'password' | 'notifications' | 'company' | 'team' | 'contract' | 'price' | 'billing' | 'invoices'

// ── NAV GROUPS ───────────────────────────────────
const GROUPS: { title: string; items: { id: SectionId; icon: IconName; label: string; desc: string }[] }[] = [
  {
    title: 'ACCOUNT',
    items: [
      { id: 'profile',       icon: 'user',     label: 'Profile',        desc: 'Name, email & avatar' },
      { id: 'password',      icon: 'lock',      label: 'Password',       desc: 'Sign-in & 2FA' },
      { id: 'notifications', icon: 'bell',      label: 'Notifications',  desc: 'Email & push' },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { id: 'company',  icon: 'company',  label: 'Company',    desc: 'Logo, address, defaults' },
      { id: 'team',     icon: 'team',     label: 'Team',       desc: '5 members · 1 invite' },
      { id: 'contract', icon: 'contract', label: 'Contract',   desc: 'Terms template' },
      { id: 'price',    icon: 'price',    label: 'Price list', desc: 'Opening types & rates' },
    ],
  },
  {
    title: 'BILLING',
    items: [
      { id: 'billing',  icon: 'card',    label: 'Plan & billing', desc: 'Pro · CA$24/mo' },
      { id: 'invoices', icon: 'invoice', label: 'Invoices',       desc: 'Subscription history' },
    ],
  },
]

// ── SHARED PRIMITIVES ────────────────────────────

function Card({ children, padding = 22 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding,
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
    }}>
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

function SectionHeader({ kicker, title, subtitle, action }: { kicker?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        {kicker && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{kicker}</div>}
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.5px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
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

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 38, height: 22, borderRadius: 999, flexShrink: 0,
        background: on ? '#2563EB' : '#E2E5EA',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}>
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 19 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}

function Pill({ tone, children }: { tone: 'neutral' | 'blue' | 'green' | 'amber' | 'red'; children: React.ReactNode }) {
  const colors = {
    neutral: { bg: 'rgba(100,116,139,0.1)', color: '#64748B' },
    blue:    { bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
    green:   { bg: 'rgba(15,138,107,0.12)', color: '#0F8A6B' },
    amber:   { bg: 'rgba(180,83,9,0.1)',    color: '#B45309' },
    red:     { bg: 'rgba(220,38,38,0.1)',   color: '#DC2626' },
  }
  const c = colors[tone]
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.35px',
      padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase',
    }}>
      {children}
    </span>
  )
}

function SaveBar({ dirty, valid, onSave, onDiscard }: { dirty: boolean; valid: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: '#fff',
      borderTop: `1px solid ${dirty ? '#2563EB' : '#EEF0F4'}`,
      boxShadow: dirty ? '0 12px 32px -16px rgba(37,99,235,0.45)' : 'none',
      padding: '14px 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      zIndex: 10,
    }}>
      <div style={{ fontSize: 13, color: dirty ? '#475569' : '#94A3B8' }}>
        {dirty ? 'You have unsaved changes' : 'All changes saved'}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onDiscard} disabled={!dirty}
          style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E5EA',
            background: '#fff', color: dirty ? '#475569' : '#94A3B8',
            fontSize: 13, fontWeight: 600, cursor: dirty ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}>
          Discard
        </button>
        <button
          onClick={onSave} disabled={!dirty || !valid}
          style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: dirty && valid ? '#2563EB' : '#E2E5EA',
            color: dirty && valid ? '#fff' : '#94A3B8',
            fontSize: 13, fontWeight: 600,
            cursor: dirty && valid ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: dirty && valid ? '0 6px 16px -6px rgba(37,99,235,0.5)' : 'none',
          }}>
          Save changes
        </button>
      </div>
    </div>
  )
}

function Toast({ text }: { text: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: '#0A1628', color: '#fff', padding: '10px 20px',
      borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 1000,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    }}>
      {text}
    </div>
  )
}

// ── SECTIONS ─────────────────────────────────────

function ProfileSection({ flash }: { flash: (m: string) => void }) {
  const [values, setValues] = useState({ firstName: 'Tanya', lastName: 'Slavina', email: 'tanya@estimare.ca', phone: '' })
  const [initial] = useState({ ...values })
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = !!values.firstName && !!values.lastName && !!values.email

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Profile" subtitle="Your personal information and avatar." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: '#2563EB',
              color: '#fff', fontSize: 20, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {values.firstName?.[0]}{values.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{values.firstName} {values.lastName}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{values.email}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="First name" value={values.firstName} onChange={v => setValues(s => ({ ...s, firstName: v }))} required />
            <Field label="Last name" value={values.lastName} onChange={v => setValues(s => ({ ...s, lastName: v }))} required />
          </div>
          <Field label="Email" value={values.email} onChange={v => setValues(s => ({ ...s, email: v }))} type="email" required />
          <Field label="Phone" value={values.phone} onChange={v => setValues(s => ({ ...s, phone: v }))} placeholder="+1 (555) 000-0000" />
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid} onSave={() => flash('Profile saved')} onDiscard={() => setValues({ ...initial })} />
    </div>
  )
}

function PasswordSection({ flash }: { flash: (m: string) => void }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [twofa, setTwofa] = useState(false)
  const dirty = !!values.current || !!values.next || !!values.confirm
  const valid = !!values.current && values.next.length >= 8 && values.next === values.confirm

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Password" subtitle="Update your password and manage two-factor authentication." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Change password</SectionLabel>
          <Field label="Current password" value={values.current} onChange={v => setValues(s => ({ ...s, current: v }))} type="password" required />
          <Field label="New password" value={values.next} onChange={v => setValues(s => ({ ...s, next: v }))} type="password" hint="At least 8 characters" required />
          <Field label="Confirm new password" value={values.confirm} onChange={v => setValues(s => ({ ...s, confirm: v }))} type="password"
            error={values.confirm && values.next !== values.confirm ? 'Passwords do not match' : undefined} required />
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>Two-factor authentication</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Add an extra layer of security to your account</div>
            </div>
            <Toggle on={twofa} onChange={v => { setTwofa(v); flash(v ? '2FA enabled' : '2FA disabled') }} />
          </div>
        </Card>
        <Card>
          <SectionLabel>Active sessions</SectionLabel>
          {[{ device: 'MacBook Pro · Chrome', location: 'Calgary, AB', lastActive: 'Now', current: true }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.device} {s.current && <Pill tone="blue">THIS DEVICE</Pill>}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.location} · {s.lastActive}</div>
              </div>
              {!s.current && (
                <button style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Sign out
                </button>
              )}
            </div>
          ))}
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid} onSave={() => { setValues({ current: '', next: '', confirm: '' }); flash('Password updated') }} onDiscard={() => setValues({ current: '', next: '', confirm: '' })} />
    </div>
  )
}

function NotificationsSection({ flash }: { flash: (m: string) => void }) {
  const [email, setEmail] = useState({ estimateViewed: true, estimateSigned: true, depositPaid: true, invoiceOverdue: true, teamInvite: false })
  const [digest, setDigest] = useState<'off' | 'weekly' | 'daily'>('weekly')
  const [push, setPush] = useState({ pushNew: true, pushPayment: true, pushTeam: false })
  const [initial] = useState({ email: { ...email }, digest, push: { ...push } })
  const dirty = JSON.stringify({ email, digest, push }) !== JSON.stringify(initial)

  const emailLabels: Record<string, string> = {
    estimateViewed: 'Estimate viewed', estimateSigned: 'Estimate signed',
    depositPaid: 'Deposit paid', invoiceOverdue: 'Invoice overdue', teamInvite: 'Team invite',
  }
  const pushLabels: Record<string, string> = {
    pushNew: 'New estimates', pushPayment: 'Payments', pushTeam: 'Team activity',
  }

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Notifications" subtitle="Choose what updates you want to receive." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Email notifications</SectionLabel>
          {Object.entries(emailLabels).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 14, color: '#0A1628' }}>{label}</div>
              <Toggle on={email[key as keyof typeof email]} onChange={v => setEmail(s => ({ ...s, [key]: v }))} />
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 10 }}>Digest emails</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['off', 'weekly', 'daily'] as const).map(d => (
                <button key={d} onClick={() => setDigest(d)} style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${digest === d ? '#2563EB' : '#E2E5EA'}`,
                  background: digest === d ? 'rgba(37,99,235,0.08)' : '#fff',
                  color: digest === d ? '#2563EB' : '#475569',
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                }}>{d}</button>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <SectionLabel>Push notifications</SectionLabel>
          {Object.entries(pushLabels).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 14, color: '#0A1628' }}>{label}</div>
              <Toggle on={push[key as keyof typeof push]} onChange={v => setPush(s => ({ ...s, [key]: v }))} />
            </div>
          ))}
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={true} onSave={() => flash('Notifications saved')} onDiscard={() => { setEmail(initial.email); setDigest(initial.digest); setPush(initial.push) }} />
    </div>
  )
}

function CompanySection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [values, setValues] = useState({ companyName: 'Estimare', phone: '', website: '', addressLine: '', city: 'Calgary', province: 'AB', postal: '', licence: '', insurance: '', depositPct: '10', currency: 'CAD' })
  const [initial] = useState({ ...values })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = !!values.companyName && !!values.city && !!values.province
  const set = (k: string) => (v: string) => setValues(s => ({ ...s, [k]: v }))

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('logo_url').eq('id', user.id).single()
      if (prof?.logo_url) setLogoUrl(prof.logo_url)
    })
  }, [])

  async function compressImage(file: File): Promise<Blob> {
    const MAX_BYTES = 2 * 1024 * 1024
    if (file.size <= MAX_BYTES) return file
    return new Promise(resolve => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        const MAX_DIM = 800
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
          width = Math.round(width * ratio); height = Math.round(height * ratio)
        }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(b => resolve(b || file), 'image/jpeg', 0.85)
      }
      img.src = objectUrl
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) { flash('Please upload an image file'); return }
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/logo.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(path, blob, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', userId)
      setLogoUrl(publicUrl + '?t=' + Date.now())
      flash('Logo saved')
    } catch (err: any) {
      flash(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!userId || !logoUrl) return
    const pathMatch = logoUrl.split('/object/public/logos/')
    if (pathMatch[1]) {
      const cleanPath = pathMatch[1].split('?')[0]
      await supabase.storage.from('logos').remove([cleanPath])
    }
    await supabase.from('profiles').update({ logo_url: null }).eq('id', userId)
    setLogoUrl(null)
    flash('Logo removed')
  }

  const initials = values.companyName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO'

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Company" subtitle="Your business information shown on estimates and invoices." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Logo card */}
        <Card>
          <SectionLabel>Logo</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12, border: '1px solid #E2E5EA',
              overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: logoUrl ? '#fff' : '#F5F6F8',
            }}>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8' }}>{initials}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                {logoUrl ? 'Logo uploaded' : 'No logo uploaded yet'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                  }}>
                  {uploading ? 'Uploading...' : 'Upload logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={handleRemove}
                    style={{
                      padding: '8px 14px', background: '#fff', color: '#DC2626',
                      border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    Remove
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>PNG, JPG or SVG · Max 2 MB</div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>Business details</SectionLabel>
          <Field label="Company name" value={values.companyName} onChange={set('companyName')} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Phone" value={values.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
            <Field label="Website" value={values.website} onChange={set('website')} placeholder="https://" />
          </div>
        </Card>
        <Card>
          <SectionLabel>Address</SectionLabel>
          <Field label="Street address" value={values.addressLine} onChange={set('addressLine')} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 12px' }}>
            <Field label="City" value={values.city} onChange={set('city')} required />
            <Field label="Province" value={values.province} onChange={set('province')} required />
            <Field label="Postal code" value={values.postal} onChange={set('postal')} />
          </div>
        </Card>
        <Card>
          <SectionLabel>Business credentials</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Licence #" value={values.licence} onChange={set('licence')} />
            <Field label="Insurance #" value={values.insurance} onChange={set('insurance')} />
          </div>
        </Card>
        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Default deposit" value={values.depositPct} onChange={set('depositPct')} suffix="%" hint="Shown on every new estimate" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Currency</label>
              <select value={values.currency} onChange={e => set('currency')(e.target.value)} style={{
                width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628',
                background: '#fff', outline: 'none',
              }}>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid} onSave={() => flash('Company saved')} onDiscard={() => setValues({ ...initial })} />
    </div>
  )
}

function TeamSection({ flash }: { flash: (m: string) => void }) {
  const [members] = useState([
    { id: '1', name: 'Tanya Slavina', email: 'tanya@estimare.ca', role: 'Owner', current: true },
    { id: '2', name: 'Alex K.', email: 'alex@estimare.ca', role: 'Estimator', current: false },
  ])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Estimator')

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Team"
        action={
          <button onClick={() => setShowInvite(true)} style={{
            padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <SIcon name="plus" size={14} /> Invite member
          </button>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[{ label: 'Members', value: '2', icon: 'team' as IconName }, { label: 'Pending invites', value: '1', icon: 'mail' as IconName }, { label: 'Seats used', value: '2 / 5', icon: 'user' as IconName }].map(s => (
            <Card key={s.label} padding={18}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(37,99,235,0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SIcon name={s.icon} size={14} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <SectionLabel>Members</SectionLabel>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < members.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{m.email}</div>
              </div>
              {m.current ? (
                <Pill tone="blue">{m.role}</Pill>
              ) : (
                <select defaultValue={m.role} style={{ padding: '6px 10px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#475569', background: '#fff', cursor: 'pointer' }}>
                  <option>Owner</option><option>Admin</option><option>Estimator</option><option>Viewer</option>
                </select>
              )}
            </div>
          ))}
        </Card>
        {showInvite && (
          <Card>
            <SectionLabel>Invite member</SectionLabel>
            <Field label="Email address" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="colleague@company.com" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }}>
                <option>Admin</option><option>Estimator</option><option>Viewer</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowInvite(false); flash('Invite sent') }} style={{ padding: '9px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Send invite</button>
              <button onClick={() => setShowInvite(false)} style={{ padding: '9px 16px', background: '#fff', color: '#475569', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function ContractSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [values, setValues] = useState({ intro: 'Thank you for choosing {company_name}. This estimate is valid for 30 days.', terms: 'All work to be completed in a professional manner...', requireSign: true, showLicence: false })
  const [initial] = useState({ ...values })
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [contractFileName, setContractFileName] = useState<string | null>(null)
  const [contractFileSize, setContractFileSize] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('contract_pdf_url').eq('id', user.id).single()
      if (prof?.contract_pdf_url) setContractPdfUrl(prof.contract_pdf_url)
    })
  }, [])

  function fmtSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.type !== 'application/pdf') { flash('Please upload a PDF file'); return }
    if (file.size > 5 * 1024 * 1024) { flash('File must be under 5 MB'); return }
    setUploading(true)
    try {
      const path = `${userId}/contract.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('contracts')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(path)
      await supabase.from('profiles').update({ contract_pdf_url: publicUrl }).eq('id', userId)
      setContractPdfUrl(publicUrl)
      setContractFileName(file.name)
      setContractFileSize(fmtSize(file.size))
      flash('Contract saved')
    } catch (err: any) {
      flash(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  async function handlePdfRemove() {
    if (!userId) return
    await supabase.storage.from('contracts').remove([`${userId}/contract.pdf`])
    await supabase.from('profiles').update({ contract_pdf_url: null }).eq('id', userId)
    setContractPdfUrl(null)
    setContractFileName(null)
    setContractFileSize(null)
    flash('Contract removed')
  }

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Contract" subtitle="Template shown on every estimate PDF." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Contract PDF upload */}
        <Card>
          <SectionLabel>Contract PDF</SectionLabel>
          <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
          {contractPdfUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(15,138,107,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, color: '#0F8A6B', fontWeight: 700, lineHeight: 1 }}>&#10003;</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contractFileName || 'contract.pdf'}
                </div>
                {contractFileSize && (
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{contractFileSize}</div>
                )}
              </div>
              <button
                onClick={handlePdfRemove}
                style={{ padding: '7px 14px', background: '#fff', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                Remove
              </button>
            </div>
          ) : (
            <div style={{ border: '1.5px dashed #CBD5E1', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>Upload your contract PDF</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>PDF only · max 5 MB</div>
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={uploading}
                style={{ padding: '9px 22px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </button>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Intro paragraph</SectionLabel>
          <div style={{ marginBottom: 6, fontSize: 12, color: '#94A3B8' }}>Supports: {'{client_name}'}, {'{company_name}'}</div>
          <textarea value={values.intro} onChange={e => setValues(s => ({ ...s, intro: e.target.value }))} rows={3}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>
        <Card>
          <SectionLabel>Terms & conditions</SectionLabel>
          <textarea value={values.terms} onChange={e => setValues(s => ({ ...s, terms: e.target.value }))} rows={6}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'ui-monospace, monospace', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #EEF0F4' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>Require client signature</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>Client must sign before estimate is accepted</div>
            </div>
            <Toggle on={values.requireSign} onChange={v => setValues(s => ({ ...s, requireSign: v }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>Show licence # in footer</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>Display your business licence on the PDF</div>
            </div>
            <Toggle on={values.showLicence} onChange={v => setValues(s => ({ ...s, showLicence: v }))} />
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={true} onSave={() => flash('Contract saved')} onDiscard={() => setValues({ ...initial })} />
    </div>
  )
}

function PriceListSection({ flash }: { flash: (m: string) => void }) {
  const [items, setItems] = useState([
    { id: '1', name: 'Casement window', unit: 'ea', price: 850 },
    { id: '2', name: 'Double hung window', unit: 'ea', price: 650 },
    { id: '3', name: 'Entry door', unit: 'ea', price: 1200 },
  ])
  const [initial] = useState(JSON.stringify(items))
  const dirty = JSON.stringify(items) !== initial
  const units = ['ea', 'sq ft', 'linear ft', 'hour', 'per opening']

  const update = (id: string, key: string, val: string | number) =>
    setItems(s => s.map(i => i.id === id ? { ...i, [key]: val } : i))
  const addRow = () => setItems(s => [...s, { id: Date.now().toString(), name: 'New item', unit: 'ea', price: 0 }])
  const removeRow = (id: string) => setItems(s => s.filter(i => i.id !== id))

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Price list" subtitle="Default rates for your estimate line items."
        action={
          <button onClick={addRow} style={{ padding: '8px 14px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <SIcon name="plus" size={14} /> Add item
          </button>
        }
      />
      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 40px', gap: 0 }}>
          {['NAME', 'UNIT', 'PRICE', ''].map(h => (
            <div key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', borderBottom: '1px solid #EEF0F4' }}>{h}</div>
          ))}
          {items.map((item, i) => (
            <>
              <div key={`n${item.id}`} style={{ padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
                <input value={item.name} onChange={e => update(item.id, 'name', e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: 'transparent' }} />
              </div>
              <div key={`u${item.id}`} style={{ padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid #EEF0F4' : 'none', borderLeft: '1px solid #EEF0F4' }}>
                <select value={item.unit} onChange={e => update(item.id, 'unit', e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#475569', background: 'transparent', width: '100%', cursor: 'pointer' }}>
                  {units.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div key={`p${item.id}`} style={{ padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid #EEF0F4' : 'none', borderLeft: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#94A3B8', fontSize: 13 }}>$</span>
                <input type="number" value={item.price} onChange={e => update(item.id, 'price', Number(e.target.value))}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: 'transparent' }} />
              </div>
              <div key={`d${item.id}`} style={{ padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid #EEF0F4' : 'none', borderLeft: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => removeRow(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                  <SIcon name="trash" size={14} />
                </button>
              </div>
            </>
          ))}
        </div>
      </Card>
      <SaveBar dirty={dirty} valid={true} onSave={() => flash('Price list saved')} onDiscard={() => setItems(JSON.parse(initial))} />
    </div>
  )
}

function BillingSection({ flash }: { flash: (m: string) => void }) {
  return (
    <div>
      <SectionHeader kicker="BILLING" title="Plan & billing" subtitle="Manage your subscription and payment method." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>Pro Plan</div>
                <Pill tone="blue">ACTIVE</Pill>
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>CA$149/mo · Renews Jun 1, 2026</div>
            </div>
            <button style={{ padding: '8px 16px', border: '1px solid #E2E5EA', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              Change plan
            </button>
          </div>
          <div style={{ borderTop: '1px solid #EEF0F4', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[{ label: 'Estimates this month', value: '12' }, { label: 'Team seats', value: '2 / 5' }, { label: 'Storage', value: '0.4 GB / 10 GB' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionLabel>Payment method</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 26, background: '#1A1A2E', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>VISA</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>•••• •••• •••• 4242</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Expires 12/27</div>
              </div>
            </div>
            <button style={{ padding: '7px 14px', border: '1px solid #E2E5EA', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              Update
            </button>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '14px 16px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(180,83,9,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>Cancel plan</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>You'll lose access to all Pro features at the end of your billing period.</div>
            <button style={{ padding: '8px 16px', background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel plan
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function InvoicesSection() {
  const invoices = [
    { id: 'INV-2026-05', date: 'May 1, 2026', amount: 'CA$149.00', status: 'paid' },
    { id: 'INV-2026-04', date: 'Apr 1, 2026', amount: 'CA$149.00', status: 'paid' },
    { id: 'INV-2026-03', date: 'Mar 1, 2026', amount: 'CA$149.00', status: 'paid' },
  ]
  return (
    <div>
      <SectionHeader kicker="BILLING" title="Invoices" subtitle="Your subscription billing history." />
      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 40px' }}>
          {['INVOICE', 'DATE', 'AMOUNT', 'STATUS', ''].map(h => (
            <div key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', borderBottom: '1px solid #EEF0F4' }}>{h}</div>
          ))}
          {invoices.map((inv, i) => (
            <>
              <div key={`id${inv.id}`} style={{ padding: '12px 16px', borderBottom: i < invoices.length - 1 ? '1px solid #EEF0F4' : 'none', fontSize: 13, fontFamily: 'ui-monospace, monospace', color: '#2563EB' }}>{inv.id}</div>
              <div key={`d${inv.id}`} style={{ padding: '12px 16px', borderBottom: i < invoices.length - 1 ? '1px solid #EEF0F4' : 'none', fontSize: 13, color: '#475569' }}>{inv.date}</div>
              <div key={`a${inv.id}`} style={{ padding: '12px 16px', borderBottom: i < invoices.length - 1 ? '1px solid #EEF0F4' : 'none', fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{inv.amount}</div>
              <div key={`s${inv.id}`} style={{ padding: '12px 16px', borderBottom: i < invoices.length - 1 ? '1px solid #EEF0F4' : 'none' }}><Pill tone="green">{inv.status}</Pill></div>
              <div key={`dl${inv.id}`} style={{ padding: '12px 16px', borderBottom: i < invoices.length - 1 ? '1px solid #EEF0F4' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}><SIcon name="download" size={14} /></button>
              </div>
            </>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── SECTION RENDERER ─────────────────────────────
const SECTIONS: Record<SectionId, (props: { flash: (m: string) => void }) => React.ReactElement> = {
  profile:       (p) => <ProfileSection {...p} />,
  password:      (p) => <PasswordSection {...p} />,
  notifications: (p) => <NotificationsSection {...p} />,
  company:       (p) => <CompanySection {...p} />,
  team:          (p) => <TeamSection {...p} />,
  contract:      (p) => <ContractSection {...p} />,
  price:         (p) => <PriceListSection {...p} />,
  billing:       (p) => <BillingSection {...p} />,
  invoices:      (p) => <InvoicesSection />,
}

// ── MAIN PAGE ────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [active, setActive] = useState<SectionId>('profile')
  const [toast, setToast] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/auth')
    })
  }, [])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }
  const ActiveSection = SECTIONS[active]

  const handleNavClick = (id: SectionId) => {
    setActive(id)
    if (isMobile) setMobileDetail(true)
  }

  // ── MOBILE ───────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif' }}>
        {!mobileDetail ? (
          // Section list
          <div>
            <div style={{ background: '#0A1628', padding: '20px 20px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>WORKSPACE</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>Settings</div>
            </div>
            <div style={{ padding: '16px 16px 100px' }}>
              {GROUPS.map(g => (
                <div key={g.title} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', padding: '0 4px', marginBottom: 8 }}>{g.title}</div>
                  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
                    {g.items.map((item, i) => (
                      <div key={item.id} onClick={() => handleNavClick(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < g.items.length - 1 ? '1px solid #EEF0F4' : 'none', cursor: 'pointer' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(37,99,235,0.08)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <SIcon name={item.icon} size={15} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                        </div>
                        <SIcon name="chevron-r" size={16} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Detail view
          <div>
            <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 'env(safe-area-inset-top)', zIndex: 20 }}>
              <button onClick={() => setMobileDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                <SIcon name="back" size={16} /> Settings
              </button>
            </div>
            <div style={{ padding: '20px 16px 100px' }}>
              <ActiveSection flash={flash} />
            </div>
          </div>
        )}
        <BottomNav />
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width: 232, background: '#0A1628', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '22px 22px 26px', fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
          Estimate<span style={{ color: '#3B82F6' }}>OS</span>
        </div>
        <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { path: '/dashboard', label: 'Dashboard', icon: 'zap' as IconName },
            { path: '/dashboard/estimates', label: 'Estimates', icon: 'pdf' as IconName },
            { path: '/dashboard/appointments', label: 'Appointments', icon: 'bell' as IconName },
            { path: '/dashboard/clients', label: 'Clients', icon: 'user' as IconName },
            { path: '/dashboard/reports', label: 'Reports', icon: 'external' as IconName },
            { path: '/dashboard/invoices', label: 'Invoices', icon: 'invoice' as IconName },
            { path: '/dashboard/settings', label: 'Settings', icon: 'settings' as IconName },
          ].map(item => (
            <div key={item.path} onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                color: item.path === '/dashboard/settings' ? '#fff' : 'rgba(255,255,255,0.55)',
                background: item.path === '/dashboard/settings' ? 'rgba(59,130,246,0.18)' : 'transparent',
                fontSize: 14, fontWeight: item.path === '/dashboard/settings' ? 600 : 500, cursor: 'pointer',
              }}>
              <SIcon name={item.icon} size={17} /> {item.label}
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tanya Slavina</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Owner · Pro</div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top header */}
        <div style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8' }}>WORKSPACE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.5px' }}>Settings</div>
              <div style={{ color: '#CBD5E1' }}>·</div>
              <div style={{ fontSize: 14, color: '#475569' }}>Estimare</div>
            </div>
          </div>
          <Pill tone="blue">PRO PLAN</Pill>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}
            style={{ padding: '8px 14px', background: '#fff', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <SIcon name="logout" size={14} /> Sign out
          </button>
        </div>

        {/* Two-pane */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '264px 1fr', overflow: 'hidden' }}>

          {/* Sub-sidebar */}
          <div style={{ borderRight: '1px solid rgba(10,22,40,0.06)', padding: '18px 12px', overflowY: 'auto', background: '#FAFBFC' }}>
            {GROUPS.map(g => (
              <div key={g.title} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', padding: '0 12px 8px' }}>{g.title}</div>
                {g.items.map(item => (
                  <button key={item.id} onClick={() => setActive(item.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 12px', marginBottom: 2,
                      background: active === item.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                      border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      color: active === item.id ? '#2563EB' : '#0A1628',
                    }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: active === item.id ? 'rgba(37,99,235,0.14)' : 'rgba(10,22,40,0.04)',
                      color: active === item.id ? '#2563EB' : '#64748B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SIcon name={item.icon} size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Content pane */}
          <div style={{ overflowY: 'auto', padding: '28px 36px 40px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <ActiveSection flash={flash} />
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
