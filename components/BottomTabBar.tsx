'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, FileText, Settings2 } from 'lucide-react'

const TABS = [
  { path: '/dashboard',              label: 'Home',      Icon: Home,      exact: true  },
  { path: '/dashboard/appointments', label: 'Schedule',  Icon: Calendar,  exact: false },
  { path: '/dashboard/estimates',    label: 'Estimates', Icon: FileText,  exact: false },
  { path: '/dashboard/settings',     label: 'Settings',  Icon: Settings2, exact: false },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  const router   = useRouter()

  return (
    <div className="bottom-tab-bar" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid #EEF0F4',
      padding: '8px 0',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      zIndex: 100,
    }}>
      {TABS.map(({ path, label, Icon, exact }) => {
        const active = exact ? pathname === path : pathname.startsWith(path)
        const color  = active ? '#2563EB' : '#94A3B8'
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '4px 0', background: 'transparent', border: 'none',
              cursor: 'pointer', color, fontFamily: 'inherit',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.7} color={color} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color, lineHeight: 1 }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
