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
      { id: 'team',     icon: 'team',     label: 'Team',       desc: 'Manage team members' },
      { id: 'contract', icon: 'contract', label: 'Contract',   desc: 'Terms template' },
      { id: 'price',    icon: 'price',    label: 'Price list', desc: 'Opening types & rates' },
    ],
  },
  {
    title: 'BILLING',
    items: [
      { id: 'billing',  icon: 'card',    label: 'Plan & billing', desc: 'Manage your subscription' },
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
  const supabase = createClient()
  const empty = { firstName: '', lastName: '', email: '', phone: '' }
  const [values, setValues] = useState(empty)
  const [initial, setInitial] = useState(empty)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name, email, phone').eq('id', user.id).single()
      const loaded = {
        firstName: (prof as any)?.first_name || '',
        lastName:  (prof as any)?.last_name  || '',
        email:     (prof as any)?.email      || user.email || '',
        phone:     (prof as any)?.phone      || '',
      }
      setValues(loaded)
      setInitial(loaded)
      setLoaded(true)
    })
  }, [])

  const dirty = loaded && JSON.stringify(values) !== JSON.stringify(initial)
  const valid = !!values.firstName && !!values.email

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ first_name: values.firstName, last_name: values.lastName, phone: values.phone }).eq('id', user.id)
    setInitial({ ...values })
    flash('Profile saved')
  }

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
      <SaveBar dirty={dirty} valid={valid} onSave={handleSave} onDiscard={() => setValues({ ...initial })} />
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 8 }}>
                Current session <Pill tone="blue">THIS DEVICE</Pill>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Active now</div>
            </div>
          </div>
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

function formatCanadianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
function isValidCanadianPhone(phone: string): boolean {
  return phone === '' || phone.replace(/\D/g, '').length === 10
}

