'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SIcon } from '@/components/SIcon'
import { SHOW_GBB } from '@/lib/flags'
import type { IconName } from '@/components/SIcon'
import { Camera, ImagePlus } from 'lucide-react'
import AddressAutocomplete from '@/components/AddressAutocomplete'

import { usePermissions } from '@/lib/usePermissions'
import ConfirmModal from '@/components/ConfirmModal'
// ── TYPES ────────────────────────────────────────
type SectionId = 'profile' | 'password' | 'notifications' | 'company' | 'quote' | 'team' | 'contract' | 'price' | 'billing' | 'invoices'

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
      { id: 'company',  icon: 'company',  label: 'Company',      desc: 'Logo, address, defaults' },
      ...(SHOW_GBB ? [{ id: 'quote' as const, icon: 'quote' as const, label: 'Quote Settings', desc: 'Pricing mode & defaults' }] : []),
      { id: 'team',     icon: 'team',     label: 'Team',         desc: 'Manage team members' },
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

function Field({ label, value, onChange, type = 'text', placeholder, hint, error, required, prefix, suffix, readOnly }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string; error?: string
  required?: boolean; prefix?: string; suffix?: string; readOnly?: boolean
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
          onChange={e => !readOnly && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 13px',
            paddingLeft: prefix ? 28 : 13,
            paddingRight: suffix ? 28 : 13,
            border: `1px solid ${error ? '#DC2626' : focused ? '#2563EB' : '#E2E5EA'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
            color: readOnly ? '#94A3B8' : '#0A1628', background: readOnly ? '#F8F9FC' : '#fff', outline: 'none',
            boxShadow: focused ? (error ? '0 0 0 3px rgba(220,38,38,0.12)' : '0 0 0 3px rgba(37,99,235,0.12)') : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            cursor: readOnly ? 'default' : undefined,
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
  const [userId, setUserId] = useState<string | null>(null)
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const fieldsDirty = JSON.stringify(values) !== JSON.stringify(initial)
  const dirty = fieldsDirty || !!pendingAvatarFile
  const valid = !!values.firstName && !!values.lastName && !!values.email

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      if (user.user_metadata?.avatar_url) setSavedAvatarUrl(user.user_metadata.avatar_url)
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name, phone').eq('id', sanitizedId).single()
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

  // Revoke object URL when it's no longer needed
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { flash('Image must be under 5 MB'); return }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setPendingAvatarFile(file)
    // Reset input so same file can be reselected
    e.target.value = ''
  }

  async function saveProfile() {
    if (!userId || saving) return
    if (values.phone && values.phone.replace(/\D/g, '').length < 10) {
      flash('Please enter a valid phone number')
      return
    }
    setSaving(true)

    if (pendingAvatarFile) {
      const ext = pendingAvatarFile.type === 'image/png' ? 'png' : pendingAvatarFile.type === 'image/webp' ? 'webp' : pendingAvatarFile.type === 'image/gif' ? 'gif' : 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, pendingAvatarFile, { upsert: true, contentType: pendingAvatarFile.type })
      if (upErr) { flash('Avatar upload failed'); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await supabase.auth.updateUser({ data: { avatar_url: url } })
      setSavedAvatarUrl(url)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPendingAvatarFile(null)
    }

    const { error: profErr } = await supabase.from('profiles').update({
      first_name: values.firstName,
      last_name:  values.lastName,
      phone:      values.phone,
    }).eq('id', userId)

    if (profErr) { flash('Failed to save profile'); setSaving(false); return }

    setInitial({ ...values })
    setSaving(false)
    flash('Profile saved')
  }

  function handleDiscard() {
    setValues({ ...initial })
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPendingAvatarFile(null)
  }

  const displayUrl = previewUrl ?? savedAvatarUrl
  const initials = `${values.firstName?.[0] || ''}${values.lastName?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Profile" subtitle="Your personal information and avatar." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', background: '#2563EB',
                  overflow: 'hidden', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  outline: pendingAvatarFile ? '2px solid #2563EB' : 'none',
                  outlineOffset: 2,
                }}
              >
                {displayUrl
                  ? <img src={displayUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{initials}</span>
                }
              </div>
              <div
                onClick={() => avatarInputRef.current?.click()}
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
          <Field label="Email" value={values.email} onChange={() => {}} type="email" required readOnly hint="Contact support to change your email" />
          <Field label="Phone" value={values.phone} onChange={v => { const filtered = v.replace(/[^0-9()\s\-+]/g, '').slice(0, 14); setValues(s => ({ ...s, phone: filtered })) }} placeholder="+1 (555) 000-0000" />
        </Card>
      </div>

      <SaveBar dirty={dirty} valid={valid && !saving} onSave={saveProfile} onDiscard={handleDiscard} />
    </div>
  )
}

function PasswordSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const dirty = !!values.current || !!values.next || !!values.confirm
  const valid = !!values.current && values.next.length >= 8 && values.next === values.confirm

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { flash('Could not get user email'); setSaving(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: values.current })
    if (signInErr) { flash('Current password is incorrect'); setSaving(false); return }
    const { error } = await supabase.auth.updateUser({ password: values.next })
    setSaving(false)
    if (error) { flash('Error: ' + error.message); return }
    setValues({ current: '', next: '', confirm: '' })
    flash('Password updated')
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/auth')
  }

  return (
    <div>
      <SectionHeader kicker="ACCOUNT" title="Password" subtitle="Update your sign-in password." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Change password</SectionLabel>
          <Field label="Current password" value={values.current} onChange={v => setValues(s => ({ ...s, current: v }))} type="password" required />
          <Field label="New password" value={values.next} onChange={v => setValues(s => ({ ...s, next: v }))} type="password" hint="At least 8 characters" required />
          <Field label="Confirm new password" value={values.confirm} onChange={v => setValues(s => ({ ...s, confirm: v }))} type="password"
            error={values.confirm && values.next !== values.confirm ? 'Passwords do not match' : undefined} required />
        </Card>
        <Card>
          <SectionLabel>Sessions</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>Sign out all devices</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Ends all active sessions including this one</div>
            </div>
            <button
              onClick={handleSignOutAll}
              style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Sign out all
            </button>
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid && !saving} onSave={handleSave} onDiscard={() => setValues({ current: '', next: '', confirm: '' })} />
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
  const [values, setValues] = useState({ companyName: '', phone: '', website: '', addressLine: '', city: '', province: 'AB', postal: '', licence: '', insurance: '', currency: 'CAD', interacEmail: '' })
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
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_name, phone, website, address, city, province, postal, licence, insurance, logo_url, interac_email')
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
      }
    })
  }, [])

  async function saveCompany() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      company_name: values.companyName,
      phone:        values.phone        || null,
      website:      values.website      || null,
      address:      values.addressLine  || null,
      city:         values.city         || null,
      province:     values.province     || null,
      postal:       values.postal       || null,
      licence:      values.licence      || null,
      insurance:    values.insurance    || null,
      interac_email: values.interacEmail || null,
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
        <Card>
          <SectionLabel>Business credentials</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Licence #" value={values.licence} onChange={set('licence')} />
            <Field label="Insurance #" value={values.insurance} onChange={set('insurance')} />
          </div>
        </Card>
        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <Field label="Interac e-Transfer Email" value={values.interacEmail} onChange={set('interacEmail')} placeholder="payments@yourcompany.ca" hint="Shown on deposit invoice emails sent to clients" />
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
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid} onSave={saveCompany} onDiscard={() => setValues({ ...initial })} />
    </div>
  )
}

function TeamSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [myId, setMyId] = useState('')
  const [ownerProfile, setOwnerProfile] = useState<{ first_name: string | null; last_name: string | null; email: string | null } | null>(null)
  const [members, setMembers] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null; member_role: string | null; permissions: any }[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('estimator')
  const [invitePerms, setInvitePerms] = useState({
    estimates: true, schedule: true, clients: true,
    price_list: false, reports: false, settings: false,
  })
  const [sending, setSending] = useState(false)
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; role: string; permissions: typeof invitePerms } | null>(null)
  const [editingMemberOriginal, setEditingMemberOriginal] = useState<{ role: string; permissions: typeof invitePerms } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setMyId(sanitizedId)
      const [{ data: ownerProf }, { data: mems }, { data: invs }] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, email').eq('id', sanitizedId).single(),
        supabase.from('profiles').select('id, first_name, last_name, email, member_role, permissions').eq('team_owner_id', sanitizedId),
        supabase.from('team_invitations').select('id').eq('owner_id', sanitizedId).eq('status', 'pending'),
      ])
      setOwnerProfile(ownerProf)
      setMembers(mems || [])
      setPendingCount(invs?.length ?? 0)
    })
  }, [])

  async function updateMemberRole(memberId: string, newRole: string) {
    const prev = members.find(m => m.id === memberId)?.member_role ?? null
    setMembers(ms => ms.map(m => m.id === memberId ? { ...m, member_role: newRole } : m))
    const { error } = await supabase.from('profiles').update({ role: newRole, member_role: newRole }).eq('id', memberId)
    if (error) {
      setMembers(ms => ms.map(m => m.id === memberId ? { ...m, member_role: prev } : m))
      flash('Failed to update role')
    } else {
      flash('Role updated')
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) { flash('Enter an email address'); return }
    setSending(true)
    try {
      const res = await fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim(), role: inviteRole, permissions: invitePerms }),
      })
      const json = await res.json()
      if (!res.ok) { flash('Error: ' + (json.error || 'Failed to send invite')); setSending(false); return }
      setPendingCount(p => p + 1)
      setInviteEmail('')
      setShowInvite(false)
      if (json.emailWarning) {
        flash('Invite saved but email failed: ' + json.emailWarning)
      } else {
        flash('Invite sent to ' + inviteEmail.trim())
      }
    } catch {
      flash('Network error — please try again')
    }
    setSending(false)
  }

  const ROLE_LABELS: Record<string, string> = { owner: 'Owner', estimator: 'Sales', manager: 'Manager', admin: 'Office Admin' }

  const hasChanges = editingMember && editingMemberOriginal && (
    editingMember.role !== editingMemberOriginal.role ||
    JSON.stringify(editingMember.permissions) !== JSON.stringify(editingMemberOriginal.permissions)
  )

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
          {[
            { label: 'Members', value: String(members.length + 1), icon: 'team' as IconName },
            { label: 'Pending invites', value: String(pendingCount), icon: 'mail' as IconName },
            { label: 'Seats used', value: String(members.length + 1), icon: 'user' as IconName },
          ].map(s => (
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
          {/* Owner row — always first */}
          {(() => {
            const ownerName = [ownerProfile?.first_name, ownerProfile?.last_name].filter(Boolean).join(' ') || ownerProfile?.email || '—'
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: members.length > 0 ? '1px solid #EEF0F4' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#0A1628', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ownerName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{ownerName}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '2px 6px', borderRadius: 5 }}>YOU</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{ownerProfile?.email}</div>
                </div>
                <Pill tone="blue">Owner</Pill>
              </div>
            )
          })()}
          {members.map((m, i) => {
            const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || '—'
            return (
              <div key={m.id} onClick={() => {
                const memberPerms = (m as any).permissions || { estimates: true, schedule: true, clients: true, price_list: false, reports: false, payments: false, settings: false }
                setEditingMember({ id: m.id, name, role: m.member_role || 'estimator', permissions: memberPerms })
                setEditingMemberOriginal({ role: m.member_role || 'estimator', permissions: memberPerms })
              }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < members.length - 1 ? '1px solid #EEF0F4' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{m.email}</div>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{ROLE_LABELS[m.member_role || 'estimator'] || m.member_role}</div>
              </div>
            )
          })}
        </Card>
        {editingMember && (
          <div onClick={() => setEditingMember(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>{editingMember.name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Edit role & permissions</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Role</label>
                <select value={editingMember.role} onChange={e => setEditingMember(m => m ? { ...m, role: e.target.value } : m)}
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }}>
                  <option value="estimator">Sales</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Office Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Permissions</label>
                <div style={{ border: '1px solid #E2E5EA', borderRadius: 10, overflow: 'hidden' }}>
                  {[
                    { key: 'estimates',  label: 'Estimates',        desc: 'Create and send quotes to clients' },
                    { key: 'schedule',   label: 'Schedule',         desc: 'View and manage appointments' },
                    { key: 'clients',    label: 'Clients',          desc: 'Add, edit, and view client profiles' },
                    { key: 'price_list', label: 'Price List',       desc: 'View and edit product pricing' },
                    { key: 'reports',    label: 'Reports',          desc: 'Access sales and revenue reports' },
                    { key: 'payments',   label: 'Payments',         desc: 'View and manage invoices and payments' },
                    { key: 'settings',   label: 'Company Settings', desc: 'Manage branding, contracts, and billing' },
                  ].map(({ key, label, desc }, i, arr) => {
                    const val = editingMember.permissions[key as keyof typeof invitePerms]
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #F1F3F5' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{desc}</div>
                        </div>
                        <div onClick={() => setEditingMember(m => m ? { ...m, permissions: { ...m.permissions, [key]: !val } } : m)}
                          style={{ width: 44, height: 24, borderRadius: 999, background: val ? '#2563EB' : '#E2E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 3, left: val ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditingMember(null)} style={{ flex: 1, padding: 13, background: '#F5F6F8', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={async () => {
                  if (!editingMember) return
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  const sanitizedUserId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
                  const sanitizedMemberId = editingMember.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
                  const { error, data } = await supabase
                    .from('profiles')
                    .update({
                      role: editingMember.role,
                      member_role: editingMember.role,
                      permissions: editingMember.permissions
                    })
                    .eq('id', sanitizedMemberId)
                    .eq('team_owner_id', sanitizedUserId)
                    .select()
                  if (error) {
                    flash('Failed to update: ' + error.message)
                    return
                  }
                  setMembers(ms => ms.map(m => m.id === editingMember.id ? { ...m, member_role: editingMember.role, permissions: editingMember.permissions } : m))
                  setEditingMember(null)
                  flash('Member updated')
                }} disabled={!hasChanges} style={{ flex: 2, padding: 13, background: '#2563EB', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: hasChanges ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: hasChanges ? 1 : 0.4 }}>Save changes</button>
              </div>
            </div>
          </div>
        )}
        {showInvite && (
          <Card>
            <SectionLabel>Invite member</SectionLabel>
            <Field label="Email address" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="colleague@company.com" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }}>
                <option value="estimator">Sales</option>
                <option value="manager">Manager</option>
                <option value="admin">Office Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Permissions</label>
              <div style={{ border: '1px solid #E2E5EA', borderRadius: 10, overflow: 'hidden' }}>
                {[
                  { key: 'estimates',  label: 'Estimates',        desc: 'Create and send quotes to clients' },
                  { key: 'schedule',   label: 'Schedule',         desc: 'View and manage appointments' },
                  { key: 'clients',    label: 'Clients',          desc: 'Add, edit, and view client profiles' },
                  { key: 'price_list', label: 'Price List',       desc: 'View and edit product pricing' },
                  { key: 'reports',    label: 'Reports',          desc: 'Access sales and revenue reports' },
                  { key: 'settings',   label: 'Company Settings', desc: 'Manage branding, contracts, and billing' },
                ].map(({ key, label, desc }, i, arr) => {
                  const val = invitePerms[key as keyof typeof invitePerms]
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #F1F3F5' : 'none', background: '#fff' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{desc}</div>
                      </div>
                      <div
                        onClick={() => setInvitePerms(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        style={{ width: 38, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer', background: val ? '#2563EB' : '#CBD5E1', position: 'relative', transition: 'background 0.2s' }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: val ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={sendInvite} disabled={sending} style={{ padding: '9px 20px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending…' : 'Send invite'}
              </button>
              <button onClick={() => setShowInvite(false)} style={{ padding: '9px 16px', background: '#fff', color: '#475569', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

const PAYMENT_METHOD_OPTIONS = ['Cash', 'E-transfer', 'Cheque', 'Financing']

type ContractClause = {
  id: string
  title: string
  content: string
  enabled: boolean
  fixed: boolean
  order: number
}

const DEFAULT_CLAUSES: ContractClause[] = [
  { id: 'workmanship', title: 'Workmanship', enabled: true, fixed: false, order: 0, content: 'All work will be completed in a professional manner according to industry standard practices. Any changes to the scope of work must be agreed upon in writing and may result in additional charges. Oral representations by the Company or its representatives do not form part of this Agreement.' },
  { id: 'payment_terms', title: 'Payment terms', enabled: true, fixed: false, order: 1, content: 'A deposit is required to confirm your order and schedule installation. The remaining balance is due upon completion of work. All materials remain the property of the Company until payment is received in full.' },
  { id: 'cancellation', title: 'Cancellation policy', enabled: true, fixed: false, order: 2, content: 'Either party may cancel this contract with 72 hours written notice prior to the scheduled start date. If the Customer cancels after materials have been ordered, the deposit is non-refundable.' },
  { id: 'customer_responsibilities', title: 'Customer responsibilities', enabled: true, fixed: false, order: 3, content: 'Prior to installation, the Customer must provide clear access (minimum 3 feet) to all window and door openings, remove blinds, curtains, and furniture, and cover personal belongings from dust. All artwork and fragile items must be removed from the work area. The Customer must notify the installer if any old windows or doors are to be kept; otherwise they will be disposed of.' },
  { id: 'damage_disclaimer', title: 'Damage disclaimer', enabled: true, fixed: false, order: 4, content: 'Although care is taken during every installation, the Company is not liable for incidental damage to exterior materials such as stucco, siding, or plaster that may occur as a result of installation.' },
  { id: 'permits', title: 'Permits responsibility', enabled: true, fixed: false, order: 5, content: "The Customer is solely responsible for obtaining any required building permits and ensuring compliance with all applicable by-laws and building codes. The Company will inform the Customer of Fire Code requirements for bedroom windows but is not responsible for the Customer's choice not to comply." },
  { id: 'interior_finishing', title: 'Interior finishing', enabled: true, fixed: false, order: 6, content: 'The Company is not responsible for painting, patching drywall, or repairing any interior surfaces around windows and doors after installation. The Customer is responsible for all interior touch-ups, caulking, and painting of wood jamb and casing.' },
  { id: 'custom_order', title: 'Custom order policy', enabled: true, fixed: false, order: 7, content: 'All products are manufactured to custom sizes and specifications and cannot be returned, restocked, or reused. Once an order has entered production, cancellations or changes are not permitted. The Customer will be invoiced for any portion of the order already manufactured.' },
  { id: 'force_majeure', title: 'Force majeure', enabled: true, fixed: false, order: 8, content: 'The Company is not responsible for delays caused by circumstances beyond its control, including fire, flood, strikes, supplier delays, government actions, acts of God, or other similar events.' },
  { id: 'warranty', title: 'Warranty', enabled: true, fixed: false, order: 9, content: 'The Company warrants its workmanship for the period specified on the estimate. Manufacturer warranties apply to all products as provided. Warranty is void if products are misused, improperly maintained, or payment has not been received in full.' },
  { id: 'storage_fee', title: 'Storage fee', enabled: false, fixed: false, order: 10, content: 'If the Customer postpones or refuses the installation date after materials have been delivered, the Company reserves the right to charge a storage fee of $15 per day after a 2-week grace period.' },
  { id: 'interest_overdue', title: 'Interest on overdue amount', enabled: false, fixed: false, order: 11, content: 'Any amount not paid when due shall bear interest at the rate of 2% per month (24% per annum) from the due date until paid in full. The Customer shall also be liable for reasonable legal fees incurred in collection of overdue amounts.' },
  { id: 'indemnification', title: 'Indemnification', enabled: false, fixed: false, order: 12, content: "The Customer agrees to hold the Company harmless from any damages, injuries, or claims related directly or indirectly to the installation or supply of goods, except where caused by the Company's own negligence." },
  { id: 'condensation', title: 'Condensation & humidity', enabled: false, fixed: false, order: 13, content: 'Condensation on window surfaces is a normal result of indoor humidity and temperature differences and does not constitute a product defect. The Customer is responsible for maintaining proper ventilation and humidity levels in the home.' },
  { id: 'window_accessories', title: 'Window accessories', enabled: false, fixed: false, order: 14, content: 'The Company does not guarantee that new windows will be compatible with existing blinds, shutters, drapes, or other window treatments. The Company is not liable for the functionality of existing accessories reinstalled on new windows.' },
  { id: 'concrete_cut', title: 'Concrete cut / structural modifications', enabled: false, fixed: false, order: 15, content: "Any enlargement of existing window openings requires engineered drawings and a municipal building permit at the Customer's expense. The Company is not liable for costs related to such permits or drawings." },
  { id: 'final_measurements', title: 'Final measurements', enabled: true, fixed: false, order: 17, content: 'Dimensions in this agreement are approximate and subject to change based on production and structural requirements. Final measurements will be confirmed by the installer within 10 days after the deposit is received. During measurements, the installer may need to remove existing casing or aluminum capping.' },
  { id: 'structural_issues', title: 'Structural issues', enabled: true, fixed: false, order: 18, content: 'In the event that previously unknown structural issues (including but not limited to rotten studs, deteriorated framing, or water damage) are discovered during installation, the Company may perform additional work to ensure proper completion. Such additional work will be subject to extra charges, which will be communicated to the Customer prior to proceeding.' },
  { id: 'old_windows_disposal', title: 'Old windows disposal', enabled: true, fixed: false, order: 19, content: 'The Customer must notify the installer prior to commencement of work if any existing windows or doors are to be kept. Unless otherwise specified, all removed windows, doors, and related materials will be disposed of by the Company at no additional charge.' },
  { id: 'ownership_of_goods', title: 'Ownership of goods', enabled: false, fixed: false, order: 20, content: 'All goods supplied under this Agreement remain the property of the Company until payment is received in full. Goods remain the property of the Company even if they become attached to or form part of the premises.' },
  { id: 'window_coverings', title: 'Window coverings & blinds', enabled: false, fixed: false, order: 21, content: "The Customer is responsible for removal and reinstallation of all blinds, curtains, shutters, and other window coverings unless otherwise specified. Existing window coverings may not fit new windows due to changes in frame depth or dimensions, and any required alterations are at the Customer's expense. The Company is not liable for damage to window coverings during removal or reinstallation." },
  { id: 'alarm_system', title: 'Alarm system', enabled: false, fixed: false, order: 22, content: 'The Customer is responsible for notifying the installer of any alarm systems or sensors on or near windows and doors prior to commencement of work. The Company is not responsible for alarm system removal, reinstallation, or any associated costs.' },
  { id: 'buyer_right_to_cancel', title: "Buyer's right to cancel", enabled: true, fixed: true, order: 23, content: 'You may cancel this contract from the day you enter into the contract until 10 days after you receive a copy of the contract. You do not need a reason to cancel. If you cancel, the seller has 15 days to refund your money. To cancel, you must give written notice by registered mail, fax, or personal delivery.' },
]

function ContractSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [warrantyPeriod,     setWarrantyPeriod]     = useState('1 year')
  const [depositRequired,    setDepositRequired]    = useState(true)
  const [depositPercent,     setDepositPercent]     = useState(10)
  const [depositTiming,      setDepositTiming]      = useState<string>('signing')
  const [contractClauses, setContractClauses] = useState<ContractClause[]>(DEFAULT_CLAUSES)
  const [expandedClause, setExpandedClause] = useState<string | null>('buyer_right_to_cancel')
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [clauseToDelete, setClauseToDelete] = useState<string | null>(null)
  const [projectManager,           setProjectManager]           = useState('')
  const [completionTimeframe,      setCompletionTimeframe]      = useState('10-16 weeks from the date of signed contract')
  const [paymentMethods,           setPaymentMethods]           = useState<string[]>(['E-transfer', 'Cheque'])
  const [savedClauses,             setSavedClauses]             = useState('')
  const [savedWarrantyPeriod,      setSavedWarrantyPeriod]      = useState('1 year')
  const [savedDepositRequired,     setSavedDepositRequired]     = useState(true)
  const [savedDepositPercent,      setSavedDepositPercent]      = useState(10)
  const [savedDepositTiming,       setSavedDepositTiming]       = useState<string>('signing')
  const [savedCompletionTimeframe, setSavedCompletionTimeframe] = useState('10-16 weeks from the date of signed contract')
  const [savedPaymentMethods,      setSavedPaymentMethods]      = useState<string[]>(['E-transfer', 'Cheque'])
  const [savedProjectManager,      setSavedProjectManager]      = useState('')
  const isDirty =
    JSON.stringify(contractClauses) !== savedClauses ||
    warrantyPeriod !== savedWarrantyPeriod ||
    depositRequired !== savedDepositRequired ||
    depositPercent !== savedDepositPercent ||
    depositTiming !== savedDepositTiming ||
    completionTimeframe !== savedCompletionTimeframe ||
    JSON.stringify(paymentMethods) !== JSON.stringify(savedPaymentMethods) ||
    projectManager !== savedProjectManager
  const [userId, setUserId] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [redrawMode, setRedrawMode] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const sanitizedId = data.user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      supabase.from('profiles').select('signature_url, warranty_period, deposit_required, deposit_percent, deposit_timing, project_manager, completion_timeframe, payment_methods, contract_clauses').eq('id', sanitizedId).single().then(({ data: prof }) => {
        if ((prof as any)?.signature_url)   setSignatureUrl((prof as any).signature_url)
        const wp  = (prof as any)?.warranty_period     || '1 year'
        const dr  = (prof as any)?.deposit_required !== undefined && (prof as any)?.deposit_required !== null ? (prof as any).deposit_required : true
        const dp  = (prof as any)?.deposit_percent     || 10
        const pm  = (prof as any)?.project_manager     ?? ''
        const ct  = (prof as any)?.completion_timeframe || '10-16 weeks from the date of signed contract'
        const pms = (prof as any)?.payment_methods?.length ? (prof as any).payment_methods : ['E-transfer', 'Cheque']
        const dt  = (prof as any)?.deposit_timing || 'signing'
        setWarrantyPeriod(wp);      setSavedWarrantyPeriod(wp)
        setDepositRequired(dr);     setSavedDepositRequired(dr)
        setDepositPercent(dp);      setSavedDepositPercent(dp)
        setDepositTiming(dt);       setSavedDepositTiming(dt)
        setProjectManager(pm);      setSavedProjectManager(pm)
        setCompletionTimeframe(ct); setSavedCompletionTimeframe(ct)
        setPaymentMethods(pms);     setSavedPaymentMethods(pms)
        const rawClauses = (prof as any)?.contract_clauses
        if (rawClauses) {
          try {
            const parsed = JSON.parse(rawClauses)
            setContractClauses(parsed)
            setSavedClauses(rawClauses)
          } catch {}
        } else {
          const migrated = DEFAULT_CLAUSES.map(c => {
            if (c.id === 'cancellation' && (prof as any)?.cancellation_policy) return { ...c, content: (prof as any).cancellation_policy }
            if (c.id === 'customer_responsibilities' && (prof as any)?.customer_responsibilities) return { ...c, content: (prof as any).customer_responsibilities }
            if (c.id === 'damage_disclaimer' && (prof as any)?.damage_disclaimer) return { ...c, content: (prof as any).damage_disclaimer }
            if (c.id === 'permits' && (prof as any)?.permits_responsibility) return { ...c, content: (prof as any).permits_responsibility }
            return c
          })
          setContractClauses(migrated)
          setSavedClauses(JSON.stringify(migrated))
        }
      })
    })
  }, [])

  async function saveContract() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      warranty_period:      warrantyPeriod,
      deposit_required:     depositRequired,
      deposit_percent:      depositPercent,
      deposit_timing:       depositTiming,
      project_manager:      projectManager,
      completion_timeframe: completionTimeframe,
      payment_methods:      paymentMethods,
      contract_clauses:     JSON.stringify(contractClauses),
    }).eq('id', userId)
    if (error) { flash('Save failed: ' + error.message); return }
    setSavedWarrantyPeriod(warrantyPeriod)
    setSavedDepositRequired(depositRequired)
    setSavedDepositPercent(depositPercent)
    setSavedDepositTiming(depositTiming)
    setSavedProjectManager(projectManager)
    setSavedCompletionTimeframe(completionTimeframe)
    setSavedPaymentMethods([...paymentMethods])
    setSavedClauses(JSON.stringify(contractClauses))
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
      <SectionHeader kicker="BUSINESS" title="Contract" subtitle="Customize the terms and clauses shown on every signed contract." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Deposit due</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { value: 'signing', label: 'Upon signing', sub: 'Client pays deposit when signing the contract' },
                      { value: 'delivery', label: 'Upon delivery', sub: 'Client pays deposit when materials are delivered' }
                    ].map(opt => (
                      <div key={opt.value} onClick={() => setDepositTiming(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `0.5px solid ${depositTiming === opt.value ? '#2045B8' : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', background: depositTiming === opt.value ? '#EEF2FF' : 'white' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${depositTiming === opt.value ? '#2045B8' : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {depositTiming === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2045B8' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{opt.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
        </Card>

        <Card>
          <SectionLabel>Terms &amp; Conditions</SectionLabel>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
            Customize the clauses shown on every contract before the client signs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ...[...contractClauses].filter(c => !c.fixed).sort((a, b) => a.order - b.order),
              ...[...contractClauses].filter(c => c.fixed),
            ].map((clause, idx, arr) => {
              const isExpanded = expandedClause === clause.id
              const isDragOver = dragOverId === clause.id
              return (
                <div
                  key={clause.id}
                  draggable={!clause.fixed}
                  onDragStart={e => e.dataTransfer.setData('clauseId', clause.id)}
                  onDragOver={e => { if (clause.fixed) return; e.preventDefault(); setDragOverId(clause.id) }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverId(null)
                    const fromId = e.dataTransfer.getData('clauseId')
                    if (fromId === clause.id || clause.fixed) return
                    setContractClauses(prev => {
                      const sorted = [...prev].sort((a, b) => a.order - b.order)
                      const fromIdx = sorted.findIndex(c => c.id === fromId)
                      const toIdx = sorted.findIndex(c => c.id === clause.id)
                      const moved = sorted.splice(fromIdx, 1)[0]
                      sorted.splice(toIdx, 0, moved)
                      return sorted.map((c, i) => ({ ...c, order: i }))
                    })
                  }}
                  style={{
                    borderRadius: 10,
                    border: isDragOver ? '1.5px solid #2563EB' : '1px solid #E2E5EA',
                    background: isDragOver ? '#EFF6FF' : '#fff',
                    overflow: 'hidden',
                    transition: 'border 0.1s',
                    opacity: clause.enabled ? 1 : 0.55,
                  }}
                >
                  {/* Clause header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                    {/* Drag handle */}
                    {!clause.fixed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, cursor: 'grab' }}>
                        <circle cx="9" cy="5" r="1" fill="#CBD5E1"/><circle cx="9" cy="12" r="1" fill="#CBD5E1"/><circle cx="9" cy="19" r="1" fill="#CBD5E1"/>
                        <circle cx="15" cy="5" r="1" fill="#CBD5E1"/><circle cx="15" cy="12" r="1" fill="#CBD5E1"/><circle cx="15" cy="19" r="1" fill="#CBD5E1"/>
                      </svg>
                    )}
                    {clause.fixed && <div style={{ width: 14, flexShrink: 0 }} />}

                    {/* Toggle or "Required" badge */}
                    {clause.fixed ? (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563EB', background: '#EFF6FF', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>Required by law</span>
                    ) : (
                      <div
                        onClick={() => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, enabled: !c.enabled } : c))}
                        style={{ width: 34, height: 20, borderRadius: 10, background: clause.enabled ? '#2563EB' : '#9CA3AF', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                      >
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', transform: clause.enabled ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
                      </div>
                    )}

                    {/* Title */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0A1628', minWidth: 0 }}>{clause.title}</span>

                    {/* Delete button (non-fixed only) */}
                    {!clause.fixed && (
                      <button
                        onClick={() => setClauseToDelete(clause.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}

                    {/* Chevron */}
                    <div onClick={() => setExpandedClause(isExpanded ? null : clause.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px' }}>
                      {clause.fixed ? (
                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#64748B', lineHeight: 1.6, border: '1px solid #E2E5EA' }}>
                          {clause.content}
                        </div>
                      ) : (
                        <textarea
                          value={clause.content}
                          rows={4}
                          onChange={e => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, content: e.target.value } : c))}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add clause button */}
          <button
            onClick={() => {
              const newClause: ContractClause = {
                id: 'custom_' + Date.now(),
                title: 'New clause',
                content: '',
                enabled: true,
                fixed: false,
                order: contractClauses.length,
              }
              setContractClauses(prev => [...prev, newClause])
              setExpandedClause(newClause.id)
            }}
            style={{ width: '100%', marginTop: 12, padding: '10px', background: '#fff', border: '1.5px dashed #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add clause
          </button>
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
      <SaveBar dirty={isDirty} valid={true} onSave={saveContract} onDiscard={() => {}} />
      <ConfirmModal
        open={clauseToDelete !== null}
        icon="trash"
        title="Remove clause"
        body="Are you sure you want to remove this clause? This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (clauseToDelete) {
            setContractClauses(prev => prev.filter(c => c.id !== clauseToDelete).map((c, i) => ({ ...c, order: i })))
          }
          setClauseToDelete(null)
        }}
        onCancel={() => setClauseToDelete(null)}
      />
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

function InvoicesSection() {
  return (
    <div>
      <SectionHeader kicker="BILLING" title="Invoices" subtitle="Your subscription billing history." />
      <Card>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
          No invoices yet.
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
  quote:         () => <></>,
  team:          (p) => <TeamSection {...p} />,
  contract:      (p) => <ContractSection {...p} />,
  price:         () => <PriceListSection />,
  billing:       (p) => <BillingSection {...p} />,
  invoices:      (p) => <InvoicesSection />,
}

// ── MAIN PAGE ────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [active, setActive] = useState<SectionId>(() => {
    const s = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('section') : null
    return (s as SectionId) || 'profile'
  })
  const [toast, setToast] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [teamDesc, setTeamDesc] = useState('Manage team members')
  const { role, permissions, loading: permLoading } = usePermissions()
  const isEstimator = role === 'estimator'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const [{ data: prof }, { data: teamMems }, { data: teamInvs }] = await Promise.all([
        supabase.from('profiles').select('company_name').eq('id', sanitizedId).single(),
        supabase.from('profiles').select('id').eq('team_owner_id', sanitizedId),
        supabase.from('team_invitations').select('id').eq('owner_id', sanitizedId).eq('status', 'pending'),
      ])
      if (prof?.company_name) setCompanyName(prof.company_name)
      const memberCount = 1 + (teamMems?.length ?? 0)
      const pendingCount = teamInvs?.length ?? 0
      const memberLabel = `${memberCount} member${memberCount !== 1 ? 's' : ''}`
      setTeamDesc(pendingCount > 0 ? `${memberLabel} · ${pendingCount} invite${pendingCount !== 1 ? 's' : ''}` : memberLabel)
    })
  }, [])

  // Build visible tab groups based on permissions
  const visibleGroups = permLoading ? GROUPS : GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => {
      if (isEstimator) return ['profile', 'password'].includes(item.id)
      if (role === 'admin') return !['billing', 'invoices', 'notifications'].includes(item.id)
      if (item.id === 'team' && role !== 'owner') return false
      if ((item.id === 'company' || item.id === 'quote' || item.id === 'contract') && !permissions.settings) return false
      if (item.id === 'price' && !permissions.price_list) return false
      return true
    }),
  })).filter(g => g.items.length > 0)

  const hiddenIds: SectionId[] = (['company', 'contract', 'price', 'team'] as SectionId[]).filter(id => {
    if (id === 'team' && role !== 'owner') return true
    if ((id === 'company' || id === 'contract') && !permissions.settings) return true
    if (id === 'price' && !permissions.price_list) return true
    return false
  })

  // If current section is restricted, fall back to profile
  useEffect(() => {
    if (!permLoading && hiddenIds.includes(active)) setActive('profile')
  }, [permLoading, active])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }
  const ActiveSection = SECTIONS[active]

  const handleNavClick = (id: SectionId) => {
    if (id === 'quote') { router.push('/dashboard/settings/quote'); return }
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
            <div className="page-hd" style={{
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
            </div>
            <div style={{ padding: '16px 16px 0' }}>
              {visibleGroups.map(g => (
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
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{item.id === 'team' ? teamDesc : item.desc}</div>
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
            <div className="page-hd" style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 20 }}>
              <button onClick={() => setMobileDetail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                <SIcon name="back" size={16} /> Settings
              </button>
            </div>
            <div style={{ padding: '20px 16px 100px' }}>
              {role === 'estimator' && (
                <div style={{ marginBottom: 16, padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 13, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Contact your account owner to change company settings.
                </div>
              )}
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
            {visibleGroups.map(g => (
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
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.id === 'team' ? teamDesc : item.desc}</div>
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
              {role === 'estimator' && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 13, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Contact your account owner to change company settings.
                </div>
              )}
              <ActiveSection flash={flash} />
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
