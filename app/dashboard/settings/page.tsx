'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SIcon } from '@/components/SIcon'
import type { IconName } from '@/components/SIcon'
import { Camera, ImagePlus, Eye, EyeOff, FileText, Upload } from 'lucide-react'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import AppTopBar from '@/components/AppTopBar'
import { SuccessBanner } from '@/components/SuccessBanner'

import { usePermissions } from '@/lib/usePermissions'
import ConfirmModal from '@/components/ConfirmModal'
import { type ContractClause, DEFAULT_CLAUSES } from '@/lib/contractClauses'
// ── TYPES ────────────────────────────────────────
type FlashFn   = (message: string, opts?: { submessage?: string; variant?: 'success' | 'error' | 'neutral' }) => void
type SectionId = 'profile' | 'password' | 'notifications' | 'company' | 'quote' | 'reminders' | 'team' | 'contract' | 'price' | 'billing' | 'invoices'

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
      { id: 'quote' as const,      icon: 'quote' as const, label: 'Quote Settings', desc: 'Estimate validity & defaults' },
      { id: 'reminders' as const, icon: 'bell' as const,  label: 'Follow-ups',     desc: 'Follow-up timing & templates' },
      { id: 'team',               icon: 'team',            label: 'Team',          desc: 'Manage team members' },
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

