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

export default function NotifDropdown({ notifs, onClose, markOneRead, markAllRead }: Props) {
  const router = useRouter()
  const hasUnread = notifs.some(n => !n.read)

  function handleNav(n: Notif) {
    markOneRead(n.id)
    if (n.link) router.push(n.link)
    onClose()
  }

  return (
    <div style={{ fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', borderBottom: '1px solid #F1F3F7',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
        {hasUnread && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: 11, fontWeight: 600, color: '#94A3B8',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontFamily: 'inherit',
            }}
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
        <div>
          {notifs.map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 16px',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              {/* Unread dot / spacer */}
              {!n.read
                ? <div style={{ width: 7, height: 7, background: '#2563EB', borderRadius: '50%', flexShrink: 0, marginTop: 5 }} />
                : <div style={{ width: 7, flexShrink: 0 }} />
              }

              {/* Content */}
              <div
                onClick={() => handleNav(n)}
                style={{ flex: 1, minWidth: 0, cursor: n.link ? 'pointer' : 'default' }}
              >
                <div style={{
                  fontSize: 12,
                  fontWeight: n.read ? 500 : 600,
                  color: n.read ? '#64748B' : '#0F172A',
                  lineHeight: 1.35,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{
                    fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>

              {/* Dismiss */}
              <button
                onClick={e => { e.stopPropagation(); markOneRead(n.id) }}
                title="Dismiss"
                style={{
                  flexShrink: 0, background: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#CBD5E1', fontSize: 16, lineHeight: 1,
                  padding: '1px 2px', fontFamily: 'inherit',
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
      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F3F7', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            fontSize: 11, fontWeight: 600, color: '#2563EB',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          View all notifications
        </button>
      </div>

    </div>
  )
}
