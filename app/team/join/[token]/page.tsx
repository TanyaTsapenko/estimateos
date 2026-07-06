'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'
import { Clock, Mail, Users, CheckCircle2, Check } from 'lucide-react'

interface Invite {
  invitee_email: string
  invitee_name: string | null
  role: string
}

const ROLE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  owner:     { label: 'Owner',             desc: 'Full access — estimates, billing, team management', icon: '👑' },
  estimator: { label: 'Sales', desc: 'Create estimates, visit clients, collect signatures',  icon: '📋' },
  manager:   { label: 'Manager',           desc: 'View all estimates and reports, read-only access',     icon: '📊' },
  admin:     { label: 'Office Admin',      desc: 'Invoices and client list only',                        icon: '🧾' },
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<Invite | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(false)

  // Registration form state
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: { user: u } }, invRes] = await Promise.all([
        supabase.auth.getUser(),
        fetch(`/api/public/invite/${encodeURIComponent(token)}`),
      ])
      setUser(u)
      if (!invRes.ok) { setExpired(true); setLoading(false); return }
      const invData = await invRes.json()
      setInvite({ invitee_email: invData.inviteeEmail, invitee_name: invData.inviteeName ?? null, role: invData.role })
      setOwnerName(invData.companyName || 'the team')
      if (invData.inviteeName) setFirstName(invData.inviteeName.split(' ')[0])
      setLoading(false)
    }
    load()
  }, [token])

  async function accept(overrideToken?: string) {
    setAccepting(true); setError('')
    const res = await fetch('/api/team-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: overrideToken || token }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Failed to join'); setAccepting(false); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1800)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return }
    setRegistering(true); setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: invite.invitee_email,
      password,
      options: {
        data: { first_name: firstName || invite.invitee_name || '' },
      },
    })

    if (signUpError) { setError(signUpError.message); setRegistering(false); return }

    if (data.session) {
      // Auto-confirmed — accept invite immediately
      setUser(data.user as { id: string; email?: string })
      await accept()
    } else {
      // Email confirmation required — tell user to check email
      setCheckEmail(true)
      setRegistering(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><ApexScaleLogo theme="dark" size={28} /></div></div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ color: 'var(--ash)', fontSize: 13 }}>Loading invite…</div>
      </div>
    </div>
  )

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (expired) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top"><ApexScaleLogo theme="dark" size={28} /></div>
        <div className="h-title">
          <div className="h-eye">Team Invite</div>
          <div className="h-big">Link expired</div>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Clock size={48} color="#94a3b8" /></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)', marginBottom: 8 }}>This invite has expired or been used</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>Ask the team owner to send you a new invite.</div>
        <button className="gen-btn" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => router.push('/auth')}>Go to Sign In →</button>
      </div>
    </div>
  )

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top"><ApexScaleLogo theme="dark" size={28} /></div>
        <div className="h-title">
          <div className="h-eye">You're in!</div>
          <div className="h-big">Welcome</div>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><CheckCircle2 size={48} color="#16a34a" /></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)', marginBottom: 8 }}>You've joined {ownerName}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Taking you to your dashboard…</div>
      </div>
    </div>
  )

  // ── Check email ───────────────────────────────────────────────────────────────
  if (checkEmail) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top"><ApexScaleLogo theme="dark" size={28} /></div>
        <div className="h-title">
          <div className="h-eye">Almost there</div>
          <div className="h-big">Check your email</div>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Mail size={48} color="#2563eb" /></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)', marginBottom: 8 }}>Verify your email</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>
          We sent a confirmation link to <strong>{invite?.invitee_email}</strong>.
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          After verifying, come back to this invite link to complete joining {ownerName}.
        </div>
      </div>
    </div>
  )

  const roleInfo = ROLE_LABELS[invite?.role || 'estimator'] || ROLE_LABELS.estimator

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top"><ApexScaleLogo theme="dark" size={28} /></div>
        <div className="h-title">
          <div className="h-eye">Team Invite</div>
          <div className="h-big">You're invited</div>
          <div className="h-sub">{ownerName}</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Users size={48} color="#2563eb" /></div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--jet)', marginBottom: 6 }}>
            {invite?.invitee_name ? `Hi ${invite.invitee_name}!` : 'Hey there!'}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            <strong>{ownerName}</strong> has invited you to join their ApexScale workspace.
          </div>
        </div>

        <div style={{ background: 'rgba(59,108,255,.06)', border: '1.5px solid rgba(59,108,255,.2)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2045B8', marginBottom: 8 }}>Your Role</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>{roleInfo.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--jet)' }}>{roleInfo.label}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{roleInfo.desc}</div>
            </div>
          </div>
        </div>

        {/* Already logged in */}
        {user ? (
          <>
            <div className="info-box" style={{ marginBottom: 16 }}>
              Signed in as <strong>{user.email}</strong>. Click accept to join {ownerName}.
            </div>
            <button className="gen-btn" onClick={() => accept()} disabled={accepting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {accepting ? 'Joining…' : <><Check size={15} />{`Accept & Join ${ownerName}`}</>}
            </button>
          </>
        ) : (
          /* Inline registration form */
          <form onSubmit={handleRegister}>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Your name <span style={{ color: 'var(--ash)', fontWeight: 400 }}>(optional)</span></label>
              <input
                placeholder={invite?.invitee_name || 'First name'}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div></div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Email</label>
              <input
                value={invite?.invitee_email || ''}
                readOnly
                style={{ background: 'var(--surface)', color: 'var(--ash)', cursor: 'not-allowed' }}
              />
            </div></div>
            <div className="r1" style={{ marginBottom: 20 }}><div className="f">
              <label>Create a password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div></div>
            <button type="submit" className="gen-btn" disabled={registering} style={{ marginBottom: 10 }}>
              {registering ? 'Creating account…' : `Create Account & Join ${ownerName} →`}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/auth/login?next=/team/join/${token}`)}
              style={{ width: '100%', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--graphite)', cursor: 'pointer' }}>
              Already have an account? Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
