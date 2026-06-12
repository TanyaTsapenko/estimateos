'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  link?: string | null
  created_at: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

interface BellButtonProps {
  notifications: AppNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  variant?: 'light' | 'dark'
}

export default function BellButton({ notifications, onMarkRead, onMarkAllRead, variant = 'light' }: BellButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const btnStyle = variant === 'dark'
    ? { background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 as const, position: 'relative' as const }
    : { background: '#fff', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 as const, position: 'relative' as const }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={btnStyle}>
        <Bell size={18} strokeWidth={2} color={variant === 'dark' ? 'rgba(255,255,255,0.8)' : '#475569'} />
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#DC2626', border: '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
            fontFamily: 'inherit', padding: '0 3px', boxSizing: 'border-box' as const,
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 40px rgba(10,22,40,0.18), 0 0 0 1px rgba(10,22,40,0.08)',
          zIndex: 9999,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={onMarkAllRead}
                style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No notifications yet
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) onMarkRead(n.id)
                if (n.link) { setOpen(false); router.push(n.link) }
              }}
              style={{
                padding: '12px 16px',
                background: n.read ? '#fff' : '#EFF6FF',
                borderBottom: '1px solid #F1F5F9',
                cursor: n.link ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = n.read ? '#F8FAFC' : '#DBEAFE' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.read ? '#fff' : '#EFF6FF' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', lineHeight: 1.4, flex: 1 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginTop: 1 }}>{relTime(n.created_at)}</div>
              </div>
              {n.body && <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>{n.body}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
