'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useRole } from '@/lib/useRole'

const ALL_ITEMS = [
  { path: '/dashboard',              label: 'Home',    icon: '🏠', exact: true,  ownerOnly: false },
  { path: '/dashboard/estimates',    label: 'Jobs',    icon: '📋', exact: false, ownerOnly: false },
  { path: '/dashboard/appointments', label: 'Appts',   icon: '📅', exact: false, ownerOnly: false },
  { path: '/dashboard/reports',      label: 'Reports', icon: '📊', exact: false, ownerOnly: true  },
  { path: '/dashboard/settings',     label: 'Settings',icon: '⚙️', exact: false, ownerOnly: true  },
]

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()
  const { role, loading } = useRole()

  const items = !loading && role === 'estimator'
    ? ALL_ITEMS.filter(i => !i.ownerOnly)
    : ALL_ITEMS

  return (
    <div className="bot-nav">
      {items.map(item => {
        const active = item.exact ? path === item.path : path.startsWith(item.path)
        return (
          <div key={item.path} className={`ni${active ? ' on' : ''}`} onClick={() => router.push(item.path)}>
            <div className="ni-ic">{item.icon}</div>
            <div className="ni-lb" style={active ? { color: 'var(--amber)' } : {}}>{item.label}</div>
            {active && <div className="ni-dot" />}
          </div>
        )
      })}
    </div>
  )
}
