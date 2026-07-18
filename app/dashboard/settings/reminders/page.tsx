'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppTopBar from '@/components/AppTopBar'
import { usePermissions } from '@/lib/usePermissions'
import { SuccessBanner } from '@/components/SuccessBanner'

// ── primitives ────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>{children}</div>
}

function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid rgba(10,22,40,0.07)', padding: '12px 20px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 12 }}>
        <button onClick={onDiscard} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#475467', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
        <button onClick={onSave} style={{ flex: 1, height: 52, borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save changes</button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 44, height: 26, borderRadius: 13, background: checked ? '#2563EB' : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
    </div>
  )
}

// ── constants ─────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE = `Hi {client_name}, just following up on estimate {estimate_number} we prepared for {address}. Please let me know if you have any questions or would like to make any changes. The estimate is valid until {expiry_date}.`

const DAY_OPTIONS       = [1, 2, 3, 5, 7]
const VALID_DAY_OPTIONS = [15, 30, 45, 60]
const MAX_COUNT_OPTIONS = [1, 2, 3]
const TONE_PREFIXES   = ['', 'Just following up again — ', 'Final reminder — ']
const ORDINALS        = ['1st reminder', '2nd reminder', '3rd reminder']

const SAMPLE = {
  client_name:     'James Morrison',
  estimate_number: 'EST-0019',
  address:         '123 Maple St, Calgary, AB',
  expiry_date:     'November 15, 2025',
  amount:          'CA$4,250.00',
}

const VARIABLES: { label: string; token: string }[] = [
  { label: 'Client name', token: '{client_name}'    },
  { label: 'Address',     token: '{address}'         },
  { label: 'Amount',      token: '{amount}'           },
  { label: 'Expiry date', token: '{expiry_date}'     },
  { label: 'Estimate #',  token: '{estimate_number}' },
]

// ── data model ────────────────────────────────────────────────────────
type RemSettings = { auto_enabled: boolean; max_count: number; after_days: number; template: string }

const DEFAULTS: RemSettings = { auto_enabled: true, max_count: 2, after_days: 2, template: DEFAULT_TEMPLATE }

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
  borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628',
  background: '#fff', outline: 'none',
}

// ── highlight textarea ────────────────────────────────────────────────
// Shared font metrics — must be identical on backdrop div and textarea
const FONT: React.CSSProperties = {
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  fontSize: 14, fontWeight: 400, lineHeight: '1.6', letterSpacing: 'normal',
}

function HighlightTextarea({ value, onChange, textareaRef }: {
  value: string
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const backdropRef = useRef<HTMLDivElement>(null)

  const highlighted = value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\{[a-z_]+\})/g, '<mark style="background:#DBEAFE;color:#1D4ED8;font-weight:700;border-radius:3px;padding:0 2px">$1</mark>')
    + ' '

  const syncScroll = () => {
    if (backdropRef.current && textareaRef.current)
      backdropRef.current.scrollTop = textareaRef.current.scrollTop
  }

  const base: React.CSSProperties = {
    ...FONT, padding: '11px 13px', boxSizing: 'border-box', width: '100%',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
    margin: 0, border: 'none', outline: 'none',
  }

  return (
    <div style={{ position: 'relative', border: '1px solid #E2E5EA', borderRadius: 10, background: '#fff' }}>
      <div
        ref={backdropRef}
        aria-hidden
        style={{ ...base, position: 'absolute', inset: 0, color: '#0A1628', overflow: 'hidden', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        rows={7}
        style={{ ...base, display: 'block', position: 'relative', zIndex: 1, resize: 'none', background: 'transparent', color: 'transparent', caretColor: '#0A1628' }}
      />
    </div>
  )
}

// ── preview renderer ──────────────────────────────────────────────────
function renderPreviewHtml(template: string, idx: number): string {
  const text = TONE_PREFIXES[idx] + template
  const esc  = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\{client_name\}/g,     `<strong style="color:#2563EB">${SAMPLE.client_name}</strong>`)
    .replace(/\{estimate_number\}/g, `<strong style="color:#2563EB">${SAMPLE.estimate_number}</strong>`)
    .replace(/\{address\}/g,         `<strong style="color:#2563EB">${SAMPLE.address}</strong>`)
    .replace(/\{expiry_date\}/g,     `<strong style="color:#2563EB">${SAMPLE.expiry_date}</strong>`)
    .replace(/\{amount\}/g,          `<strong style="color:#2563EB">${SAMPLE.amount}</strong>`)
    .replace(/\n/g, '<br/>')
}

