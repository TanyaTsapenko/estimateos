'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { useRole } from '@/lib/useRole'

interface Profile {
  first_name: string | null; last_name: string | null; email: string | null
  company_name: string | null; phone: string | null; website: string | null
  city: string | null; province: string | null; licence: string | null
  insurance: string | null; contract_terms: string | null; plan: string | null
  deposit_pct: number | null; contract_pdf_url: string | null; contract_pdf_name: string | null
}

interface TeamMember {
  id: string; first_name: string | null; last_name: string | null
  email: string | null; member_role: string | null; role: string | null
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

const SECTIONS = [
  { key: 'company',  label: 'Company',  icon: '🏢' },
  { key: 'contract', label: 'Contract', icon: '📝' },
  { key: 'password', label: 'Password', icon: '🔒' },
  { key: 'billing',  label: 'Billing',  icon: '💳' },
  { key: 'team',     label: 'Team',     icon: '👥' },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('company')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)
  const contractFileRef = useRef<HTMLInputElement>(null)
  const [uploadingContract, setUploadingContract] = useState(false)

  useEffect(() => {
    if (!roleLoading && role !== 'owner') router.replace('/dashboard')
  }, [role, roleLoading])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: members }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profiles')
          .select('id, first_name, last_name, email, member_role, role')
          .eq('team_owner_id', user.id),
      ])
      setProfile(prof)
      setForm(prof || {})
      setTeamMembers(members || [])
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

  async function changePassword() {
    setPwError(''); setPwSaved(false)
    if (!pwForm.current) return setPwError('Current password is required')
    if (pwForm.next.length < 8) return setPwError('New password must be at least 8 characters')
    if (pwForm.next !== pwForm.confirm) return setPwError('New passwords do not match')
    setPwSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwError('Could not get user'); setPwSaving(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current })
    if (signInErr) { setPwError('Current password is incorrect'); setPwSaving(false); return }
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next })
    if (updateErr) { setPwError(updateErr.message); setPwSaving(false); return }
    setPwSaved(true); setPwSaving(false)
    setPwForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  async function updateMemberRole(memberId: string, newRole: 'owner' | 'estimator') {
    setRoleUpdating(memberId)
    await supabase.from('profiles').update({ role: newRole, member_role: newRole }).eq('id', memberId)
    setTeamMembers(p => p.map(m => m.id === memberId ? { ...m, role: newRole, member_role: newRole } : m))
    setRoleUpdating(null)
  }

  async function handleContractUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Please upload a PDF file'); return }
    setUploadingContract(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingContract(false); return }
    const path = `${user.id}/contract-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { contentType: 'application/pdf', upsert: true })
    if (upErr) { setError(upErr.message); setUploadingContract(false); return }
    const url = supabase.storage.from('contracts').getPublicUrl(path).data.publicUrl
    const { error: dbErr } = await supabase.from('profiles').update({ contract_pdf_url: url, contract_pdf_name: file.name, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (dbErr) { setError(dbErr.message); setUploadingContract(false); return }
    setForm(p => ({ ...p, contract_pdf_url: url, contract_pdf_name: file.name }))
    setUploadingContract(false)
  }

  // ── SECTION CONTENT ─────────────────────────
  function SectionContent() {
    return (
      <>
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✅ Settings saved</div>}

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
            <button className="gen-btn" onClick={save} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </>
        )}

        {activeSection === 'contract' && (
          <>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Contract Terms</label>
              <textarea
                value={form.contract_terms || ''}
                onChange={e => set('contract_terms', e.target.value)}
                rows={10}
                placeholder="Enter your standard contract terms. These will appear on all estimates and the signing screen."
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div></div>
            <button className="gen-btn" onClick={save} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)', marginBottom: 4 }}>Contract PDF</div>
              <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 12, lineHeight: 1.5 }}>
                Upload a PDF contract to send alongside estimates. Clients will be asked to review and acknowledge it before signing.
              </div>
              {form.contract_pdf_url && (
                <div style={{ background: 'rgba(59,108,255,.06)', border: '1.5px solid rgba(59,108,255,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.contract_pdf_name || 'contract.pdf'}</span>
                  </div>
                  <a href={form.contract_pdf_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, fontWeight: 700, color: '#2045B8', whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0 }}>
                    View →
                  </a>
                </div>
              )}
              <input ref={contractFileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleContractUpload} />
              <button
                onClick={() => contractFileRef.current?.click()}
                disabled={uploadingContract}
                style={{ background: 'var(--surface)', border: '1.5px dashed var(--border)', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                {uploadingContract ? '⏳ Uploading...' : form.contract_pdf_url ? '🔄 Replace PDF' : '📤 Upload Contract PDF'}
              </button>
            </div>
          </>
        )}

        {activeSection === 'password' && (
          <>
            {pwError && <div className="error-msg">{pwError}</div>}
            {pwSaved && <div className="success-msg">✅ Password updated successfully</div>}
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Current Password</label>
              <input type="password" value={pwForm.current} autoComplete="current-password"
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
            </div></div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>New Password</label>
              <input type="password" value={pwForm.next} autoComplete="new-password"
                placeholder="Minimum 8 characters"
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
            </div></div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} autoComplete="new-password"
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
            </div></div>
            <button className="gen-btn" onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? '⏳ Updating...' : '🔒 Update Password'}
            </button>
          </>
        )}

        {activeSection === 'billing' && (
          <div style={{ background: 'rgba(59,108,255,.06)', border: '1.5px solid rgba(59,108,255,.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
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

        {activeSection === 'team' && (
          <>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 14 }}>
              Manage your team members' access level. <strong>Owner</strong> has full access. <strong>Estimator</strong> can create estimates and appointments only.
            </div>
            {teamMembers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 13, color: 'var(--ash)' }}>No team members yet.</div>
                <button onClick={() => router.push('/dashboard/team')}
                  style={{ marginTop: 12, background: 'rgba(59,108,255,.1)', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 700, color: 'var(--blue-dark)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Invite team member →
                </button>
              </div>
            )}
            {teamMembers.map(m => {
              const displayName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Team member'
              const currentRole = (m.role as 'owner' | 'estimator' | null) ?? (m.member_role === 'owner' ? 'owner' : 'estimator')
              return (
                <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(m.first_name || m.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                    <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{m.email}</div>
                  </div>
                  <select value={currentRole} disabled={roleUpdating === m.id}
                    onChange={e => updateMemberRole(m.id, e.target.value as 'owner' | 'estimator')}
                    style={{ background: '#F4F5F7', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--jet)', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                    <option value="owner">Owner</option>
                    <option value="estimator">Estimator</option>
                  </select>
                </div>
              )
            })}
            <button onClick={() => router.push('/dashboard/team')}
              style={{ width: '100%', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
              Manage invites →
            </button>
          </>
        )}
      </>
    )
  }

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

        {/* ── DESKTOP TWO-COL ── */}
        <div className="desktop-only settings-2col">
          {/* Left: profile card + nav */}
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {(form.first_name || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{form.first_name} {form.last_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>{form.email}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {form.plan || 'Pro'} Plan
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={() => router.push('/dashboard/company')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 6px', cursor: 'pointer', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--jet)', fontFamily: 'inherit' }}>
                  🏢 Company Profile
                </button>
                <button onClick={() => router.push('/dashboard/team')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 6px', cursor: 'pointer', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--jet)', fontFamily: 'inherit' }}>
                  👥 Manage Team
                </button>
                <button onClick={() => router.push('/dashboard/invoices')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 6px', cursor: 'pointer', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--jet)', fontFamily: 'inherit' }}>
                  🧾 Invoices
                </button>
                <button onClick={() => router.push('/dashboard/price-list')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 6px', cursor: 'pointer', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--jet)', fontFamily: 'inherit' }}>
                  💰 Price List
                </button>
              </div>
            </div>

            <div className="stnav">
              {SECTIONS.map(s => (
                <div key={s.key}
                  className={`stnav-item${activeSection === s.key ? ' active' : ''}`}
                  onClick={() => setActiveSection(s.key)}>
                  <span className="stnav-icon">{s.icon}</span>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: section content */}
          <div className="settings-content">
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)', marginBottom: 16 }}>
              {SECTIONS.find(s => s.key === activeSection)?.icon}{' '}
              {SECTIONS.find(s => s.key === activeSection)?.label}
            </div>
            <SectionContent />
          </div>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="mobile-only">
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
            {SECTIONS.map(s => (
              <div key={s.key}
                onClick={() => setActiveSection(activeSection === s.key ? s.key : s.key)}
                style={{
                  flex: 1, background: activeSection === s.key ? 'rgba(59,108,255,.08)' : '#fff',
                  border: `1.5px solid ${activeSection === s.key ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, color: activeSection === s.key ? '#2045B8' : 'var(--ash)',
                }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                {s.label}
              </div>
            ))}
          </div>

          <SectionContent />
        </div>

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
