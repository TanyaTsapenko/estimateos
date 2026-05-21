'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, FileText, Settings2, Plus, Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotifDropdown from './NotifDropdown'

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
  const { notifs, unread, open, setOpen, openPanel, markAllRead } = useNotifications()
  const bellRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setOpen])

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
        <span style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1 }}>{label}</span>
      </button>
    )
  }

  return (
    <>
      {/* Overlay when bell panel is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            bottom: 'calc(64px + env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.3)', zIndex: 49,
          }}
        />
      )}

      <div className="bottom-tab-bar" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom))', background: '#fff',
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

        {/* Bell tab */}
        <div ref={bellRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', height: '100%' }}>
          <button
            onClick={() => open ? setOpen(false) : openPanel()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', color: open ? '#2563EB' : '#9CA3AF',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Bell size={22} strokeWidth={1.7} color={open ? '#2563EB' : '#9CA3AF'} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -4,
                  minWidth: 14, height: 14, padding: '0 3px',
                  background: '#DC2626', borderRadius: 999,
                  border: '1.5px solid #fff',
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1 }}>Alerts</span>
          </button>

          {/* Panel opens upward from bell */}
          {open && (
            <div style={{
              position: 'fixed',
              bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)',
              right: 8,
              zIndex: 50,
            }}>
              <NotifDropdown
                notifs={notifs}
                onClose={() => setOpen(false)}
                markAllRead={markAllRead}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
