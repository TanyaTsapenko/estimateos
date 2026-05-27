'use client'

import { useRef, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotifDropdown from './NotifDropdown'

export default function BellButton() {
  const { notifs, unread, open, setOpen, openPanel, markOneRead, markAllRead, clearAll } = useNotifications()
  const ref = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setOpen])

  const btnStyle: React.CSSProperties = isMobile
    ? {
        width: 40, height: 40, borderRadius: 14,
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
      }
    : {
        width: 40, height: 40, borderRadius: 14,
        background: '#fff', border: '1px solid rgba(15,23,42,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
      }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => open ? setOpen(false) : openPanel()} style={btnStyle}>
        <Bell size={20} strokeWidth={2} color={isMobile ? '#fff' : '#475569'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 8, height: 8, background: '#FF4B4B',
            borderRadius: 999,
            border: `1.5px solid ${isMobile ? '#2045B8' : '#fff'}`,
          }} />
        )}
      </button>

      {/* Backdrop — closes panel on tap/click anywhere outside */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }}
        />
      )}

      {/* Panel — always fixed so it doesn't scroll with the page */}
      {open && (
        <div style={{
          position: 'fixed', top: 70, left: 16, right: 16, width: 'auto',
          zIndex: 999, maxHeight: '70vh', overflowY: 'auto', borderRadius: 20,
        }}>
          <NotifDropdown notifs={notifs} onClose={() => setOpen(false)} markOneRead={markOneRead} markAllRead={markAllRead} clearAll={clearAll} />
        </div>
      )}
    </div>
  )
}
