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
  const [displayName, setDisplayName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
      const name = prof ? [prof.first_name, prof.last_name].filter(Boolean).join(' ') : user.email?.split('@')[0] || ''
      setDisplayName(name)
    })
  }, [])

  useEffect(() => {
    if (!loading) setRoleLabel(role === 'estimator' ? 'Estimator' : 'Owner')
  }, [role, loading])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const items = !loading && role === 'estimator'
    ? ALL_ITEMS.filter(i => !i.ownerOnly)
    : ALL_ITEMS

  const initial = displayName[0]?.toUpperCase() || '?'

  return (
    <div style={{
      width: 232,
      background: '#0A1628',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ padding: '22px 22px 26px', fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
        Estimate<span style={{ color: '#3B82F6' }}>OS</span>
      </div>
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const active = item.exact ? path === item.path : path.startsWith(item.path)
          return (
            <div
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                fontSize: 14, fontWeight: active ? 600 : 500, cursor: 'pointer',
              }}
            >
              <SIcon name={item.icon} size={17} strokeWidth={active ? 2.2 : 1.7} />
              {item.label}
            </div>
          )
        })}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName || '…'}</div>
          {roleLabel && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{roleLabel} · Pro</div>}
        </div>
        <button onClick={logout} title="Sign out"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
          <SIcon name="logout" size={15} />
        </button>
      </div>
    </div>
  )
}
