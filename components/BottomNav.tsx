'use client'
import { useRouter, usePathname } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import type { Permissions } from '@/lib/usePermissions'
import { SIcon } from './SIcon'
import type { IconName } from './SIcon'

const ALL_ITEMS: { path: string; label: string; icon: IconName; exact: boolean; permKey?: keyof Permissions; ownerOnly?: boolean }[] = [
  { path: '/dashboard',              label: 'Home',     icon: 'home',     exact: true  },
  { path: '/dashboard/appointments', label: 'Schedule', icon: 'calendar', exact: false, permKey: 'schedule' },
  { path: '/dashboard/estimates',    label: 'Estimates',icon: 'contract', exact: false, permKey: 'estimates' },
  { path: '/dashboard/settings',     label: 'Settings', icon: 'settings', exact: false, permKey: 'settings' },
]

export default function BottomNav() {
  const router = useRouter()
  const path   = usePathname()
  const { role, permissions, loading } = usePermissions()

  const items = loading ? ALL_ITEMS : ALL_ITEMS.filter(i => {
    if (i.ownerOnly && role !== 'owner') return false
    if (i.permKey && !permissions[i.permKey]) return false
    return true
  })

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
