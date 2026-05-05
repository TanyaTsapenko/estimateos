'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Member {
  id: string; first_name: string | null; last_name: string | null
  email: string | null; member_role: string | null; created_at: string
}
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

  const [profile, setProfile] = useState<Profile | null>(null)
  const [myId, setMyId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<'list' | 'invite'>('list')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState('estimator')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setMyId(user.id)

      const [{ data: prof }, { data: mems }, { data: invs }] = await Promise.all([
        supabase.from('profiles').select('company_name, plan, first_name, last_name').eq('id', user.id).single(),
        supabase.from('profiles').select('id, first_name, last_name, email, member_role, created_at').eq('team_owner_id', user.id),
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
    const res = await fetch('/api/team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteeEmail: invEmail.trim(), inviteeName: invName.trim() || null, role: invRole }),
    })
    const json = await res.json()
    if (!res.ok) { showToast('⚠️ ' + (json.error || 'Failed')); setSending(false); return }
    setInvitations(p => [json.invitation, ...p])
    setInvEmail(''); setInvName(''); setInvRole('estimator')
    setScreen('list')
    showToast('📧 Invite sent to ' + invEmail.trim())
    setSending(false)
  }

  async function resendInvite(inv: Invitation) {
    const res = await fetch('/api/team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteeEmail: inv.invitee_email, inviteeName: inv.invitee_name, role: inv.role, resendId: inv.id }),
    })
    if (res.ok) showToast('📧 Invite resent to ' + inv.invitee_email)
    else showToast('⚠️ Failed to resend')
  }

  async function cancelInvite(id: string) {
    await supabase.from('team_invitations').update({ status: 'cancelled' }).eq('id', id)
    setInvitations(p => p.filter(i => i.id !== id))
    showToast('❌ Invite cancelled')
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member? They will lose access to the workspace.')) return
    await supabase.from('profiles').update({ team_owner_id: null, member_role: null }).eq('id', memberId)
    setMembers(p => p.filter(m => m.id !== memberId))
    showToast('✅ Member removed')
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

  return (
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
          <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)} · {plan === 'team' ? '∞' : `${seatsUsed}/${seatLimit}`} seats
          </div>
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
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(217,119,6,.1)', color: 'var(--amber)', padding: '2px 7px', borderRadius: 6 }}>YOU</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>Owner · Full access</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(217,119,6,.1)', color: 'var(--amber)', padding: '3px 8px', borderRadius: 6 }}>Owner</span>
              </div>
            </div>

            {members.map(m => {
              const role = ROLES.find(r => r.key === m.member_role) || ROLES[0]
              const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Unknown'
              return (
                <div key={m.id} style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials(m)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)' }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{role.label} · {m.email}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.08)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>{role.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {m.member_role === 'estimator' && (
                      <>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>Create estimates</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>E-signature</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,.06)', color: '#dc2626', padding: '3px 8px', borderRadius: 6, textDecoration: 'line-through', opacity: .6 }}>Billing</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,.06)', color: '#dc2626', padding: '3px 8px', borderRadius: 6, textDecoration: 'line-through', opacity: .6 }}>Team mgmt</span>
                      </>
                    )}
                    {m.member_role === 'manager' && (
                      <>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>View all estimates</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>Reports</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,.06)', color: '#dc2626', padding: '3px 8px', borderRadius: 6, textDecoration: 'line-through', opacity: .6 }}>Create estimates</span>
                      </>
                    )}
                    {m.member_role === 'admin' && (
                      <>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>Invoices</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>Client list</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,.06)', color: '#dc2626', padding: '3px 8px', borderRadius: 6, textDecoration: 'line-through', opacity: .6 }}>Estimates</span>
                      </>
                    )}
                    {m.member_role === 'owner' && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(53,58,62,.06)', color: 'var(--graphite)', padding: '3px 8px', borderRadius: 6 }}>All access</span>
                    )}
                  </div>
                  <button onClick={() => removeMember(m.id)}
                    style={{ width: '100%', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 9, padding: '8px 0', fontSize: 11, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                    Remove from team
                  </button>
                </div>
              )
            })}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <>
                <div className="sl">Pending Invite ({invitations.length})</div>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ background: 'rgba(217,119,6,.06)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(217,119,6,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>
                        {(inv.invitee_name || inv.invitee_email)[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{inv.invitee_name || inv.invitee_email}</div>
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>{inv.invitee_email}</div>
                        <div style={{ fontSize: 10, color: 'rgba(217,119,6,.6)', marginTop: 2 }}>
                          Sent {new Date(inv.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · {ROLES.find(r => r.key === inv.role)?.label || inv.role}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(217,119,6,.15)', color: 'var(--amber)', padding: '3px 8px', borderRadius: 6 }}>Pending</span>
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
            {canInvite ? (
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
            ) : (
              <div style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)', marginBottom: 4 }}>Seat limit reached</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>You've used all {seatLimit} seats on the {plan} plan. Upgrade to add more members.</div>
              </div>
            )}

            {/* Upgrade promo */}
            {plan !== 'team' && (
              <div style={{ background: 'linear-gradient(135deg,#1A1A1A,#353A3E)', borderRadius: 14, padding: 16, marginTop: 4 }}>
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
  )
}
