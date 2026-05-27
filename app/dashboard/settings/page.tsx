'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SIcon } from '@/components/SIcon'
import type { IconName } from '@/components/SIcon'
import { Camera, ImagePlus } from 'lucide-react'
import BellButton from '@/components/BellButton'

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
      background: '#fff', borderRadius: 14, padding: 16, marginTop: 16,
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onDiscard} disabled={!dirty}
          style={{
            flex: 1, height: 52, borderRadius: 12,
            border: '1px solid #e5e7eb', background: '#fff',
            color: dirty ? '#475467' : '#94A3B8',
            fontSize: 15, fontWeight: 500,
            cursor: dirty ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}>
          Discard
        </button>
        <button
          onClick={onSave} disabled={!valid}
          style={{
            flex: 1, height: 52, borderRadius: 12, border: 'none',
            background: dirty && valid ? '#2563EB' : '#93aef5',
            color: '#fff',
            fontSize: 15, fontWeight: 600,
            cursor: dirty && valid ? 'pointer' : 'default',
            fontFamily: 'inherit',
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
  const supabase = createClient()
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [initial, setInitial] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = !!values.firstName && !!values.lastName && !!values.email
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setValues(v => ({ ...v, email: user.email || '' }))
      if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url)
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name, phone').eq('id', user.id).single()
      if (prof) {
        const loaded = {
          firstName: prof.first_name || '',
          lastName:  prof.last_name  || '',
          email:     user.email      || '',
          phone:     prof.phone      || '',
        }
        setValues(loaded)
        setInitial(loaded)
      }
    })
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 5 * 1024 * 1024) { flash('Image must be under 5 MB'); return }
    setAvatarUploading(true)
    const path = `${userId}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { flash('Upload failed'); setAvatarUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.auth.updateUser({ data: { avatar_url: url } })
    setAvatarUrl(url)
    setAvatarUploading(false)
    flash('Avatar updated')
  }

  async function saveProfile() {
    if (!userId) return
    await supabase.from('profiles').update({
      first_name: values.firstName,
      last_name:  values.lastName,
      phone:      values.phone,
    }).eq('id', userId)
    setInitial({ ...values })
    flash('Profile saved')
  }

  const initials = `${values.firstName?.[0] || ''}${values.lastName?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Profile" subtitle="Your personal information and avatar." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              <div
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', background: '#2563EB',
                  overflow: 'hidden', cursor: avatarUploading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{initials}</span>
                }
              </div>
              <div
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#fff', border: '2px solid #EEF0F4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                }}
              >
                <Camera size={13} strokeWidth={2} color="#475569" />
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="First name" value={values.firstName} onChange={v => setValues(s => ({ ...s, firstName: v }))} required />
            <Field label="Last name"  value={values.lastName}  onChange={v => setValues(s => ({ ...s, lastName: v }))}  required />
          </div>
          <Field label="Email" value={values.email} onChange={v => setValues(s => ({ ...s, email: v }))} type="email" required />
          <Field label="Phone" value={values.phone} onChange={v => setValues(s => ({ ...s, phone: v }))} placeholder="+1 (555) 000-0000" />
        </Card>
      </div>

      <SaveBar dirty={dirty} valid={valid} onSave={saveProfile} onDiscard={() => setValues({ ...initial })} />
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
  const [email, setEmail] = useState({ estimateViewed: true, estimateSigned: true, depositPaid: true, invoiceOverdue: true, teamInvite: false, estimateDeclined: true, estimateExpired: true })
  const [digest, setDigest] = useState<'off' | 'weekly' | 'daily'>('weekly')
  const [push, setPush] = useState({ pushNew: true, pushPayment: true, pushTeam: false, pushDeclined: true, pushExpired: true })
  const [initial] = useState({ email: { ...email }, digest, push: { ...push } })
  const dirty = JSON.stringify({ email, digest, push }) !== JSON.stringify(initial)

  const emailLabels: Record<string, { label: string; desc: string }> = {
    estimateViewed:  { label: 'Estimate viewed',   desc: 'Client opened your estimate' },
    estimateSigned:  { label: 'Estimate signed',   desc: 'Client signed your estimate' },
    estimateDeclined:{ label: 'Estimate declined', desc: 'Client declined your estimate' },
    estimateExpired: { label: 'Estimate expired',  desc: 'Estimate passed 30 days without response' },
    depositPaid:     { label: 'Deposit paid',      desc: 'Client paid the deposit' },
    invoiceOverdue:  { label: 'Invoice overdue',   desc: 'Invoice payment is overdue' },
    teamInvite:      { label: 'Team invite',        desc: 'Someone invited you to a team' },
  }
  const pushLabels: Record<string, { label: string; desc: string }> = {
    pushNew:      { label: 'New estimates',      desc: 'Notify on new estimate activity' },
    pushPayment:  { label: 'Payments',           desc: 'Deposits and invoice payments' },
    pushDeclined: { label: 'Estimate declined',  desc: 'Client declined your estimate' },
    pushExpired:  { label: 'Estimate expired',   desc: 'Estimate passed 30 days without response' },
    pushTeam:     { label: 'Team activity',      desc: 'Team member actions' },
  }

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Notifications" subtitle="Choose what updates you want to receive." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Email notifications</SectionLabel>
          {Object.entries(emailLabels).map(([key, { label, desc }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div>
                <div style={{ fontSize: 14, color: '#0A1628' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{desc}</div>
              </div>
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
          {Object.entries(pushLabels).map(([key, { label, desc }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div>
                <div style={{ fontSize: 14, color: '#0A1628' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{desc}</div>
              </div>
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
  const [values, setValues] = useState({ companyName: '', phone: '', website: '', addressLine: '', city: '', province: 'AB', postal: '', licence: '', insurance: '', depositPct: '10', currency: 'CAD' })
  const [initial, setInitial] = useState({ ...values })
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = dirty && !!values.companyName
  const set = (k: string) => (v: string) => setValues(s => ({ ...s, [k]: v }))
  const [userId, setUserId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('company_name, phone, city, province, logo_url, deposit_pct').eq('id', user.id).single()
      if (prof) {
        const loaded = {
          companyName: (prof as any).company_name || '',
          phone:       (prof as any).phone        || '',
          website:     '',
          addressLine: '',
          city:        (prof as any).city         || '',
          province:    (prof as any).province     || 'AB',
          postal:      '',
          licence:     '',
          insurance:   '',
          depositPct:  String((prof as any).deposit_pct ?? 10),
          currency:    'CAD',
        }
        setValues(loaded)
        setInitial(loaded)
        if ((prof as any).logo_url) setLogoUrl((prof as any).logo_url)
      }
    })
  }, [])

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
    <div>
      <SectionHeader kicker="BUSINESS" title="Company" subtitle="Your business information shown on estimates and invoices." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  <button onClick={async () => {
                    if (!userId) return
                    await supabase.from('profiles').update({ logo_url: null }).eq('id', userId)
                    setLogoUrl(null)
                    flash('Logo removed')
                  }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
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
        <Card>
          <SectionLabel>Address</SectionLabel>
          <Field label="Street address" value={values.addressLine} onChange={set('addressLine')} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0 12px' }}>
            <Field label="City" value={values.city} onChange={set('city')} required />
            <Field label="Province" value={values.province} onChange={set('province')} required />
            <Field label="Postal Code" value={values.postal} onChange={set('postal')} />
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

const DEFAULT_TERMS = `Payment: A deposit of 50% is due upon signing. The remaining balance is due upon completion of work.
Cancellation: If cancelled after materials are ordered, the deposit is non-refundable.
Warranty: All materials carry manufacturer warranty. Labour is warranted for 1 year.
Validity: This estimate is valid for 30 days from the date of issue.
Changes: Any changes to the scope of work must be agreed upon in writing.
Liability: Contractor is not responsible for pre-existing damage discovered during installation.`

const DEFAULT_CANCELLATION = 'Either party may cancel this contract with 72 hours written notice prior to the scheduled start date.'

const DEFAULT_COMPLETION_TIMEFRAME = '10-16 weeks from the date of signed contract'
const DEFAULT_CUSTOMER_RESPONSIBILITIES = 'Prior to installation: Customer must provide clear access (minimum 3 feet) to all window and door openings, remove blinds, curtains, and furniture near work areas. Customer is responsible for covering personal belongings from dust.'
const DEFAULT_BUYER_RIGHT_TO_CANCEL = 'You may cancel this contract from the day you enter into the contract until 10 days after you receive a copy of the contract. You do not need a reason to cancel.'
const DEFAULT_DAMAGE_DISCLAIMER = 'The Company is not liable for incidental damage to exterior materials such as stucco, siding, or plaster that may occur as a result of installation.'
const DEFAULT_PERMITS_RESPONSIBILITY = 'The Customer is solely responsible for obtaining any required construction permits and ensuring compliance with local building codes.'
const PAYMENT_METHOD_OPTIONS = ['Cash', 'E-transfer', 'Cheque', 'Financing']

function ContractSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [terms,              setTerms]              = useState(DEFAULT_TERMS)
  const [initialTerms,       setInitialTerms]       = useState(DEFAULT_TERMS)
  const [warrantyPeriod,     setWarrantyPeriod]     = useState('1 year')
  const [depositRequired,    setDepositRequired]    = useState(true)
  const [depositPercent,     setDepositPercent]     = useState(10)
  const [paymentTerms,       setPaymentTerms]       = useState('Upon completion')
  const [cancellationPolicy,       setCancellationPolicy]       = useState(DEFAULT_CANCELLATION)
  const [projectManager,           setProjectManager]           = useState('')
  const [completionTimeframe,      setCompletionTimeframe]      = useState(DEFAULT_COMPLETION_TIMEFRAME)
  const [paymentMethods,           setPaymentMethods]           = useState<string[]>(['E-transfer', 'Cheque'])
  const [customerResponsibilities, setCustomerResponsibilities] = useState(DEFAULT_CUSTOMER_RESPONSIBILITIES)
  const [buyerRightToCancel,       setBuyerRightToCancel]       = useState(DEFAULT_BUYER_RIGHT_TO_CANCEL)
  const [damageDisclaimer,         setDamageDisclaimer]         = useState(DEFAULT_DAMAGE_DISCLAIMER)
  const [permitsResponsibility,    setPermitsResponsibility]    = useState(DEFAULT_PERMITS_RESPONSIBILITY)
  const dirty = true
  const [userId, setUserId] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [redrawMode, setRedrawMode] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase.from('profiles').select('contract_terms, signature_url, warranty_period, deposit_required, deposit_percent, payment_terms, cancellation_policy, project_manager, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility').eq('id', data.user.id).single().then(({ data: prof }) => {
        if ((prof as any)?.signature_url)   setSignatureUrl((prof as any).signature_url)
        const loaded = (prof as any)?.contract_terms ?? DEFAULT_TERMS
        setTerms(loaded); setInitialTerms(loaded)
        if ((prof as any)?.warranty_period)     setWarrantyPeriod((prof as any).warranty_period)
        if ((prof as any)?.deposit_required !== undefined && (prof as any)?.deposit_required !== null) setDepositRequired((prof as any).deposit_required)
        if ((prof as any)?.deposit_percent)     setDepositPercent((prof as any).deposit_percent)
        if ((prof as any)?.payment_terms)       setPaymentTerms((prof as any).payment_terms)
        if ((prof as any)?.cancellation_policy) setCancellationPolicy((prof as any).cancellation_policy)
        if ((prof as any)?.project_manager != null)    setProjectManager((prof as any).project_manager)
        if ((prof as any)?.completion_timeframe)       setCompletionTimeframe((prof as any).completion_timeframe)
        if ((prof as any)?.payment_methods?.length)    setPaymentMethods((prof as any).payment_methods)
        if ((prof as any)?.customer_responsibilities)  setCustomerResponsibilities((prof as any).customer_responsibilities)
        if ((prof as any)?.buyer_right_to_cancel)      setBuyerRightToCancel((prof as any).buyer_right_to_cancel)
        if ((prof as any)?.damage_disclaimer)          setDamageDisclaimer((prof as any).damage_disclaimer)
        if ((prof as any)?.permits_responsibility)     setPermitsResponsibility((prof as any).permits_responsibility)
      })
    })
  }, [])

  async function saveContract() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      contract_terms:            terms,
      warranty_period:           warrantyPeriod,
      deposit_required:          depositRequired,
      deposit_percent:           depositPercent,
      payment_terms:             paymentTerms,
      cancellation_policy:       cancellationPolicy,
      project_manager:           projectManager,
      completion_timeframe:      completionTimeframe,
      payment_methods:           paymentMethods,
      customer_responsibilities: customerResponsibilities,
      buyer_right_to_cancel:     buyerRightToCancel,
      damage_disclaimer:         damageDisclaimer,
      permits_responsibility:    permitsResponsibility,
    }).eq('id', userId)
    if (error) { flash('Save failed: ' + error.message); return }
    setInitialTerms(terms)
    flash('Saved')
  }

  useEffect(() => {
    if (!redrawMode && signatureUrl) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }, [redrawMode, signatureUrl])

  function getSigPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getSigPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasStrokes(true)
  }

  function onDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getSigPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#0A1628'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function stopDraw() { setIsDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  async function saveSignatureCanvas() {
    const canvas = canvasRef.current
    if (!canvas || !userId) return
    const dataUrl = canvas.toDataURL('image/png')
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const path = `${userId}/signature.png`
    const { error } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true, contentType: 'image/png' })
    if (error) { flash('Save failed'); return }
    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ signature_url: url }).eq('id', userId)
    setSignatureUrl(url)
    setRedrawMode(false)
    flash('Signature saved')
  }

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Contract" subtitle="Shown on every estimate before the client signs." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Terms &amp; Conditions</SectionLabel>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>
            Displayed inline on the signing page. Default text is used if left empty.
          </p>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={9}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'ui-monospace, monospace', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
          {terms !== DEFAULT_TERMS && (
            <button onClick={() => setTerms(DEFAULT_TERMS)}
              style={{ marginTop: 8, padding: '5px 10px', background: 'transparent', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 11, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }}>
              Reset to default
            </button>
          )}
        </Card>
        <Card>
          <SectionLabel>Contract Defaults</SectionLabel>

          {/* Warranty period */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Warranty Period</div>
            <select value={warrantyPeriod} onChange={e => setWarrantyPeriod(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              {['1 year', '2 years', '5 years', '10 years'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Deposit */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: depositRequired ? 10 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Deposit</div>
              <Toggle on={depositRequired} onChange={setDepositRequired} />
            </div>
            {depositRequired && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Deposit Amount</div>
                <div style={{ position: 'relative', maxWidth: 160 }}>
                  <input type="number" min={0} max={100} value={depositPercent} onChange={e => setDepositPercent(Number(e.target.value))}
                    placeholder="10"
                    style={{ width: '100%', padding: '10px 32px 10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8', pointerEvents: 'none' }}>%</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment terms */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Payment Terms</div>
            <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              {['Upon completion', '50% deposit / 50% on completion', 'Custom'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Cancellation policy */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Cancellation Policy</div>
            <textarea value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} rows={3}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </Card>

        <Card>
          <SectionLabel>Additional Contract Details</SectionLabel>

          {/* Project Manager */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Project Manager</div>
            <input type="text" value={projectManager} onChange={e => setProjectManager(e.target.value)} placeholder="e.g. John Smith"
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Completion Timeframe */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Completion Timeframe</div>
            <input type="text" value={completionTimeframe} onChange={e => setCompletionTimeframe(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Payment Methods */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Accepted Payment Methods</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHOD_OPTIONS.map(method => {
                const checked = paymentMethods.includes(method)
                return (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${checked ? '#2563EB' : '#E2E5EA'}`, background: checked ? 'rgba(37,99,235,0.07)' : '#fff', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={checked} onChange={() => setPaymentMethods(prev => checked ? prev.filter(m => m !== method) : [...prev, method])} style={{ display: 'none' }} />
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${checked ? '#2563EB' : '#CBD5E1'}`, background: checked ? '#2563EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: checked ? '#2563EB' : '#475569' }}>{method}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Customer Responsibilities */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Customer Responsibilities</div>
            <textarea value={customerResponsibilities} onChange={e => setCustomerResponsibilities(e.target.value)} rows={4}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Buyer's Right to Cancel */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Buyer's Right to Cancel</div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>Required by consumer protection law in most Canadian provinces.</p>
            <textarea value={buyerRightToCancel} onChange={e => setBuyerRightToCancel(e.target.value)} rows={4}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Damage Disclaimer */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Damage Disclaimer</div>
            <textarea value={damageDisclaimer} onChange={e => setDamageDisclaimer(e.target.value)} rows={3}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Permits Responsibility */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Permits Responsibility</div>
            <textarea value={permitsResponsibility} onChange={e => setPermitsResponsibility(e.target.value)} rows={3}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </Card>

        <Card>
          <SectionLabel>Contractor Signature</SectionLabel>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
            Appears on all estimate PDFs sent to clients.
          </p>

          {signatureUrl && !redrawMode ? (
            <>
              <div style={{
                background: '#F8FAFC', border: '1px solid #E5E7EB',
                borderRadius: 12, padding: 16, minHeight: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <img src={signatureUrl} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <button
                onClick={() => setRedrawMode(true)}
                style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Redraw
              </button>
            </>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={800}
                height={160}
                onMouseDown={startDraw}
                onMouseMove={onDraw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={onDraw}
                onTouchEnd={stopDraw}
                style={{
                  width: '100%', height: 160, display: 'block',
                  border: '1.5px solid #E5E7EB', borderRadius: 12,
                  background: '#fff', cursor: 'crosshair', touchAction: 'none',
                  marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={clearCanvas}
                  style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Clear
                </button>
                <button
                  onClick={saveSignatureCanvas}
                  disabled={!hasStrokes}
                  style={{ flex: 2, padding: '10px', background: hasStrokes ? '#2563EB' : '#93aef5', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: hasStrokes ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  Save Signature
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={true} onSave={saveContract} onDiscard={() => setTerms(initialTerms)} />
    </div>
  )
}

function PriceListSection() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/price-list') }, [])
  return null
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

const PLACEHOLDER_INVOICES = [
  { id: 'INV-2026-005', date: 'May 1, 2026',  amount: 'CA$149.00', status: 'Paid' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026',  amount: 'CA$149.00', status: 'Paid' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026',  amount: 'CA$149.00', status: 'Failed' },
  { id: 'INV-2026-002', date: 'Feb 1, 2026',  amount: 'CA$24.00',  status: 'Paid' },
  { id: 'INV-2026-001', date: 'Jan 1, 2026',  amount: 'CA$24.00',  status: 'Paid' },
]

function statusBadge(status: string) {
  const map: Record<string, { color: string; bg: string }> = {
    Paid:    { color: '#16A34A', bg: '#DCFCE7' },
    Failed:  { color: '#C0341A', bg: '#FEE2E2' },
    Pending: { color: '#D97706', bg: '#FEF3C7' },
  }
  const s = map[status] ?? map['Pending']
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {status}
    </span>
  )
}

function InvoicesSection() {
  const [rows] = useState(PLACEHOLDER_INVOICES)

  const cols: React.CSSProperties[] = [
    { width: '28%' },
    { width: '26%' },
    { width: '24%' },
    { width: '22%' },
  ]

  return (
    <div>
      <SectionHeader kicker="BILLING" title="Invoices" subtitle="Your subscription billing history." />
      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              {cols.map((c, i) => <col key={i} style={c} />)}
            </colgroup>
            <thead>
              <tr>
                {['INVOICE', 'DATE', 'AMOUNT', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#94A3B8', borderBottom: '1px solid #EEF0F4', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No invoices yet.</td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} onClick={() => alert('Invoice PDF coming soon')} style={{ cursor: 'pointer', borderBottom: i < rows.length - 1 ? '1px solid #EEF0F4' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.amount}</td>
                  <td style={{ padding: '12px 14px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  price:         () => <PriceListSection />,
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
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const { data: prof } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
      if (prof?.company_name) setCompanyName(prof.company_name)
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
            <div style={{
              background: '#fff',
              borderBottom: '1px solid #EEF0F4',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
              zIndex: 10,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>WORKSPACE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>Settings</div>
              </div>
              <BellButton />
            </div>
            <div style={{ padding: '16px 16px 0' }}>
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
            <div style={{ padding: '0 16px 24px', marginTop: 24 }}>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  router.push('/auth')
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  color: '#DC2626', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          // Detail view
          <div>
            <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 20 }}>
              <button onClick={() => setMobileDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                <SIcon name="back" size={16} /> Settings
              </button>
            </div>
            <div style={{ padding: '20px 16px 100px' }}>
              <ActiveSection flash={flash} />
            </div>
          </div>
        )}
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top header */}
        <div style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8' }}>WORKSPACE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.5px' }}>Settings</div>
              <div style={{ color: '#CBD5E1' }}>·</div>
              <div style={{ fontSize: 14, color: '#475569' }}>{companyName || 'Your contractor'}</div>
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
            <div style={{ padding: '24px 16px 8px' }}>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  router.push('/auth')
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  color: '#DC2626', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sign out
              </button>
            </div>
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
