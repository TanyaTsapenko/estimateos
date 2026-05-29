'use client'

import { useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotifDropdown from './NotifDropdown'

export default function BellButton() {
  const { notifs, unread, open, setOpen, openPanel, markOneRead, markAllRead, clearAll } = useNotifications()
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
          width: 40, height: 40, borderRadius: 14,
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
        }}
      >
        <Bell size={20} strokeWidth={2} color="#475569" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 8, height: 8, background: '#FF4B4B',
            borderRadius: 999, border: '1.5px solid #fff',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 70, right: 16,
          width: 320, zIndex: 9999,
          maxHeight: 480, overflowY: 'auto',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E8ECF2',
          boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
          overflow: 'hidden',
          fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
        }}>
          <NotifDropdown
            notifs={notifs}
            onClose={() => setOpen(false)}
            markOneRead={markOneRead}
            markAllRead={markAllRead}
            clearAll={clearAll}
          />
        </div>
      )}
    </div>
  )
}
