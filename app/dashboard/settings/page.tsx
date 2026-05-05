'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Profile {
  first_name: string | null; last_name: string | null; email: string | null
  company_name: string | null; phone: string | null; website: string | null
  city: string | null; province: string | null; licence: string | null
  insurance: string | null; contract_terms: string | null; plan: string | null
  deposit_pct: number | null
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>('company')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setForm(data || {})
    }
    load()
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: e } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const sections = [
    { key: 'company', label: 'Company Info', icon: '🏢' },
    { key: 'contract', label: 'Contract Terms', icon: '📝' },
    { key: 'billing', label: 'Subscription', icon: '💳' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          <button onClick={signOut}
            style={{ background: 'rgba(239,68,68,.12)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#f87171', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
        <div className="h-title">
          <div className="h-eye">Your account</div>
          <div className="h-big">Settings</div>
          <div className="h-sub">{form.company_name || 'Company settings'}</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {/* Profile card */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {(form.first_name || '?')[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>{form.first_name} {form.last_name}</div>
            <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>{form.email}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {form.plan || 'Pro'} Plan
            </div>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✅ Settings saved</div>}

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button onClick={() => router.push('/dashboard/company')}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>🏢</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jet)' }}>Company Profile</div>
            <div style={{ fontSize: 9, color: 'var(--ash)', marginTop: 1 }}>Logo · Signature</div>
          </button>
          <button onClick={() => router.push('/dashboard/team')}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>👥</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jet)' }}>Team</div>
            <div style={{ fontSize: 9, color: 'var(--ash)', marginTop: 1 }}>Members · Invites</div>
          </button>
          <button onClick={() => router.push('/dashboard/invoices')}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>🧾</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jet)' }}>Invoices</div>
            <div style={{ fontSize: 9, color: 'var(--ash)', marginTop: 1 }}>Billing history</div>
          </button>
          <button onClick={() => router.push('/dashboard/price-list')}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>💰</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jet)' }}>Price List</div>
            <div style={{ fontSize: 9, color: 'var(--ash)', marginTop: 1 }}>Opening types</div>
          </button>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {sections.map(s => (
            <div key={s.key}
              onClick={() => setActiveSection(activeSection === s.key ? null : s.key)}
              style={{
                flex: 1, background: activeSection === s.key ? 'rgba(217,119,6,.08)' : '#fff',
                border: `1.5px solid ${activeSection === s.key ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer',
                fontSize: 10, fontWeight: 700, color: activeSection === s.key ? '#92400e' : 'var(--ash)',
              }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
              {s.label}
            </div>
          ))}
        </div>

        {/* Company info */}
        {activeSection === 'company' && (
          <>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>First Name</label>
                <input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
              <div className="f"><label>Last Name</label>
                <input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
            </div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Company Name</label>
              <input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} />
            </div></div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>Phone</label>
                <input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
              <div className="f"><label>Website</label>
                <input value={form.website || ''} onChange={e => set('website', e.target.value)} /></div>
            </div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>City</label>
                <input value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
              <div className="f"><label>Province</label>
                <select value={form.province || 'AB'} onChange={e => set('province', e.target.value)}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>Licence #</label>
                <input value={form.licence || ''} onChange={e => set('licence', e.target.value)} /></div>
              <div className="f"><label>Insurance</label>
                <input value={form.insurance || ''} onChange={e => set('insurance', e.target.value)} /></div>
            </div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Deposit %</label>
              <input type="number" min="0" max="100"
                value={form.deposit_pct ?? 30}
                onChange={e => set('deposit_pct', e.target.value)} />
              <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>Deposit invoice auto-sent when client signs · Default 30%</div>
            </div></div>
          </>
        )}

        {/* Contract terms */}
        {activeSection === 'contract' && (
          <div className="r1" style={{ marginBottom: 10 }}><div className="f">
            <label>Contract Terms</label>
            <textarea
              value={form.contract_terms || ''}
              onChange={e => set('contract_terms', e.target.value)}
              rows={8}
              placeholder="Enter your standard contract terms. These will appear on all estimates and the signing screen."
              style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div></div>
        )}

        {/* Subscription */}
        {activeSection === 'billing' && (
          <div style={{ background: 'rgba(217,119,6,.06)', border: '1.5px solid rgba(217,119,6,.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{form.plan || 'Pro'} Plan</div>
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>
                  {form.plan === 'starter' ? 'CA$79/mo' : form.plan === 'team' ? 'CA$299/mo' : 'CA$149/mo'}
                </div>
              </div>
              <span style={{ background: 'var(--amber)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 8 }}>ACTIVE</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 1.6 }}>
              {form.plan === 'starter' ? 'Estimates, e-signature, 1 user' : form.plan === 'team' ? 'Everything + Unlimited users + Priority support' : 'Everything + AI follow-ups + CRM + 3 users'}
            </div>
          </div>
        )}

        {activeSection === 'company' || activeSection === 'contract' ? (
          <button className="gen-btn" onClick={save} disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        ) : null}

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