function CompanySection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [values, setValues] = useState({ companyName: '', phone: '', website: '', addressLine: '', city: '', province: 'AB', postal: '', licence: '', insurance: '', depositPct: '10', currency: 'CAD' })
  const [initial, setInitial] = useState({ ...values })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [editingSig, setEditingSig] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const [savingSig, setSavingSig] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigDrawing = useRef(false)
  const sigLast = useRef({ x: 0, y: 0 })

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const valid = !!values.companyName && !!values.city && !!values.province
  const set = (k: string) => (v: string) => setValues(s => ({ ...s, [k]: v }))

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('company_name, phone, website, city, province, postal, licence, insurance, deposit_pct, logo_url, contractor_signature_url').eq('id', user.id).single()
      if (!prof) return
      if (prof.logo_url) setLogoUrl(prof.logo_url)
      if ((prof as any).contractor_signature_url) setSignatureUrl((prof as any).contractor_signature_url)
      const loaded = {
        companyName: (prof as any).company_name || '',
        phone: (prof as any).phone || '',
        website: (prof as any).website || '',
        addressLine: (prof as any).address_line || '',
        city: (prof as any).city || '',
        province: (prof as any).province || 'AB',
        postal: (prof as any).postal || '',
        licence: (prof as any).licence || '',
        insurance: (prof as any).insurance || '',
        depositPct: String((prof as any).deposit_pct ?? 10),
        currency: 'CAD',
      }
      setValues(loaded)
      setInitial(loaded)
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

  function getSigPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }
  function startSigDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = sigCanvasRef.current; if (!canvas) return
    sigDrawing.current = true; sigLast.current = getSigPos(e, canvas); e.preventDefault()
  }
  function drawSig(e: React.MouseEvent | React.TouchEvent) {
    if (!sigDrawing.current) return
    const canvas = sigCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getSigPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(sigLast.current.x, sigLast.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    sigLast.current = pos; setHasSig(true); e.preventDefault()
  }
  function endSigDraw() { sigDrawing.current = false }
  function clearSigCanvas() {
    const canvas = sigCanvasRef.current; if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }
  async function handleSaveSig() {
    const canvas = sigCanvasRef.current
    if (!canvas || !hasSig || !userId) return
    setSavingSig(true)
    const dataUrl = canvas.toDataURL('image/png')
    let sigUrl = dataUrl
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const path = `${userId}/contractor-sig.png`
      const { error: upErr } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (!upErr) sigUrl = supabase.storage.from('signatures').getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
    } catch {}
    await supabase.from('profiles').update({ contractor_signature_url: sigUrl }).eq('id', userId)
    setSignatureUrl(sigUrl)
    setEditingSig(false)
    setSavingSig(false)
    flash('Signature saved')
  }

  const initials = values.companyName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO'

  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Company" subtitle="Your business information shown on estimates and invoices." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Logo card */}
        <Card>
          <SectionLabel>Logo</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                border: logoUrl ? '1px solid #E2E5EA' : '2px dashed #E5E7EB',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: logoUrl ? '#fff' : '#FAFBFC',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 5 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>Upload logo</span>
                  </>
              }
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                {uploading ? 'Uploading…' : logoUrl ? 'Tap to change logo' : 'PNG, JPG or SVG · Max 2 MB'}
              </div>
              {logoUrl && (
                <button
                  onClick={handleRemove}
                  style={{
                    padding: '6px 12px', background: '#fff', color: '#DC2626',
                    border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Signature card */}
        <Card>
          <SectionLabel>Contractor Signature</SectionLabel>
          {signatureUrl && !editingSig ? (
            <div>
              <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, padding: 12, background: '#FAFBFC', marginBottom: 10 }}>
                <img src={signatureUrl} alt="Contractor signature" style={{ maxHeight: 100, maxWidth: '100%', display: 'block', objectFit: 'contain' }} />
              </div>
              <button
                onClick={() => { setEditingSig(true); setHasSig(false) }}
                style={{ padding: '8px 16px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#0A1628' }}>
                Edit
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', width: '100%', height: 160, marginBottom: 12 }}>
                <canvas
                  ref={sigCanvasRef}
                  width={700} height={160}
                  style={{ width: '100%', height: '100%', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                  onMouseDown={startSigDraw} onMouseMove={drawSig} onMouseUp={endSigDraw} onMouseLeave={endSigDraw}
                  onTouchStart={startSigDraw} onTouchMove={drawSig} onTouchEnd={endSigDraw}
                />
                {!hasSig && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 13, color: '#D1D5DB', pointerEvents: 'none' }}>
                    Sign here
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={clearSigCanvas}
                  style={{ padding: '9px 20px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#475569' }}>
                  Clear
                </button>
                <button onClick={handleSaveSig} disabled={!hasSig || savingSig}
                  style={{ padding: '9px 20px', background: hasSig && !savingSig ? '#2563EB' : '#E2E5EA', color: hasSig && !savingSig ? '#fff' : '#94A3B8', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: hasSig && !savingSig ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: hasSig && !savingSig ? '0 4px 12px -4px rgba(37,99,235,0.5)' : 'none' }}>
                  {savingSig ? 'Saving…' : 'Save Signature'}
                </button>
                {editingSig && (
                  <button onClick={() => { setEditingSig(false); clearSigCanvas() }}
                    style={{ padding: '9px 20px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#64748B', marginLeft: 'auto' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Business details</SectionLabel>
          <Field label="Company name" value={values.companyName} onChange={set('companyName')} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field
              label="Phone"
              value={values.phone}
              onChange={v => setValues(s => ({ ...s, phone: formatCanadianPhone(v) }))}
              placeholder="(403) 555-0123"
              error={!isValidCanadianPhone(values.phone) ? 'Please enter a valid Canadian phone number' : undefined}
            />
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
            <Field label="Licence #" value={values.licence} onChange={set('licence')} placeholder="e.g. AB-123456" />
            <Field label="Insurance # (optional)" value={values.insurance} onChange={set('insurance')} placeholder="e.g. Policy #INS-789012 · Intact Insurance" />
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
  const router = useRouter()
  return (
    <div>
      <SectionHeader kicker="BUSINESS" title="Team" subtitle="Manage your team members and pending invitations." />
      <Card>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            View and manage your team on the dedicated Team page.
          </div>
          <button
            onClick={() => router.push('/dashboard/team')}
            style={{ padding: '10px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Go to Team →
          </button>
        </div>
      </Card>
    </div>
  )
}

const DEFAULT_TERMS = 'This agreement is entered into between the contractor and the client named above. All materials and workmanship are guaranteed for the warranty period specified. The client agrees to provide reasonable access to the property. Payment is due as specified in this agreement. The contractor carries full liability insurance.'
const DEFAULT_CANCELLATION = 'Either party may cancel this contract with 72 hours written notice prior to the scheduled start date.'
const DEFAULT_COMPLETION_TIMEFRAME = '10-16 weeks from the project start date, subject to material availability and weather conditions.'
const DEFAULT_CUSTOMER_RESPONSIBILITIES = 'The customer is responsible for: clearing furniture, valuables, and personal items from the work area prior to the start date; ensuring unobstructed access to the job site during working hours; securing pets away from the work area; and making timely decisions regarding product selections and approvals to avoid project delays.'
const DEFAULT_BUYER_RIGHT_TO_CANCEL = 'You may cancel this contract without penalty within 10 days of signing. After this period, cancellation may result in charges for materials ordered and work completed. To cancel, provide written notice to the contractor at the contact information listed above.'
const DEFAULT_DAMAGE_DISCLAIMER = 'The contractor is not responsible for pre-existing damage, rot, or structural deficiencies discovered during the project. Minor drywall patching may be required around openings and is not included unless specified in writing. The contractor will take reasonable precautions to protect the surrounding work area.'
const DEFAULT_PERMITS_RESPONSIBILITY = 'The contractor will obtain all required building permits for this project. Permit fees are not included in the contract price unless explicitly stated in the estimate. The client agrees to provide access for municipal inspections as required.'
const PAYMENT_METHOD_OPTIONS = ['Cash', 'E-transfer', 'Cheque', 'Financing']

function ContractSection({ flash }: { flash: (m: string) => void }) {
  const supabase = createClient()
  const [values, setValues] = useState({ intro: 'Thank you for choosing {company_name}. This estimate is valid for 30 days.', requireSign: true, showLicence: false })
  const [contractTerms,      setContractTerms]      = useState(DEFAULT_TERMS)
  const [warrantyPeriod,     setWarrantyPeriod]     = useState('1 year')
  const [depositRequired,    setDepositRequired]    = useState(true)
  const [depositPercent,     setDepositPercent]     = useState(10)
  const [paymentTerms,       setPaymentTerms]       = useState('Upon completion')
  const [cancellationPolicy,       setCancellationPolicy]       = useState(DEFAULT_CANCELLATION)
  const [completionTimeframe,      setCompletionTimeframe]      = useState(DEFAULT_COMPLETION_TIMEFRAME)
  const [paymentMethods,           setPaymentMethods]           = useState<string[]>(['E-transfer', 'Cheque'])
  const [customerResponsibilities, setCustomerResponsibilities] = useState(DEFAULT_CUSTOMER_RESPONSIBILITIES)
  const [buyerRightToCancel,       setBuyerRightToCancel]       = useState(DEFAULT_BUYER_RIGHT_TO_CANCEL)
  const [damageDisclaimer,         setDamageDisclaimer]         = useState(DEFAULT_DAMAGE_DISCLAIMER)
  const [permitsResponsibility,    setPermitsResponsibility]    = useState(DEFAULT_PERMITS_RESPONSIBILITY)
  const [projectManager,           setProjectManager]           = useState('')
  const [saving,                   setSaving]                   = useState(false)
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [contractFileName, setContractFileName] = useState<string | null>(null)
  const [contractFileSize, setContractFileSize] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const dirty = true

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('contract_pdf_url, contract_terms, warranty_period, deposit_required, deposit_percent, payment_terms, cancellation_policy, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager').eq('id', user.id).single()
      if (prof?.contract_pdf_url) setContractPdfUrl(prof.contract_pdf_url)
      if ((prof as any)?.contract_terms)      setContractTerms((prof as any).contract_terms)
      if ((prof as any)?.warranty_period)     setWarrantyPeriod((prof as any).warranty_period)
      if ((prof as any)?.deposit_required !== undefined && (prof as any)?.deposit_required !== null) setDepositRequired((prof as any).deposit_required)
      if ((prof as any)?.deposit_percent)     setDepositPercent((prof as any).deposit_percent)
      if ((prof as any)?.payment_terms)       setPaymentTerms((prof as any).payment_terms)
      if ((prof as any)?.cancellation_policy)       setCancellationPolicy((prof as any).cancellation_policy)
      if ((prof as any)?.completion_timeframe)       setCompletionTimeframe((prof as any).completion_timeframe)
      if ((prof as any)?.payment_methods?.length)    setPaymentMethods((prof as any).payment_methods)
      if ((prof as any)?.customer_responsibilities)  setCustomerResponsibilities((prof as any).customer_responsibilities)
      if ((prof as any)?.buyer_right_to_cancel)      setBuyerRightToCancel((prof as any).buyer_right_to_cancel)
      if ((prof as any)?.damage_disclaimer)          setDamageDisclaimer((prof as any).damage_disclaimer)
      if ((prof as any)?.permits_responsibility)     setPermitsResponsibility((prof as any).permits_responsibility)
      if ((prof as any)?.project_manager != null)    setProjectManager((prof as any).project_manager)
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

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      contract_terms:           contractTerms,
      warranty_period:          warrantyPeriod,
      deposit_required:         depositRequired,
      deposit_percent:          depositPercent,
      payment_terms:            paymentTerms,
      cancellation_policy:      cancellationPolicy,
      completion_timeframe:     completionTimeframe,
      payment_methods:          paymentMethods,
      customer_responsibilities: customerResponsibilities,
      buyer_right_to_cancel:    buyerRightToCancel,
      damage_disclaimer:        damageDisclaimer,
      permits_responsibility:   permitsResponsibility,
      project_manager:          projectManager,
    }).eq('id', userId)
    setSaving(false)
    flash('Contract saved')
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
          <textarea value={contractTerms} onChange={e => setContractTerms(e.target.value)} rows={6}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'ui-monospace, monospace', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>

        <Card>
          <SectionLabel>Completion Timeframe</SectionLabel>
          <input
            type="text"
            value={completionTimeframe}
            onChange={e => setCompletionTimeframe(e.target.value)}
            placeholder="e.g. 10-16 weeks from start date"
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
          />
        </Card>

        <Card>
          <SectionLabel>Accepted Payment Methods</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            {PAYMENT_METHOD_OPTIONS.map(method => {
              const checked = paymentMethods.includes(method)
              return (
                <label key={method} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', border: `1.5px solid ${checked ? '#2563EB' : '#E2E5EA'}`, borderRadius: 10, background: checked ? '#EEF2FF' : '#fff', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setPaymentMethods(prev => checked ? prev.filter(m => m !== method) : [...prev, method])}
                    style={{ display: 'none' }}
                  />
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? '#2563EB' : '#CBD5E1'}`, background: checked ? '#2563EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2.5"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: checked ? '#2563EB' : '#475569' }}>{method}</span>
                </label>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionLabel>Customer Responsibilities</SectionLabel>
          <textarea value={customerResponsibilities} onChange={e => setCustomerResponsibilities(e.target.value)} rows={4}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>

        <Card>
          <SectionLabel>Buyer's Right to Cancel</SectionLabel>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>Legal cancellation clause — edit to match your jurisdiction.</div>
          <textarea value={buyerRightToCancel} onChange={e => setBuyerRightToCancel(e.target.value)} rows={4}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#FAFBFC' }} />
        </Card>

        <Card>
          <SectionLabel>Damage Disclaimer</SectionLabel>
          <textarea value={damageDisclaimer} onChange={e => setDamageDisclaimer(e.target.value)} rows={4}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>

        <Card>
          <SectionLabel>Permits Responsibility</SectionLabel>
          <textarea value={permitsResponsibility} onChange={e => setPermitsResponsibility(e.target.value)} rows={3}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </Card>

        <Card>
          <SectionLabel>Project Manager</SectionLabel>
          <input
            type="text"
            value={projectManager}
            onChange={e => setProjectManager(e.target.value)}
            placeholder="e.g. John Smith"
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
          />
        </Card>

        {/* ── CONTRACT DEFAULTS ── */}
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
      <SaveBar dirty={dirty} valid={true} onSave={handleSave} onDiscard={() => {}} />
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
      <Card>
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B', fontSize: 14 }}>
          Billing management is not yet available in-app. Contact support to change your plan or update your payment method.
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
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No billing history yet</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Your subscription invoices will appear here.</div>
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
  const [companyName, setCompanyName] = useState('')
  const [userName, setUserName] = useState('')
  const [userInitial, setUserInitial] = useState('?')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const { data: prof } = await supabase.from('profiles').select('company_name, first_name, last_name').eq('id', user.id).single()
      if (prof?.company_name) setCompanyName(prof.company_name)
      const name = [(prof as any)?.first_name, (prof as any)?.last_name].filter(Boolean).join(' ') || user.email || ''
      setUserName(name)
      setUserInitial(name[0]?.toUpperCase() || '?')
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
          Apex<span style={{ color: '#3B82F6' }}>Scale</span>
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
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{userInitial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || '—'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Owner</div>
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
