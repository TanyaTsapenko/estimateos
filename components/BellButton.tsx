'use client'

import { useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotifDropdown from './NotifDropdown'

export default function BellButton() {
  const { notifs, unread, open, setOpen, openPanel, markAllRead } = useNotifications()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setOpen])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => open ? setOpen(false) : openPanel()}
        style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#fff', border: '1px solid rgba(15,23,42,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
        }}
      >
        <Bell size={20} strokeWidth={1.7} color="#475569" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            width: 8, height: 8, background: '#DC2626',
            borderRadius: 999, border: '1.5px solid #fff',
          }} />
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100 }}>
          <NotifDropdown notifs={notifs} onClose={() => setOpen(false)} markAllRead={markAllRead} />
        </div>
      )}
    </div>
  )
}
