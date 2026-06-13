'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'
import { SHOW_GBB } from '@/lib/flags'

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

  const [pricingMode, setPricingMode] = useState<'single' | 'gbb'>('single')
  const [validDays, setValidDays] = useState(30)
  const [initialPricingMode, setInitialPricingMode] = useState<'single' | 'gbb'>('single')
  const [initialValidDays, setInitialValidDays] = useState(30)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const dirty = pricingMode !== initialPricingMode || validDays !== initialValidDays
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
        .select('pricing_mode, default_valid_days')
        .eq('id', sanitizedId)
        .single()
      if (prof) {
        const pm: 'single' | 'gbb' = (prof as any).pricing_mode === 'gbb' ? 'gbb' : 'single'
        const vd: number = (prof as any).default_valid_days || 30
        setPricingMode(pm);        setInitialPricingMode(pm)
        setValidDays(vd);          setInitialValidDays(vd)
      }
    })
  }, [])

  async function save() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      pricing_mode:       pricingMode,
      default_valid_days: validDays,
    }).eq('id', userId)
    if (error) { flash('Error saving: ' + error.message); return }
    setInitialPricingMode(pricingMode)
    setInitialValidDays(validDays)
    flash('Saved')
  }

  if (roleLoading) return null
  if (role === 'estimator') return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <div className="page-hd" style={{ background: '#fff', borderBottom: '0.5px solid #F1F3F5', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 20px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard/settings')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0A1628', fontFamily: 'inherit' }}>
          <ArrowLeft size={18} strokeWidth={2} color="#0A1628" />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>Quote Settings</span>
        </button>
      </div>
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
      <div className="page-hd" style={{ background: '#fff', borderBottom: '0.5px solid #F1F3F5', padding: 'max(48px, calc(env(safe-area-inset-top) + 16px)) 20px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => router.push('/dashboard/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0A1628', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={18} strokeWidth={2} color="#0A1628" />
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>Quote Settings</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {SHOW_GBB && (
          <Card>
            <SectionLabel>Pricing</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>Good / Better / Best pricing</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Show clients three pricing options on estimates</div>
              </div>
              <div
                onClick={() => setPricingMode(prev => prev === 'gbb' ? 'single' : 'gbb')}
                style={{ width: 44, height: 24, borderRadius: 999, flexShrink: 0, background: pricingMode === 'gbb' ? '#2563EB' : '#E2E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: pricingMode === 'gbb' ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              </div>
            </div>
          </Card>
        )}

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

        <SaveBar dirty={dirty} valid={valid} onSave={save} onDiscard={() => { setPricingMode(initialPricingMode); setValidDays(initialValidDays) }} />
      </div>

      {toast && <Toast text={toast} />}
    </div>
  )
}
