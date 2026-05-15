'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, FileText, Settings2, Plus } from 'lucide-react'

const LEFT_TABS = [
  { path: '/dashboard',              label: 'Home',     Icon: Home,     exact: true  },
  { path: '/dashboard/appointments', label: 'Schedule', Icon: Calendar, exact: false },
]
const RIGHT_TABS = [
  { path: '/dashboard/estimates', label: 'Estimates', Icon: FileText,  exact: false },
  { path: '/dashboard/settings',  label: 'Settings',  Icon: Settings2, exact: false },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  const router   = useRouter()

  const renderTab = ({ path, label, Icon, exact }: typeof LEFT_TABS[0]) => {
    const active = exact ? pathname === path : pathname.startsWith(path)
    const color  = active ? '#2563EB' : '#9CA3AF'
    return (
      <button
        key={path}
        onClick={() => router.push(path)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4, background: 'transparent', border: 'none',
          cursor: 'pointer', color, fontFamily: 'inherit', height: '100%',
        }}
      >
        <Icon size={22} strokeWidth={1.7} color={color} />
        <span style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1 }}>
          {label}
        </span>
      </button>
    )
  }

  return (
    <div className="bottom-tab-bar" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 64, background: '#fff',
      borderTop: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50,
    }}>
      {LEFT_TABS.map(renderTab)}

      {/* Center FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          onClick={() => router.push('/dashboard/appointments/new')}
          style={{
            position: 'relative', top: -20,
            width: 56, height: 56, borderRadius: '50%',
            background: '#2563EB', color: '#fff', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', flexShrink: 0,
          }}
        >
          <Plus size={24} strokeWidth={2.5} color="#fff" />
        </button>
      </div>

      {RIGHT_TABS.map(renderTab)}
    </div>
  )
}
