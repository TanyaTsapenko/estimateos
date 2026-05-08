'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/useRole'
import { useEffect, useState } from 'react'
import { SIcon } from './SIcon'
import type { IconName } from './SIcon'

const ALL_ITEMS: { path: string; label: string; icon: IconName; exact: boolean; ownerOnly: boolean }[] = [
  { path: '/dashboard',              label: 'Dashboard',    icon: 'zap',      exact: true,  ownerOnly: false },
  { path: '/dashboard/estimates',    label: 'Estimates',    icon: 'pdf',      exact: false, ownerOnly: false },
  { path: '/dashboard/appointments', label: 'Appointments', icon: 'bell',     exact: false, ownerOnly: false },
  { path: '/dashboard/clients',      label: 'Clients',      icon: 'user',     exact: false, ownerOnly: false },
  { path: '/dashboard/reports',      label: 'Reports',      icon: 'external', exact: false, ownerOnly: true  },
  { path: '/dashboard/invoices',     label: 'Invoices',     icon: 'invoice',  exact: false, ownerOnly: true  },
  { path: '/dashboard/settings',     label: 'Settings',     icon: 'settings', exact: false, ownerOnly: true  },
]

export default function Sidebar() {
  const router   = useRouter()
  const path     = usePathname()
  const supabase = createClient()
  const { role, loading } = useRole()
  const [userName, setUserName] = useState('')
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserName(user.email?.split('@')[0] || '')
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
      if (prof?.first_name) setFirstName([prof.first_name, prof.last_name].filter(Boolean).join(' '))
    })
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const items = !loading && role === 'estimator'
    ? ALL_ITEMS.filter(i => !i.ownerOnly)
    : ALL_ITEMS

  const displayName = firstName || userName || '…'
  const initial = displayName[0]?.toUpperCase() || '?'
  const roleLabel = loading ? '' : (role === 'estimator' ? 'Estimator' : 'Owner')

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: '4px 8px 28px', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>
        Estimate<span style={{ color: '#3B82F6' }}>OS</span>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {items.map(item => {
          const active = item.exact ? path === item.path : path.startsWith(item.path)
          return (
            <div key={item.path} className={`sb-item${active ? ' active' : ''}`} onClick={() => router.push(item.path)}>
              <span className="sb-ic">
                <SIcon name={item.icon} size={15} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className="sb-lb">{item.label}</span>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,.25)', color: '#93c5fd', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            {roleLabel && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>{roleLabel}</div>}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', padding: 4, display: 'flex', alignItems: 'center', transition: 'color .15s', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
          >
            <SIcon name="logout" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
