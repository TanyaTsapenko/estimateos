'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { useRole } from '@/lib/useRole'
import ConfirmModal from '@/components/ConfirmModal'
import { SIcon } from '@/components/SIcon'
import { DEFAULT_ESTIMATOR_PERMISSIONS } from '@/lib/usePermissions'
import type { Permissions } from '@/lib/usePermissions'

interface Member {
  id: string; first_name: string | null; last_name: string | null
  email: string | null; member_role: string | null; created_at: string
  permissions: Partial<Permissions> | null
}

const PERM_LABELS: { key: keyof Permissions; label: string; desc: string }[] = [
  { key: 'estimates',  label: 'Estimates',         desc: 'Create & send estimates' },
  { key: 'schedule',   label: 'Schedule',           desc: 'View & manage appointments' },
  { key: 'clients',    label: 'Clients',            desc: 'View client list' },
  { key: 'price_list', label: 'Price List',         desc: 'Edit prices & products' },
  { key: 'reports',    label: 'Reports',            desc: 'View revenue & analytics' },
  { key: 'settings',   label: 'Company Settings',   desc: 'Edit company info & contract' },
]

interface Invitation {
  id: string; invitee_email: string; invitee_name: string | null
  role: string; created_at: string; expires_at: string
}
interface Profile {
  company_name: string | null; plan: string | null
  first_name: string | null; last_name: string | null
}

const ROLES = [
  { key: 'estimator', icon: '📋', label: 'Sales / Estimator', desc: 'Create estimates, visit clients, collect signatures. Sees own clients only.' },
  { key: 'manager',   icon: '📊', label: 'Manager',           desc: 'View all estimates and reports. Cannot create estimates or access billing.' },
  { key: 'admin',     icon: '🧾', label: 'Office Admin',      desc: 'Access to invoices and client list only. No estimates or team management.' },
  { key: 'owner',     icon: '👑', label: 'Owner',             desc: 'Full access — estimates, clients, billing, team management. Same as you.' },
]

const SEAT_LIMITS: Record<string, number> = { starter: 1, pro: 3, team: 999 }

const AVATAR_COLORS = ['#4a5568', '#7c3aed', '#059669', '#2563eb', '#d97706', '#dc2626']
function avatarColor(s: string) { return AVATAR_COLORS[(s.charCodeAt(0) || 65) % AVATAR_COLORS.length] }
function initials(m: { first_name: string | null; last_name: string | null; email: string | null }) {
  if (m.first_name && m.last_name) return `${m.first_name[0]}${m.last_name[0]}`.toUpperCase()
  if (m.first_name) return m.first_name[0].toUpperCase()
  return (m.email || '?')[0].toUpperCase()
}

