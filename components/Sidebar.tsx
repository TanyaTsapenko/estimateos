'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/useRole'
import { useEffect, useState } from 'react'

const ALL_ITEMS = [
  { path: '/dashboard',              label: 'Dashboard',    icon: '🏠', exact: true,  ownerOnly: false },
  { path: '/dashboard/estimates',    label: 'Estimates',    icon: '📋', exact: false, ownerOnly: false },
  { path: '/dashboard/appointments', label: 'Appointments', icon: '📅', exact: false, ownerOnly: false },
  { path: '/dashboard/reports',      label: 'Reports',      icon: '📊', exact: false, ownerOnly: true  },
  { path: '/dashboard/invoices',     label: 'Invoices',     icon: '🧾', exact: false, ownerOnly: true  },
  { path: '/dashboard/settings',     label: 'Settings',     icon: '⚙️', exact: false, ownerOnly: true  },
]

export default function Sidebar() {
  const router = useRouter()
  const path = usePathname()
  const supabase = createClient()
  const { role, loading } = useRole()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserName(user.email.split('@')[0])
    })
  }, [])

  const items = !loading && role === 'estimator'
    ? ALL_ITEMS.filter(i => !i.ownerOnly)
    : ALL_ITEMS

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="sidebar">
      <div className="sb-logo">
        Estimate<span style={{ color: 'var(--blue)' }}>OS</span>
      </div>

      <nav className="sb-nav">
        {items.map(item => {
          const active = item.exact ? path === item.path : path.startsWith(item.path)
          return (
            <div
              key={item.path}
              className={`sb-item${active ? ' active' : ''}`}
              onClick={() => router.push(item.path)}
            >
              <span className="sb-ic">{item.icon}</span>
              <span className="sb-lb">{item.label}</span>
            </div>
          )
        })}
      </nav>

      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">{userName ? userName[0].toUpperCase() : '?'}</div>
          <div className="sb-uname">{userName || '…'}</div>
        </div>
        <button className="sb-logout" onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}
