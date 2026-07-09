'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppTopBar from '@/components/AppTopBar'
import { usePermissions } from '@/lib/usePermissions'
import { SuccessBanner } from '@/components/SuccessBanner'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onDiscard} disabled={!dirty} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: dirty ? '#475467' : '#94A3B8', fontSize: 15, fontWeight: 500, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Discard
        </button>
        <button onClick={onSave} disabled={!dirty} style={{ flex: 1, height: 52, borderRadius: 12, border: 'none', background: dirty ? '#2563EB' : '#93aef5', color: '#fff', fontSize: 15, fontWeight: 600, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Save changes
        </button>
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

const DEFAULT_TEMPLATE_1 = `Hi {client_name}, I wanted to follow up on the estimate {estimate_number} we prepared for {address}. Please let me know if you have any questions or would like to make any changes. The estimate is valid until {expiry_date}.`

const DEFAULT_TEMPLATE_2 = `Hi {client_name}, this is a final follow-up regarding estimate {estimate_number} for {address} totalling {amount}. If you're still interested, please sign before {expiry_date} — after that the pricing may change. Feel free to reach out anytime.`

const DAY_OPTIONS = [1, 2, 3, 5, 7]
const MAX_COUNT_OPTIONS = [1, 2, 3]

type RemSettings = {
  auto_enabled: boolean
  max_count: number
  first_after_days: number
  second_after_days: number
  template_1: string
  template_2: string
}

const DEFAULTS: RemSettings = {
  auto_enabled: true,
  max_count: 2,
  first_after_days: 2,
  second_after_days: 5,
  template_1: DEFAULT_TEMPLATE_1,
  template_2: DEFAULT_TEMPLATE_2,
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA',
  borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628',
  background: '#fff', outline: 'none',
}

export default function ReminderSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = usePermissions()

  const [settings, setSettings] = useState<RemSettings>(DEFAULTS)
  const [initial, setInitial] = useState<RemSettings>(DEFAULTS)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'neutral' } | null>(null)
  const [activeTab, setActiveTab] = useState<1 | 2>(1)

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial)

  const flash = (message: string, opts?: { variant?: 'success' | 'error' | 'neutral' }) => {
    setToast({ message, ...opts })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      const { data: prof } = await supabase.from('profiles').select('quote_settings').eq('id', sanitizedId).single()
      const rem = (prof as any)?.quote_settings?.reminders
      if (rem) {
        const loaded: RemSettings = {
          auto_enabled:      rem.auto_enabled      ?? DEFAULTS.auto_enabled,
          max_count:         rem.max_count         ?? DEFAULTS.max_count,
          first_after_days:  rem.first_after_days  ?? DEFAULTS.first_after_days,
          second_after_days: rem.second_after_days ?? DEFAULTS.second_after_days,
          template_1:        rem.template_1        ?? DEFAULTS.template_1,
          template_2:        rem.template_2        ?? DEFAULTS.template_2,
        }
        setSettings(loaded)
        setInitial(loaded)
      }
    })
  }, [])

  async function save() {
    if (!userId) return
    const { data: prof } = await supabase.from('profiles').select('quote_settings').eq('id', userId).single()
    const currentQS = (prof as any)?.quote_settings ?? {}
    const { error } = await supabase.from('profiles').update({
      quote_settings: { ...currentQS, reminders: settings },
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message, { variant: 'error' }); return }
    setInitial({ ...settings })
    flash('Saved')
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Max reminders per estimate</label>
            <select value={settings.max_count} onChange={e => setSettings(s => ({ ...s, max_count: Number(e.target.value) }))} style={selectStyle}>
              {MAX_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Card>

        {/* Timing */}
        <Card>
          <SectionLabel>Timing</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>First reminder</label>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>After estimate is sent</div>
              <select value={settings.first_after_days} onChange={e => setSettings(s => ({ ...s, first_after_days: Number(e.target.value) }))} style={selectStyle}>
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? '1 day' : `${d} days`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>Second reminder</label>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>After first reminder</div>
              <select value={settings.second_after_days} onChange={e => setSettings(s => ({ ...s, second_after_days: Number(e.target.value) }))} style={selectStyle}>
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? '1 day' : `${d} days`}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Email template */}
        <Card>
          <SectionLabel>Email template</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([1, 2] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, height: 36, border: 'none', borderRadius: 9, background: activeTab === tab ? '#2563EB' : '#F1F5F9', color: activeTab === tab ? '#fff' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {tab === 1 ? 'First reminder' : 'Second reminder'}
              </button>
            ))}
          </div>
          <textarea
            value={activeTab === 1 ? settings.template_1 : settings.template_2}
            onChange={e => {
              const val = e.target.value
              setSettings(s => activeTab === 1 ? { ...s, template_1: val } : { ...s, template_2: val })
            }}
            rows={7}
            style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: 10, padding: '10px 12px', background: '#F8FAFF', borderRadius: 8, border: '1px solid #DBEAFE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 6, letterSpacing: '0.5px' }}>AVAILABLE VARIABLES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['{client_name}', '{address}', '{amount}', '{expiry_date}', '{estimate_number}'].map(v => (
                <span key={v} style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>{v}</span>
              ))}
            </div>
          </div>
        </Card>

        <SaveBar dirty={dirty} onSave={save} onDiscard={() => setSettings({ ...initial })} />
      </div>

      {toast && <SuccessBanner message={toast.message} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}
    </div>
  )
}
