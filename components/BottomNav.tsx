'use client'
import { useRouter, usePathname } from 'next/navigation'

const items = [
  { path: '/dashboard',                label: 'Home',   icon: '🏠', exact: true },
  { path: '/dashboard/estimates',      label: 'Jobs',   icon: '📋', exact: false },
  { path: '/dashboard/appointments',   label: 'Appts',  icon: '📅', exact: false },
  { path: '/dashboard/reports',        label: 'Reports',icon: '📊', exact: false },
  { path: '/dashboard/settings',       label: 'Settings',icon: '⚙️', exact: false },
]

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()

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
