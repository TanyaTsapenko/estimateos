'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import { SIcon } from './SIcon'
import type { IconName } from './SIcon'

const ALL_ITEMS: { path: string; label: string; icon: IconName; exact: boolean; ownerOnly: boolean }[] = [
  { path: '/dashboard',              label: 'Home',     icon: 'zap',      exact: true,  ownerOnly: false },
  { path: '/dashboard/estimates',    label: 'Jobs',     icon: 'pdf',      exact: false, ownerOnly: false },
  { path: '/dashboard/appointments', label: 'Appts',    icon: 'bell',     exact: false, ownerOnly: false },
  { path: '/dashboard/reports',      label: 'Reports',  icon: 'external', exact: false, ownerOnly: true  },
  { path: '/dashboard/settings',     label: 'Settings', icon: 'settings', exact: false, ownerOnly: true  },
]

export default function BottomNav() {
  const router = useRouter()
  const path   = usePathname()
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
            <div className="ni-ic" style={{ color: active ? 'var(--blue)' : 'var(--ash)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SIcon name={item.icon} size={18} strokeWidth={active ? 2.2 : 1.7} />
            </div>
            <div className="ni-lb" style={active ? { color: 'var(--blue)' } : {}}>{item.label}</div>
            {active && <div className="ni-dot" />}
          </div>
        )
      })}
    </div>
  )
}