function Field({ label, value, onChange, type = 'text', placeholder, hint, error, warning, required, prefix, suffix, readOnly, rightElement }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string; error?: string; warning?: string
  required?: boolean; prefix?: string; suffix?: string; readOnly?: boolean
  rightElement?: React.ReactNode
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
            paddingRight: rightElement ? 40 : suffix ? 28 : 13,
            border: `1px solid ${error ? '#DC2626' : focused ? '#2563EB' : '#E2E5EA'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
            color: readOnly ? '#94A3B8' : '#0A1628', background: readOnly ? '#F8F9FC' : '#fff', outline: 'none',
            boxShadow: focused ? (error ? '0 0 0 3px rgba(220,38,38,0.12)' : '0 0 0 3px rgba(37,99,235,0.12)') : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            cursor: readOnly ? 'default' : undefined,
          }}
        />
        {rightElement && <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center' }}>{rightElement}</div>}
        {!rightElement && suffix && <span style={{ position: 'absolute', right: 13, fontSize: 14, color: '#64748B' }}>{suffix}</span>}
      </div>
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{error}</div>}
      {warning && !error && <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>{warning}</div>}
      {hint && !error && !warning && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{hint}</div>}
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

function SaveBar({ dirty, valid, saving, onSave, onDiscard }: { dirty: boolean; valid: boolean; saving?: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: 16, marginTop: 16,
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onDiscard} disabled={!dirty || saving}
          style={{
            flex: 1, height: 52, borderRadius: 12,
            border: '1px solid #e5e7eb', background: '#fff',
            color: dirty && !saving ? '#475467' : '#94A3B8',
            fontSize: 15, fontWeight: 500,
            cursor: dirty && !saving ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}>
          Discard
        </button>
        <button
          onClick={onSave} disabled={!valid || saving}
          style={{
            flex: 1, height: 52, borderRadius: 12, border: 'none',
            background: dirty && valid && !saving ? '#2563EB' : '#93aef5',
            color: '#fff',
            fontSize: 15, fontWeight: 600,
            cursor: dirty && valid && !saving ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}


// ── SECTIONS ─────────────────────────────────────

function ProfileSection({ flash }: { flash: FlashFn }) {
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
    ;(async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user ?? null
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
    })()
  }, [])

  // Revoke object URL when it's no longer needed
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { flash('Image must be under 5 MB', { variant: 'error' }); return }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setPendingAvatarFile(file)
    // Reset input so same file can be reselected
    e.target.value = ''
  }

  async function saveProfile() {
    if (!userId || saving) return
    if (values.phone && values.phone.replace(/\D/g, '').length < 10) {
      flash('Please enter a valid phone number', { variant: 'error' })
      return
    }
    setSaving(true)

    if (pendingAvatarFile) {
      const ext = pendingAvatarFile.type === 'image/png' ? 'png' : pendingAvatarFile.type === 'image/webp' ? 'webp' : pendingAvatarFile.type === 'image/gif' ? 'gif' : 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, pendingAvatarFile, { upsert: true, contentType: pendingAvatarFile.type })
      if (upErr) { flash('Avatar upload failed', { variant: 'error' }); setSaving(false); return }
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

    if (profErr) { flash('Failed to save profile', { variant: 'error' }); setSaving(false); return }

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

function PasswordSection({ flash }: { flash: FlashFn }) {
  const supabase = createClient()
  const router = useRouter()
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const dirty = !!values.current || !!values.next || !!values.confirm
  const valid = !!values.current && values.next.length >= 8 && values.next === values.confirm

  const eyeBtn = (field: keyof typeof show) => (
    <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
      {show[field] ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
    </button>
  )

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { flash('Could not get user email', { variant: 'error' }); setSaving(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: values.current })
    if (signInErr) {
      flash('Current password is incorrect. If you signed up with Google, use Forgot password to set one.', { variant: 'error' })
      setSaving(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: values.next })
    setSaving(false)
    if (error) { flash('Error: ' + error.message, { variant: 'error' }); return }
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
          <Field label="Current password" value={values.current} onChange={v => setValues(s => ({ ...s, current: v }))} type={show.current ? 'text' : 'password'} required rightElement={eyeBtn('current')} />
          <Field label="New password" value={values.next} onChange={v => setValues(s => ({ ...s, next: v }))} type={show.next ? 'text' : 'password'} required rightElement={eyeBtn('next')}
            error={values.next.length > 0 && values.next.length < 8 ? 'Password must be at least 8 characters' : undefined}
            hint={values.next.length === 0 ? 'At least 8 characters' : undefined} />
          <Field label="Confirm new password" value={values.confirm} onChange={v => setValues(s => ({ ...s, confirm: v }))} type={show.confirm ? 'text' : 'password'} required rightElement={eyeBtn('confirm')}
            error={values.confirm && values.next !== values.confirm ? 'Passwords do not match' : undefined} />
        </Card>
        <Card>
          <SectionLabel>Sessions</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>Sign out all devices</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Ends all active sessions including this one</div>
            </div>
            <button
              onClick={() => setShowSignOutConfirm(true)}
              style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Sign out all
            </button>
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid && !saving} onSave={handleSave} onDiscard={() => setValues({ current: '', next: '', confirm: '' })} />
      <ConfirmModal
        open={showSignOutConfirm}
        icon="alert"
        title="Sign out all devices"
        body="This will sign you out of all devices, including this one. Continue?"
        confirmLabel="Sign out all"
        onConfirm={handleSignOutAll}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  )
}

function NotificationsSection({ flash }: { flash: FlashFn }) {
  const supabase = createClient()

  const DEFAULT_EMAIL = { estimateViewed: true, estimateSigned: true, depositPaid: true, invoiceOverdue: true, teamInvite: false, estimateDeclined: true, estimateExpired: true }
  const DEFAULT_DIGEST: 'off' | 'weekly' | 'daily' = 'weekly'
  const DEFAULT_INAPP = { pushNew: true, pushPayment: true, pushTeam: false, pushDeclined: true, pushExpired: true }

  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [digest, setDigest] = useState<'off' | 'weekly' | 'daily'>(DEFAULT_DIGEST)
  const [inapp, setInapp] = useState(DEFAULT_INAPP)
  const [saved, setSaved] = useState<{
    email: { estimateViewed: boolean; estimateSigned: boolean; depositPaid: boolean; invoiceOverdue: boolean; teamInvite: boolean; estimateDeclined: boolean; estimateExpired: boolean }
    digest: 'off' | 'weekly' | 'daily'
    inapp: { pushNew: boolean; pushPayment: boolean; pushTeam: boolean; pushDeclined: boolean; pushExpired: boolean }
  }>({ email: DEFAULT_EMAIL, digest: DEFAULT_DIGEST, inapp: DEFAULT_INAPP })
  const dirty = JSON.stringify({ email, digest, inapp }) !== JSON.stringify(saved)

  useEffect(() => {
    ;(async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user ?? null
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data: prof } = await supabase.from('profiles').select('notification_settings').eq('id', sanitizedId).single()
      const ns = (prof as any)?.notification_settings
      if (ns) {
        const e = { ...DEFAULT_EMAIL, ...(ns.email || {}) }
        const d: 'off' | 'weekly' | 'daily' = ns.digest || DEFAULT_DIGEST
        const i = { ...DEFAULT_INAPP, ...(ns.inapp || {}) }
        setEmail(e); setDigest(d); setInapp(i)
        setSaved({ email: e, digest: d, inapp: i })
      }
    })()
  }, [])

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    const { error } = await supabase.from('profiles').update({
      notification_settings: { email, digest, inapp }
    }).eq('id', sanitizedId)
    if (error) { flash('Failed to save notifications', { variant: 'error' }); return }
    setSaved({ email, digest, inapp })
    flash('Notifications saved')
  }

  const emailLabels: Record<string, { label: string; desc: string }> = {
    estimateViewed:   { label: 'Estimate viewed',   desc: 'Client opened your estimate' },
    estimateSigned:   { label: 'Estimate signed',   desc: 'Client signed your estimate' },
    estimateDeclined: { label: 'Estimate declined', desc: 'Client declined your estimate' },
    estimateExpired:  { label: 'Estimate expired',  desc: 'Estimate passed 30 days without response' },
    depositPaid:      { label: 'Deposit paid',      desc: 'Client paid the deposit' },
    invoiceOverdue:   { label: 'Invoice overdue',   desc: 'Invoice payment is overdue' },
    teamInvite:       { label: 'Team invite',       desc: 'Someone invited you to a team' },
  }
  const inappLabels: Record<string, { label: string; desc: string }> = {
    pushNew:      { label: 'New estimates',     desc: 'Notify on new estimate activity' },
    pushPayment:  { label: 'Payments',          desc: 'Deposits and invoice payments' },
    pushDeclined: { label: 'Estimate declined', desc: 'Client declined your estimate' },
    pushExpired:  { label: 'Estimate expired',  desc: 'Estimate passed 30 days without response' },
    pushTeam:     { label: 'Team activity',     desc: 'Team member actions' },
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
          <SectionLabel>In-app Notifications</SectionLabel>
          {Object.entries(inappLabels).map(([key, { label, desc }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
              <div>
                <div style={{ fontSize: 14, color: '#0A1628' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{desc}</div>
              </div>
              <Toggle on={inapp[key as keyof typeof inapp]} onChange={v => setInapp(s => ({ ...s, [key]: v }))} />
            </div>
          ))}
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={true} onSave={handleSave} onDiscard={() => { setEmail(saved.email); setDigest(saved.digest); setInapp(saved.inapp) }} />
    </div>
  )
}

const COMPANY_PROVINCES = [
  { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' }, { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland & Labrador' }, { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' }, { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

const cSelectBase: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
  borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
  color: '#0A1628', background: '#fff', outline: 'none',
}

function ProvinceSelect({ label, value, onChange, required, error }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={cSelectBase}>
        <option value="">Select province</option>
        {COMPANY_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
      </select>
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

function CompanyTextArea({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: '11px 13px', border: `1px solid ${focused ? '#2563EB' : '#E2E5EA'}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff', outline: 'none', boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s', resize: 'vertical', boxSizing: 'border-box' }}
      />
      {hint && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const COMPANY_INIT = {
  companyName: '', phone: '', website: '', addressLine: '', city: '',
  province: '', postal: '', licence: '', insurance: '', interacEmail: '',
  gstHstNumber: '', companyContactEmail: '', financingInfo: '', googleReviewLink: '',
  licenceIssuingProvince: '', licenceExpiry: '',
  insuranceProvider: '', insuranceExpiry: '',
  wsibNumber: '', signingRepName: '', signingRepTitle: '', warrantySummary: '',
}

function CompanySection({ flash }: { flash: FlashFn }) {
  const supabase = createClient()
  const [values, setValues] = useState(COMPANY_INIT)
  const [initial, setInitial] = useState(COMPANY_INIT)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = dirty && !!values.companyName && !!values.city && !!values.province
  const set = (k: keyof typeof COMPANY_INIT) => (v: string) => setValues(s => ({ ...s, [k]: v }))
  const [userId, setUserId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoKey, setLogoKey] = useState(() => Date.now())
  const [logoUploading, setLogoUploading] = useState(false)
  const [warrantyPdfUrl, setWarrantyPdfUrl] = useState<string | null>(null)
  const [warrantyPdfUploading, setWarrantyPdfUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user ?? null
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_name, phone, website, address, city, province, postal, licence, insurance, insurance_policy_number, logo_url, interac_email, gst_hst_number, company_contact_email, financing_info, google_review_link, licence_issuing_province, licence_expiry_date, insurance_provider, insurance_expiry_date, wsib_number, signing_rep_name, signing_rep_title, warranty_summary, warranty_pdf_url')
        .eq('id', sanitizedId)
        .single()
      if (prof) {
        const loaded: typeof COMPANY_INIT = {
          companyName:           (prof as any).company_name              || '',
          phone:                 (prof as any).phone                     || '',
          website:               (prof as any).website                   || '',
          addressLine:           (prof as any).address                   || '',
          city:                  (prof as any).city                      || '',
          province:              (prof as any).province                  || '',
          postal:                (prof as any).postal                    || '',
          licence:               (prof as any).licence                   || '',
          insurance:             ((prof as any).insurance_policy_number ?? (prof as any).insurance) || '',
          interacEmail:          (prof as any).interac_email             || '',
          gstHstNumber:          (prof as any).gst_hst_number            || '',
          companyContactEmail:   (prof as any).company_contact_email     || '',
          financingInfo:         (prof as any).financing_info            || '',
          googleReviewLink:      (prof as any).google_review_link        || '',
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
        if ((prof as any).warranty_pdf_url) setWarrantyPdfUrl((prof as any).warranty_pdf_url)
      }
    })()
  }, [])

  async function saveCompany() {
    if (!userId) return
    setIsSaving(true)
    const website = values.website && !/^https?:\/\//i.test(values.website)
      ? 'https://' + values.website
      : values.website
    const normalized = { ...values, website }
    const { error } = await supabase.from('profiles').update({
      company_name:             normalized.companyName,
      phone:                    normalized.phone                  || null,
      website:                  normalized.website                || null,
      address:                  normalized.addressLine            || null,
      city:                     normalized.city                   || null,
      province:                 normalized.province               || null,
      postal:                   normalized.postal                 || null,
      licence:                  normalized.licence                || null,
      insurance:                normalized.insurance              || null,
      interac_email:            normalized.interacEmail           || null,
      gst_hst_number:           normalized.gstHstNumber           || null,
      company_contact_email:    normalized.companyContactEmail    || null,
      financing_info:           normalized.financingInfo           || null,
      google_review_link:       normalized.googleReviewLink        || null,
      licence_issuing_province: normalized.licenceIssuingProvince || null,
      licence_expiry_date:      normalized.licenceExpiry          || null,
      insurance_provider:       normalized.insuranceProvider      || null,
      insurance_expiry_date:    normalized.insuranceExpiry        || null,
      wsib_number:              normalized.wsibNumber             || null,
      signing_rep_name:         normalized.signingRepName         || null,
      signing_rep_title:        normalized.signingRepTitle        || null,
      warranty_summary:         normalized.warrantySummary        || null,
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message, { variant: 'error' }); setIsSaving(false); return }
    if (website !== values.website) setValues(normalized)
    setInitial(normalized)
    setIsSaving(false)
    flash('Changes saved', { submessage: 'Company profile updated' })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) { flash('Only PNG, JPG, SVG or WebP allowed', { variant: 'error' }); return }
    if (file.size > 5 * 1024 * 1024) { flash('File must be under 5 MB', { variant: 'error' }); return }
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { flash('Upload failed', { variant: 'error' }); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const url = urlData.publicUrl
    const { error: urlErr } = await supabase.from('profiles').update({ logo_url: url }).eq('id', userId)
    if (urlErr) { flash('Error saving logo: ' + urlErr.message, { variant: 'error' }); setLogoUploading(false); return }
    setLogoUrl(url); setLogoKey(Date.now()); setLogoUploading(false); flash('Logo uploaded')
  }

  async function handleWarrantyPdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.type !== 'application/pdf') { flash('Only PDF files allowed', { variant: 'error' }); return }
    if (file.size > 20 * 1024 * 1024) { flash('File must be under 20 MB', { variant: 'error' }); return }
    setWarrantyPdfUploading(true)
    const path = `${userId}/warranty.pdf`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (error) { flash('Upload failed', { variant: 'error' }); setWarrantyPdfUploading(false); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const url = urlData.publicUrl
    const { error: urlErr } = await supabase.from('profiles').update({ warranty_pdf_url: url }).eq('id', userId)
    if (urlErr) { flash('Error saving: ' + urlErr.message, { variant: 'error' }); setWarrantyPdfUploading(false); return }
    setWarrantyPdfUrl(url); setWarrantyPdfUploading(false); flash('Warranty PDF uploaded')
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const postalRe = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/
  const contactEmailWarn = values.companyContactEmail && !emailRe.test(values.companyContactEmail) ? 'Looks like an invalid email' : undefined
  const interacEmailWarn = values.interacEmail && !emailRe.test(values.interacEmail) ? 'Looks like an invalid email' : undefined
  const postalWarn = values.postal && !postalRe.test(values.postal.trim()) ? 'Format: A1A 1A1' : undefined
  const googleLinkWarn = values.googleReviewLink && !/^https?:\/\//i.test(values.googleReviewLink) ? 'Should be a full URL (https://...)' : undefined

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Company" subtitle="Your business information shown on estimates and invoices." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <SectionLabel>Business details</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Company Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0, border: logoUrl ? '1px solid #E5E7EB' : '2px dashed #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: logoUploading ? 'not-allowed' : 'pointer', opacity: logoUploading ? 0.7 : 1 }}>
                {logoUrl
                  ? <img src={`${logoUrl}?v=${logoKey}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        <Card>
          <SectionLabel>Address</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Street address</label>
            <AddressAutocomplete
              value={values.addressLine} placeholder="123 Maple St"
              onChange={v => setValues(p => ({ ...p, addressLine: v }))}
              onSelect={({ street, city, province, postalCode }) => setValues(p => ({
                ...p, addressLine: street,
                ...(city ? { city } : {}), ...(province ? { province } : {}), ...(postalCode ? { postal: postalCode } : {}),
              }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0 12px' }}>
            <Field label="City" value={values.city} onChange={set('city')} required />
            <ProvinceSelect label="Province" value={values.province} onChange={set('province')} required error={!values.province ? 'Province is required' : undefined} />
            <Field label="Postal Code" value={values.postal} onChange={set('postal')} warning={postalWarn} />
          </div>
        </Card>
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
        <Card>
          <SectionLabel>Tax &amp; Compliance</SectionLabel>
          <Field label="GST / HST Number" value={values.gstHstNumber} onChange={set('gstHstNumber')} hint="Shown on invoices" />
          <Field label="Company Contact Email" value={values.companyContactEmail} onChange={set('companyContactEmail')} type="email" placeholder="contact@yourcompany.ca" hint="Used as reply-to on emails sent to clients, and shown on PDFs" warning={contactEmailWarn} />
          <CompanyTextArea label="Financing Info" value={values.financingInfo} onChange={set('financingInfo')} placeholder="e.g. Financing available — as low as $150/month, OAC" hint="Shown to clients on estimates as a financing option (e.g. 'Financing available — as low as $150/month, OAC')" />
          <Field label="Google Review Link" value={values.googleReviewLink} onChange={set('googleReviewLink')} placeholder="https://g.page/r/..." hint="Link to your Google Business Profile review page — used for review request automation" warning={googleLinkWarn} />
        </Card>
        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <Field label="Interac e-Transfer Email" value={values.interacEmail} onChange={set('interacEmail')} placeholder="payments@yourcompany.ca" hint="Shown on deposit invoice emails sent to clients" warning={interacEmailWarn} />
        </Card>
        <Card>
          <SectionLabel>Documents &amp; Signature</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Signing Representative Name" value={values.signingRepName} onChange={set('signingRepName')} placeholder="James Morrison" />
            <Field label="Title" value={values.signingRepTitle} onChange={set('signingRepTitle')} placeholder="Owner / GM" />
          </div>
          <CompanyTextArea label="Warranty Summary" value={values.warrantySummary} onChange={set('warrantySummary')} placeholder="Describe your warranty terms..." hint="Appears in the Warranty section of contracts" />
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>
              Warranty PDF <span style={{ fontSize: 10, fontWeight: 400, color: '#94A3B8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            {warrantyPdfUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
                  <FileText size={15} color="#2563EB" />
                  <span style={{ fontSize: 12, color: '#0A1628', flex: 1 }}>Warranty PDF attached</span>
                  <a href={warrantyPdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563EB', textDecoration: 'none', flexShrink: 0 }}>Preview</a>
                </div>
                <label style={{ cursor: warrantyPdfUploading ? 'not-allowed' : 'pointer', opacity: warrantyPdfUploading ? 0.6 : 1, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: '#2563EB', cursor: 'inherit' }}>{warrantyPdfUploading ? 'Uploading…' : 'Replace'}</span>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleWarrantyPdfUpload} disabled={warrantyPdfUploading} />
                </label>
                <button
                  onClick={async () => { if (!userId) return; await supabase.from('profiles').update({ warranty_pdf_url: null }).eq('id', userId); setWarrantyPdfUrl(null); flash('Warranty PDF removed') }}
                  style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}>
                  Remove
                </button>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', cursor: warrantyPdfUploading ? 'not-allowed' : 'pointer', opacity: warrantyPdfUploading ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: '1px dashed #CBD5E1', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                  <Upload size={13} color="#475569" />
                  {warrantyPdfUploading ? 'Uploading…' : 'Upload Warranty PDF'}
                </div>
                <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleWarrantyPdfUpload} disabled={warrantyPdfUploading} />
              </label>
            )}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Automatically appended to every generated estimate PDF · Max 20 MB</div>
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} valid={valid} saving={isSaving} onSave={saveCompany} onDiscard={() => setValues({ ...initial })} />
    </div>
  )
}

function TeamSection({ flash }: { flash: FlashFn }) {
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
    ;(async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user ?? null
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
    })()
  }, [])

  async function updateMemberRole(memberId: string, newRole: string) {
    const prev = members.find(m => m.id === memberId)?.member_role ?? null
    setMembers(ms => ms.map(m => m.id === memberId ? { ...m, member_role: newRole } : m))
    const { error } = await supabase.from('profiles').update({ role: newRole, member_role: newRole }).eq('id', memberId)
    if (error) {
      setMembers(ms => ms.map(m => m.id === memberId ? { ...m, member_role: prev } : m))
      flash('Failed to update role', { variant: 'error' })
    } else {
      flash('Role updated')
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) { flash('Enter an email address', { variant: 'error' }); return }
    setSending(true)
    try {
      const res = await fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim(), role: inviteRole, permissions: invitePerms }),
      })
      const json = await res.json()
      if (!res.ok && !json.emailFailed) { flash('Error: ' + (json.error || 'Failed to send invite'), { variant: 'error' }); setSending(false); return }
      setPendingCount(p => p + 1)
      setInviteEmail('')
      setShowInvite(false)
      if (json.emailFailed) {
        flash('Invite saved — email failed to send: ' + json.error)
      } else {
        flash('Invite sent to ' + inviteEmail.trim())
      }
    } catch {
      flash('Network error — please try again', { variant: 'error' })
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
                    flash('Failed to update: ' + error.message, { variant: 'error' })
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

const PAYMENT_METHOD_OPTIONS = ['Cash', 'E-Transfer', 'Cheque', 'Financing']

function ContractSection({ flash, onDirtyChange }: { flash: FlashFn; onDirtyChange?: (dirty: boolean) => void }) {
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
  const [paymentMethods,           setPaymentMethods]           = useState<string[]>(['E-Transfer', 'Cheque'])
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

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const [userId, setUserId] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [sigKey, setSigKey] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [redrawMode, setRedrawMode] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (!data.user) return
      const sanitizedId = data.user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      supabase.from('profiles').select('signature_url, warranty_period, deposit_required, deposit_percent, deposit_timing, project_manager, completion_timeframe, payment_methods, contract_clauses').eq('id', sanitizedId).single().then(({ data: prof }: any) => {
        if ((prof as any)?.signature_url)   setSignatureUrl((prof as any).signature_url)
        const wp  = (prof as any)?.warranty_period     || '1 year'
        const dr  = (prof as any)?.deposit_required !== undefined && (prof as any)?.deposit_required !== null ? (prof as any).deposit_required : true
        const dp  = (prof as any)?.deposit_percent     || 10
        const pm  = (prof as any)?.project_manager     ?? ''
        const ct  = (prof as any)?.completion_timeframe || '10-16 weeks from the date of signed contract'
        const rawPms: string[] = (prof as any)?.payment_methods?.length ? (prof as any).payment_methods : ['E-Transfer', 'Cheque']
        const pms = rawPms.map(m => m.toLowerCase() === 'e-transfer' ? 'E-Transfer' : m)
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
            const savedIds = new Set((parsed as ContractClause[]).map((c: ContractClause) => c.id))
            const merged = [...parsed, ...DEFAULT_CLAUSES.filter((c: ContractClause) => !savedIds.has(c.id))]
            setContractClauses(merged)
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
      contract_clauses:     JSON.stringify(contractClauses.map(c => ({ ...c, title: c.title.trim() || 'Untitled clause' }))),
    }).eq('id', userId)
    if (error) { flash('Save failed: ' + error.message, { variant: 'error' }); return }
    const savedClauses_ = contractClauses.map(c => ({ ...c, title: c.title.trim() || 'Untitled clause' }))
    setSavedWarrantyPeriod(warrantyPeriod)
    setSavedDepositRequired(depositRequired)
    setSavedDepositPercent(depositPercent)
    setSavedDepositTiming(depositTiming)
    setSavedProjectManager(projectManager)
    setSavedCompletionTimeframe(completionTimeframe)
    setSavedPaymentMethods([...paymentMethods])
    setContractClauses(savedClauses_)
    setSavedClauses(JSON.stringify(savedClauses_))
    setExpandedClause(null)
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
    if (error) { flash('Save failed', { variant: 'error' }); return }
    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('profiles').update({ signature_url: url }).eq('id', userId)
    setSignatureUrl(url)
    setSigKey(Date.now())
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
            <select
              value={['1 year', '2 years', '5 years', '10 years'].includes(warrantyPeriod) ? warrantyPeriod : '__custom__'}
              onChange={e => setWarrantyPeriod(e.target.value === '__custom__' ? '' : e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              {['1 year', '2 years', '5 years', '10 years'].map(o => <option key={o} value={o}>{o}</option>)}
              <option value="__custom__">Custom...</option>
            </select>
            {!['1 year', '2 years', '5 years', '10 years'].includes(warrantyPeriod) && (
              <input
                type="text"
                value={warrantyPeriod}
                onChange={e => setWarrantyPeriod(e.target.value)}
                placeholder="e.g. Lifetime, 6 months, 3 years on parts"
                style={{ marginTop: 8, width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Deposit */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: depositRequired ? 10 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Deposit</div>
              <Toggle on={depositRequired} onChange={setDepositRequired} />
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: depositRequired ? 10 : 0 }}>This sets your default deposit percentage for new estimates. You can adjust or remove the deposit on individual projects when creating an estimate.</div>
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
            <input type="text" value={projectManager} onChange={e => setProjectManager(e.target.value)} placeholder="e.g. James Morrison"
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
                  {/* Clause header row — whole row tappable to expand/collapse */}
                  <div onClick={() => setExpandedClause(isExpanded ? null : clause.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}>
                    {/* Drag handle */}
                    {!clause.fixed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={{ flexShrink: 0, cursor: 'grab' }}>
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
                        onClick={e => { e.stopPropagation(); setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, enabled: !c.enabled } : c)) }}
                        style={{ width: 34, height: 20, borderRadius: 10, background: clause.enabled ? '#2563EB' : '#9CA3AF', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                      >
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', transform: clause.enabled ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
                      </div>
                    )}

                    {/* Title */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0A1628', minWidth: 0 }}>{clause.title}</span>

                    {/* Chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px' }}>
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
                        <>
                          <input
                            value={clause.title}
                            onChange={e => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, title: e.target.value } : c))}
                            placeholder="New clause"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                          />
                          <textarea
                            value={clause.content}
                            rows={4}
                            onChange={e => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, content: e.target.value } : c))}
                            placeholder="Enter clause text..."
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                          />
                          <button
                            onClick={e => { e.stopPropagation(); setClauseToDelete(clause.id) }}
                            style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 500, color: '#DC2626', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Remove clause
                          </button>
                        </>
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
                title: '',
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
                <img src={`${signatureUrl}?v=${sigKey}`} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
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
      {isDirty && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid rgba(10,22,40,0.07)', padding: '12px 20px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                setContractClauses(JSON.parse(savedClauses || '[]').length ? JSON.parse(savedClauses) : DEFAULT_CLAUSES)
                setWarrantyPeriod(savedWarrantyPeriod)
                setDepositRequired(savedDepositRequired)
                setDepositPercent(savedDepositPercent)
                setDepositTiming(savedDepositTiming)
                setCompletionTimeframe(savedCompletionTimeframe)
                setPaymentMethods([...savedPaymentMethods])
                setProjectManager(savedProjectManager)
              }}
              style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#475467', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >Discard</button>
            <button
              onClick={saveContract}
              style={{ flex: 1, height: 52, borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >Save changes</button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={clauseToDelete !== null}
        icon="trash"
        title="Remove this clause?"
        body={`"${contractClauses.find(c => c.id === clauseToDelete)?.title ?? 'This clause'}" will be permanently removed from your contract template.`}
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

function BillingSection({ flash: _flash }: { flash: FlashFn }) {
  return (
    <div>
      <SectionHeader kicker="BILLING" title="Plan & billing" subtitle="Billing management is coming soon." />
      <Card>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🚧</div>
          <div style={{ fontWeight: 600, color: '#475569', marginBottom: 6 }}>Coming soon</div>
          <div>Subscription management will be available here.</div>
        </div>
      </Card>
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
const SECTIONS: Record<SectionId, (props: { flash: FlashFn }) => React.ReactElement> = {
  profile:       (p) => <ProfileSection {...p} />,
  password:      (p) => <PasswordSection {...p} />,
  notifications: (p) => <NotificationsSection {...p} />,
  company:       (p) => <CompanySection {...p} />,
  quote:         () => <></>,
  reminders:     () => <></>,
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
  const [active, setActive] = useState<SectionId>('profile')
  const [toast, setToast] = useState<{ message: string; submessage?: string; variant?: 'success' | 'error' | 'neutral' } | null>(null)
  const [contractDirty, setContractDirty] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const pendingLeaveRef = useRef<(() => void) | null>(null)
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
    const s = searchParams.get('section')
    if (s) setActive(s as SectionId)
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user ?? null
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const [{ data: prof }, { data: teamMems }, { data: teamInvs }] = await Promise.all([
        supabase.from('profiles').select('company_name').eq('id', sanitizedId).single(),
        supabase.from('profiles').select('id').eq('team_owner_id', sanitizedId),
        supabase.from('team_invitations').select('id').eq('owner_id', sanitizedId).eq('status', 'pending'),
      ])
      if ((prof as any)?.company_name) setCompanyName((prof as any).company_name)
      const memberCount = 1 + (teamMems?.length ?? 0)
      const pendingCount = (teamInvs as any[])?.length ?? 0
      const memberLabel = `${memberCount} member${memberCount !== 1 ? 's' : ''}`
      setTeamDesc(pendingCount > 0 ? `${memberLabel} · ${pendingCount} invite${pendingCount !== 1 ? 's' : ''}` : memberLabel)
    })()
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
    if (!permLoading && hiddenIds.includes(active)) {
      setActive('profile')
      router.replace('/dashboard/settings?section=profile', { scroll: false })
    }
  }, [permLoading, active])

  const flash: FlashFn = (message, opts) => { setToast({ message, ...opts }); setTimeout(() => setToast(null), 3500) }
  const ActiveSection = SECTIONS[active]

  const guardLeave = (action: () => void) => {
    if (active === 'contract' && contractDirty) {
      pendingLeaveRef.current = action
      setLeaveConfirmOpen(true)
      return
    }
    action()
  }

  const handleNavClick = (id: SectionId) => {
    guardLeave(() => {
      if (id === 'quote') { router.push('/dashboard/settings/quote'); return }
      if (id === 'reminders') { router.push('/dashboard/settings/reminders'); return }
      setActive(id)
      router.replace(`/dashboard/settings?section=${id}`, { scroll: false })
      if (isMobile) setMobileDetail(true)
    })
  }

  // ── MOBILE ───────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif' }}>
        {!mobileDetail ? (
          // Section list
          <div>
            <AppTopBar eyebrow="WORKSPACE" title="Settings" />
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
          </div>
        ) : (
          // Detail view
          <div>
            <AppTopBar onBack={() => guardLeave(() => setMobileDetail(false))} backLabel="Settings" />
            <div style={{ padding: '20px 16px 100px' }}>
              {role === 'estimator' && (
                <div style={{ marginBottom: 16, padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 13, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Contact your account owner to change company settings.
                </div>
              )}
              {active === 'contract'
                ? <ContractSection flash={flash} onDirtyChange={setContractDirty} />
                : <ActiveSection flash={flash} />}
            </div>
          </div>
        )}
        {toast && <SuccessBanner message={toast.message} submessage={toast.submessage} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
        <ConfirmModal
          open={leaveConfirmOpen}
          icon="alert"
          title="Unsaved changes"
          body="Your contract clause changes haven't been saved. Leave anyway?"
          confirmLabel="Leave"
          onConfirm={() => { setLeaveConfirmOpen(false); pendingLeaveRef.current?.(); pendingLeaveRef.current = null }}
          onCancel={() => { setLeaveConfirmOpen(false); pendingLeaveRef.current = null }}
        />
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
              {active === 'contract'
                ? <ContractSection flash={flash} onDirtyChange={setContractDirty} />
                : <ActiveSection flash={flash} />}
            </div>
          </div>
        </div>
      </div>

      {toast && <SuccessBanner message={toast.message} submessage={toast.submessage} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
      <ConfirmModal
        open={leaveConfirmOpen}
        icon="alert"
        title="Unsaved changes"
        body="Your contract clause changes haven't been saved. Leave anyway?"
        confirmLabel="Leave"
        onConfirm={() => { setLeaveConfirmOpen(false); pendingLeaveRef.current?.(); pendingLeaveRef.current = null }}
        onCancel={() => { setLeaveConfirmOpen(false); pendingLeaveRef.current = null }}
      />
    </div>
  )
}