export default function TeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()

  useEffect(() => {
    if (!roleLoading && role !== 'owner') router.replace('/dashboard')
  }, [role, roleLoading])

  const [profile, setProfile] = useState<Profile | null>(null)
  const [myId, setMyId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<'list' | 'invite'>('list')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [pendingPerms, setPendingPerms] = useState<Record<string, Permissions>>({})
  const [savingPerms, setSavingPerms] = useState<string | null>(null)
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null)

  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState('estimator')
  const [invPerms, setInvPerms] = useState({
    estimates: true, schedule: true, clients: true,
    price_list: false, reports: false, settings: false,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setMyId(user.id)

      const [{ data: prof }, { data: mems }, { data: invs }] = await Promise.all([
        supabase.from('profiles').select('company_name, plan, first_name, last_name').eq('id', user.id).single(),
        supabase.from('profiles').select('id, first_name, last_name, email, member_role, permissions, created_at').eq('team_owner_id', user.id),
        supabase.from('team_invitations').select('*').eq('owner_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      setMembers(mems || [])
      setInvitations(invs || [])
      setLoading(false)
    }
    load()
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const plan = profile?.plan || 'pro'
  const seatLimit = SEAT_LIMITS[plan] ?? 3
  const seatsUsed = 1 + members.length + invitations.length
  const seatsLeft = Math.max(0, seatLimit - seatsUsed)
  const canInvite = plan === 'team' || seatsLeft > 0

  async function sendInvite() {
    if (!invEmail.trim()) { showToast('⚠️ Enter an email address'); return }
    setSending(true)
    try {
      const res = await fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: invEmail.trim(), inviteeName: invName.trim() || null, role: invRole, permissions: invPerms }),
      })
      const json = await res.json()
      if (!res.ok) { showToast('⚠️ ' + (json.error || 'Failed to send invite')); setSending(false); return }
      setInvitations(p => [json.invitation, ...p])
      setInvEmail(''); setInvName(''); setInvRole('estimator')
      setInvPerms({ estimates: true, schedule: true, clients: true, price_list: false, reports: false, settings: false })
      setScreen('list')
      if (json.emailWarning) {
        showToast('⚠️ Invite saved but email failed: ' + json.emailWarning)
      } else {
        showToast('📧 Invite sent to ' + invEmail.trim())
      }
    } catch (e) {
      showToast('⚠️ Network error — please try again')
    }
    setSending(false)
  }

  async function resendInvite(inv: Invitation) {
    try {
      const res = await fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: inv.invitee_email, inviteeName: inv.invitee_name, role: inv.role, resendId: inv.id }),
      })
      const json = await res.json()
      if (!res.ok) { showToast('⚠️ ' + (json.error || 'Failed to resend')); return }
      if (json.emailWarning) {
        showToast('⚠️ Email failed: ' + json.emailWarning)
      } else {
        showToast('📧 Invite resent to ' + inv.invitee_email)
      }
    } catch {
      showToast('⚠️ Network error — please try again')
    }
  }

  async function cancelInvite(id: string) {
    await supabase.from('team_invitations').update({ status: 'cancelled' }).eq('id', id)
    setInvitations(p => p.filter(i => i.id !== id))
    showToast('❌ Invite cancelled')
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/team-members/${memberId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      showToast('⚠️ ' + (json.error || 'Failed to remove member'))
      return
    }
    setMembers(p => p.filter(m => m.id !== memberId))
    showToast('✅ Member removed')
  }

  function toggleExpand(m: Member) {
    if (expandedMemberId === m.id) {
      setExpandedMemberId(null)
    } else {
      setExpandedMemberId(m.id)
      setPendingPerms(prev => ({
        ...prev,
        [m.id]: { ...DEFAULT_ESTIMATOR_PERMISSIONS, ...(m.permissions || {}) },
      }))
    }
  }

  async function savePermissions(memberId: string) {
    const perms = pendingPerms[memberId]
    if (!perms) return
    setSavingPerms(memberId)
    const { error } = await supabase.from('profiles').update({ permissions: perms }).eq('id', memberId)
    setSavingPerms(null)
    if (error) {
      showToast('⚠️ Failed to save permissions')
    } else {
      setMembers(ms => ms.map(m => m.id === memberId ? { ...m, permissions: perms } : m))
      setExpandedMemberId(null)
      showToast('✅ Permissions saved')
    }
  }

  const companyName = profile?.company_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Your Team'

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div></div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ color: 'var(--ash)', fontSize: 13 }}>Loading team…</div>
      </div>
      <BottomNav />
    </div>
  )

  const removingMemberName = removingMember
    ? [removingMember.first_name, removingMember.last_name].filter(Boolean).join(' ') || removingMember.email || 'This member'
    : ''

  console.log('screen:', screen)

  return (
    <>
    <ConfirmModal
      open={!!removingMember}
      icon="user-minus"
      title="Remove team member?"
      body={`${removingMemberName} will be removed from your workspace.`}
      confirmLabel="Remove"
      onConfirm={() => { const m = removingMember; setRemovingMember(null); if (m) removeMember(m.id) }}
      onCancel={() => setRemovingMember(null)}
    />
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {screen === 'invite' ? (
              <button onClick={() => setScreen('list')}
                style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ←
              </button>
            ) : (
              <button onClick={() => router.push('/dashboard/settings')}
                style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ←
              </button>
            )}
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          {screen === 'list' ? (
            <button
              onClick={() => setScreen('invite')}
              style={{ background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              + Invite
            </button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)} · {plan === 'team' ? '∞' : `${seatsUsed}/${seatLimit}`} seats
            </div>
          )}
        </div>
        <div className="h-title">
          <div className="h-eye">{screen === 'invite' ? 'Team · Add Member' : 'Settings · Team'}</div>
          <div className="h-big">{screen === 'invite' ? 'Invite' : 'Team Members'}</div>
          <div className="h-sub">{screen === 'invite' ? 'They\'ll get an email to join' : companyName}</div>
        </div>
        {screen === 'list' && (
          <div style={{ position: 'relative', zIndex: 2, marginTop: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>👥</span>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan · {plan === 'team' ? 'Unlimited seats' : `${seatLimit} seats`}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{members.length + 1} active · {invitations.length} pending</div>
              </div>
            </div>
            {plan !== 'team' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', cursor: 'pointer' }}>Upgrade →</span>
            )}
          </div>
        )}
      </div>

      <div className="dash-bg screen-enter">
        {/* ── INVITE SCREEN ── */}
        {screen === 'invite' && (
          <>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Name <span style={{ color: 'var(--ash)', fontWeight: 400 }}>(optional)</span></label>
              <input placeholder="Mike Reynolds" value={invName} onChange={e => setInvName(e.target.value)} />
            </div></div>
            <div className="r1" style={{ marginBottom: 16 }}><div className="f">
              <label>Email *</label>
              <input type="email" placeholder="mike@arcticclimate.ca" value={invEmail} onChange={e => setInvEmail(e.target.value)} />
            </div></div>

            <div className="sl">Role</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {ROLES.map(r => (
                <div key={r.key}
                  onClick={() => setInvRole(r.key)}
                  style={{
                    background: invRole === r.key ? 'rgba(26,26,26,.04)' : 'var(--surface)',
                    border: `1.5px solid ${invRole === r.key ? 'var(--jet)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                  <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2, lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `1.5px solid ${invRole === r.key ? 'var(--jet)' : 'var(--border)'}`,
                    background: invRole === r.key ? 'var(--jet)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff',
                  }}>
                    {invRole === r.key ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Permissions section */}
            <div className="sl" style={{ marginTop: 4 }}>Permissions</div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px', marginBottom: 20 }}>
              {[
                { key: 'estimates',  label: 'Estimates',        desc: 'Create and send quotes to clients' },
                { key: 'schedule',   label: 'Schedule',         desc: 'View and manage appointments' },
                { key: 'clients',    label: 'Clients',          desc: 'Add, edit, and view client profiles' },
                { key: 'price_list', label: 'Price List',       desc: 'View and edit product pricing' },
                { key: 'reports',    label: 'Reports',          desc: 'Access sales and revenue reports' },
                { key: 'settings',   label: 'Company Settings', desc: 'Manage branding, contracts, and billing' },
              ].map(({ key, label, desc }, i, arr) => {
                const val = invPerms[key as keyof typeof invPerms]
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>{desc}</div>
                    </div>
                    <div
                      onClick={() => setInvPerms(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      style={{ width: 38, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer', background: val ? '#2563EB' : 'rgba(53,58,62,.15)', position: 'relative', transition: 'background 0.2s' }}
                    >
                      <div style={{ position: 'absolute', top: 3, left: val ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <button className="gen-btn" onClick={sendInvite} disabled={sending}>
              {sending ? '⏳ Sending…' : '📧 Send Invite →'}
            </button>
            <button onClick={() => setScreen('list')}
              style={{ width: '100%', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--graphite)', cursor: 'pointer', marginTop: 10 }}>
              Cancel
            </button>
          </>
        )}

        {/* ── TEAM LIST SCREEN ── */}
        {screen === 'list' && (
          <>
            {/* Active members */}
            <div className="sl">Active ({members.length + 1})</div>

            {/* Owner card (you) */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--graphite)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(profile?.first_name || '?')[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>
                      {profile?.first_name} {profile?.last_name}
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(59,108,255,.1)', color: 'var(--amber)', padding: '2px 7px', borderRadius: 6 }}>YOU</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>Owner · Full access</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(59,108,255,.1)', color: 'var(--amber)', padding: '3px 8px', borderRadius: 6 }}>Owner</span>
              </div>
            </div>

            {members.map(m => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Unknown'
              const isHovered = hoveredMemberId === m.id
              return (
                <div
                  key={m.id}
                  style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, border: '1px solid var(--border-light)' }}
                  onMouseEnter={() => setHoveredMemberId(m.id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(m)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{m.email}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.08)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      {ROLES.find(r => r.key === m.member_role)?.label || 'Estimator'}
                    </span>
                    <button
                      onClick={() => setRemovingMember(m)}
                      title="Remove member"
                      style={{
                        flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: 4, borderRadius: 6, color: isHovered ? '#dc2626' : 'transparent',
                        transition: 'color 0.15s',
                      }}
                    >
                      <SIcon name="trash" size={15} />
                    </button>
                  </div>
                  {/* Permissions expand/collapse */}
                  <button
                    onClick={() => toggleExpand(m)}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 0', fontSize: 11, fontWeight: 600, color: 'var(--graphite)', cursor: 'pointer', marginBottom: 8 }}
                  >
                    {expandedMemberId === m.id ? '▲ Hide permissions' : '▼ Manage permissions'}
                  </button>

                  {expandedMemberId === m.id && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                      {PERM_LABELS.map(p => {
                        const val = pendingPerms[m.id]?.[p.key] ?? false
                        return (
                          <div
                            key={p.key}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}
                          >
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)' }}>{p.label}</div>
                              <div style={{ fontSize: 10, color: 'var(--ash)' }}>{p.desc}</div>
                            </div>
                            <div
                              onClick={() => setPendingPerms(prev => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], [p.key]: !val },
                              }))}
                              style={{
                                width: 38, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
                                background: val ? '#2563EB' : 'rgba(53,58,62,.15)',
                                position: 'relative', transition: 'background 0.2s',
                              }}
                            >
                              <div style={{
                                position: 'absolute', top: 3, left: val ? 19 : 3,
                                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                      <button
                        onClick={() => savePermissions(m.id)}
                        disabled={savingPerms === m.id}
                        style={{ width: '100%', marginTop: 10, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingPerms === m.id ? 0.6 : 1 }}
                      >
                        {savingPerms === m.id ? 'Saving…' : 'Save Permissions'}
                      </button>
                    </div>
                  )}

                </div>
              )
            })}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <>
                <div className="sl">Pending Invite ({invitations.length})</div>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ background: 'rgba(59,108,255,.06)', border: '1px solid rgba(59,108,255,.2)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,108,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>
                        {(inv.invitee_name || inv.invitee_email)[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2045B8' }}>{inv.invitee_name || inv.invitee_email}</div>
                        <div style={{ fontSize: 11, color: '#2045B8', marginTop: 1 }}>{inv.invitee_email}</div>
                        <div style={{ fontSize: 10, color: 'rgba(59,108,255,.6)', marginTop: 2 }}>
                          Sent {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(inv.created_at))} · {ROLES.find(r => r.key === inv.role)?.label || inv.role}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(59,108,255,.15)', color: 'var(--amber)', padding: '3px 8px', borderRadius: 6 }}>Pending</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => cancelInvite(inv.id)}
                        style={{ flex: 1, background: '#fff', color: '#dc2626', border: '1px solid rgba(239,68,68,.2)', borderRadius: 9, padding: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel invite
                      </button>
                      <button onClick={() => resendInvite(inv)}
                        style={{ flex: 1, background: '#fff', color: 'var(--graphite)', border: '1px solid var(--border)', borderRadius: 9, padding: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Resend invite
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Add member */}
            <div className="sl">Add Member</div>
            <div onClick={() => setScreen('invite')}
              style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, border: '2px dashed var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>+</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>Invite a team member</div>
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>
                  {plan === 'team' ? 'Unlimited seats' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} remaining on ${plan} plan`}
                </div>
              </div>
              <span style={{ color: 'var(--ash)', fontSize: 18 }}>›</span>
            </div>

            {/* Upgrade promo */}
            {plan !== 'team' && (
              <div style={{ background: 'linear-gradient(135deg,#0A0E1A,#1A2744)', borderRadius: 14, padding: 16, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>Need more seats?</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Upgrade to Team</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>Unlimited members · CA$299/mo</div>
                <button style={{ background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Upgrade Now →
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ height: 90 }} />
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
      <BottomNav />
    </div>
    </>
  )
}
