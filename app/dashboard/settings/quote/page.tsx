'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'
import AppTopBar from '@/components/AppTopBar'

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

const VALID_DAY_OPTIONS = [15, 30, 45, 60]

export default function QuoteSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = usePermissions()

  const [validDays, setValidDays] = useState(30)
  const [initialValidDays, setInitialValidDays] = useState(30)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const dirty = validDays !== initialValidDays
  const valid = dirty

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
        .select('default_valid_days')
        .eq('id', sanitizedId)
        .single()
      if (prof) {
        const vd: number = (prof as any).default_valid_days || 30
        setValidDays(vd); setInitialValidDays(vd)
      }
    })
  }, [])

  async function save() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      default_valid_days: validDays,
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message); return }
    setInitialValidDays(validDays)
    flash('Saved')
  }

  if (roleLoading) return null
  if (role === 'estimator') return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Quote" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Access restricted</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>Quote Settings is managed by your account owner or manager.</div>
        <button onClick={() => router.push('/dashboard/settings')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Settings
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Quote" />

      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Card>
          <SectionLabel>Defaults</SectionLabel>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>Estimate valid for</label>
            <select
              value={validDays}
              onChange={e => setValidDays(Number(e.target.value))}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', background: '#fff', outline: 'none' }}
            >
              {VALID_DAY_OPTIONS.map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>How long estimates remain valid after sending</div>
          </div>
        </Card>

        <SaveBar dirty={dirty} valid={valid} onSave={save} onDiscard={() => { setValidDays(initialValidDays) }} />
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