// ── page ──────────────────────────────────────────────────────────────
export default function ReminderSettingsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = usePermissions()

  const [settings,         setSettings]         = useState<RemSettings>(DEFAULTS)
  const [initial,          setInitial]          = useState<RemSettings>(DEFAULTS)
  const [validDays,        setValidDays]        = useState(30)
  const [initialValidDays, setInitialValidDays] = useState(30)
  const [userId,           setUserId]           = useState<string | null>(null)
  const baseQuoteSettingsRef    = useRef<Record<string, unknown>>({})
  const [toast,      setToast]      = useState<{ message: string; variant?: 'success' | 'error' | 'neutral' } | null>(null)
  const [previewTab, setPreviewTab] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial) || validDays !== initialValidDays

  // Reset preview tab if max_count shrinks below current tab
  useEffect(() => {
    if (previewTab >= settings.max_count) setPreviewTab(0)
  }, [settings.max_count])

  const flash = (msg: string, opts?: { variant?: 'success' | 'error' | 'neutral' }) => {
    setToast({ message: msg, ...opts })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const sid = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sid)
      const { data: prof } = await supabase.from('profiles').select('quote_settings, default_valid_days').eq('id', sid).single()
      const qs  = (prof as any)?.quote_settings ?? {}
      baseQuoteSettingsRef.current = qs
      const rem = qs?.reminders
      if (rem) {
        const loaded: RemSettings = {
          auto_enabled: rem.auto_enabled ?? DEFAULTS.auto_enabled,
          max_count:    rem.max_count    ?? DEFAULTS.max_count,
          after_days:   rem.after_days   ?? rem.first_after_days ?? DEFAULTS.after_days,
          template:     rem.template     ?? rem.template_1       ?? DEFAULTS.template,
        }
        setSettings(loaded)
        setInitial(loaded)
      }
      const vd: number = (prof as any)?.default_valid_days || 30
      setValidDays(vd); setInitialValidDays(vd)
    })()
  }, [])

  async function save() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      quote_settings:    { ...baseQuoteSettingsRef.current, reminders: settings },
      default_valid_days: validDays,
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message, { variant: 'error' }); return }
    baseQuoteSettingsRef.current = { ...baseQuoteSettingsRef.current, reminders: settings }
    setInitial({ ...settings })
    setInitialValidDays(validDays)
    flash('Saved')
  }

  function insertVariable(token: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? settings.template.length
    const end   = ta.selectionEnd   ?? settings.template.length
    const next  = settings.template.slice(0, start) + token + settings.template.slice(end)
    setSettings(s => ({ ...s, template: next }))
    setTimeout(() => {
      ta.focus()
      const p = start + token.length
      ta.setSelectionRange(p, p)
    }, 0)
  }

  if (roleLoading) return null

  if (role === 'estimator') return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Reminders" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Access restricted</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>Reminder Settings is managed by your account owner or manager.</div>
        <button onClick={() => router.push('/dashboard/settings')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Back to Settings</button>
      </div>
    </div>
  )

  const previewIdx       = settings.max_count === 1 ? 0 : previewTab
  const activeTonePrefix = TONE_PREFIXES[previewIdx]

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Reminders" />

      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* General */}
        <Card>
          <SectionLabel>General</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>Auto reminders</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Automatically suggest reminders for stale estimates</div>
            </div>
            <Toggle checked={settings.auto_enabled} onChange={v => setSettings(s => ({ ...s, auto_enabled: v }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Number of reminders</label>
            <select value={settings.max_count} onChange={e => setSettings(s => ({ ...s, max_count: Number(e.target.value) }))} style={selectStyle}>
              {MAX_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Card>

        {/* Timing */}
        <Card>
          <SectionLabel>Timing</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>Estimate valid for</label>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>How long estimates remain valid after sending</div>
            <select value={validDays} onChange={e => setValidDays(Number(e.target.value))} style={selectStyle}>
              {VALID_DAY_OPTIONS.map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>Days between reminders</label>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Applied before the first reminder and between each subsequent one</div>
            <select value={settings.after_days} onChange={e => setSettings(s => ({ ...s, after_days: Number(e.target.value) }))} style={selectStyle}>
              {DAY_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? '1 day' : `${d} days`}</option>)}
            </select>
          </div>
        </Card>

        {/* Email template */}
        <Card>
          <SectionLabel>Email template</SectionLabel>
          <div style={{ marginBottom: 10 }}>
            <HighlightTextarea
              value={settings.template}
              onChange={v => setSettings(s => ({ ...s, template: v }))}
              textareaRef={textareaRef}
            />
          </div>
          <div style={{ padding: '10px 12px', background: '#F8FAFF', borderRadius: 8, border: '1px solid #DBEAFE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6, letterSpacing: '0.5px' }}>INSERT VARIABLE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARIABLES.map(({ label, token }) => (
                <button
                  key={token}
                  onClick={() => insertVariable(token)}
                  style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8', background: '#EFF6FF', padding: '4px 10px', borderRadius: 6, border: '1px solid #BFDBFE', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card>
          <SectionLabel>Preview</SectionLabel>
          {settings.max_count > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {Array.from({ length: settings.max_count }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewTab(i)}
                  style={{ flex: 1, height: 34, border: 'none', borderRadius: 8, background: previewTab === i ? '#2563EB' : '#F1F5F9', color: previewTab === i ? '#fff' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {ORDINALS[i]}
                </button>
              ))}
            </div>
          )}
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: '#334155', background: '#F8FAFF', borderRadius: 10, padding: '14px 16px', border: '1px solid #E0EAFF' }}
            dangerouslySetInnerHTML={{ __html: renderPreviewHtml(settings.template, previewIdx) }}
          />
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
            {activeTonePrefix
              ? <>Prefix &ldquo;<em>{activeTonePrefix}</em>&rdquo; is added automatically — not part of your template.</>
              : 'No automatic prefix on the first reminder.'}
          </div>
        </Card>

        <SaveBar dirty={dirty} onSave={save} onDiscard={() => setSettings({ ...initial })} />
      </div>

      {toast && <SuccessBanner message={toast.message} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
    </div>
  )
}
