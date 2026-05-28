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

  // Close on outside click (desktop)
  useEffect(() => {
    if (!open || isMobile) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, isMobile, setOpen])

  // Lock body scroll on mobile
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])

  const containerStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #E8ECF2',
    boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
    overflow: 'hidden',
    fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
  }

  const btnStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 14,
    background: isMobile ? 'rgba(255,255,255,0.15)' : '#fff',
    border: isMobile ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(15,23,42,0.10)',
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

      {open && isMobile && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position: 'fixed', top: 60, left: 16, right: 16, zIndex: 9999,
            maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
            ...containerStyle,
          }}>
            <NotifDropdown
              notifs={notifs}
              onClose={() => setOpen(false)}
              markOneRead={markOneRead}
              markAllRead={markAllRead}
              clearAll={clearAll}
            />
          </div>
        </>
      )}

      {open && !isMobile && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, left: 'auto',
          width: 296, zIndex: 9999,
          maxHeight: 480, overflowY: 'auto',
          ...containerStyle,
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
