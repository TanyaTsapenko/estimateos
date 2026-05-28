'use client'

import { useRouter } from 'next/navigation'
import type { Notif } from '@/hooks/useNotifications'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  notifs: Notif[]
  onClose: () => void
  markOneRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

export default function NotifDropdown({ notifs, onClose, markOneRead, markAllRead, clearAll }: Props) {
  const router = useRouter()
  const hasUnread = notifs.some(n => !n.read)

  function handleNav(n: Notif) {
    markOneRead(n.id)
    if (n.link) router.push(n.link)
    onClose()
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #E8ECF2',
      boxShadow: '0 8px 32px rgba(15,23,42,0.10)',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
        {hasUnread && (
          <button
            onClick={markAllRead}
            style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {notifs.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
          No notifications yet.
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifs.map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px',
                borderBottom: '1px solid #F8FAFC',
                background: n.read ? '#fff' : '#FAFBFF',
              }}
            >
              {/* Unread dot / placeholder */}
              <div style={{ width: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!n.read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB' }} />
                )}
              </div>

              {/* Text — clickable */}
              <div
                onClick={() => handleNav(n)}
                style={{ flex: 1, minWidth: 0, cursor: n.link ? 'pointer' : 'default' }}
              >
                <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 600, color: n.read ? '#64748B' : '#0F172A', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>{timeAgo(n.created_at)}</div>
              </div>

              {/* × dismiss */}
              <button
                onClick={e => { e.stopPropagation(); markOneRead(n.id) }}
                title="Dismiss"
                style={{
                  flexShrink: 0, background: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#CBD5E1', fontSize: 15, lineHeight: 1,
                  padding: '2px 4px', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#CBD5E1' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}
