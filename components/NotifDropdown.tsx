'use client'

import { useRouter } from 'next/navigation'
import type { Notif } from '@/hooks/useNotifications'

function notifIcon(type: string) {
  const icons: Record<string, { bg: string; stroke: string; svg: React.ReactNode }> = {
    estimate_signed:   { bg: '#DCFCE7', stroke: '#16A34A', svg: <polyline points="5,12 10,17 19,8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> },
    estimate_declined: { bg: '#FEE2E2', stroke: '#C0341A', svg: <><line x1="18" y1="6" x2="6" y2="18" strokeWidth={2} strokeLinecap="round" /><line x1="6" y1="6" x2="18" y2="18" strokeWidth={2} strokeLinecap="round" /></> },
    estimate_viewed:   { bg: '#EFF4FF', stroke: '#2563EB', svg: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth={2} strokeLinecap="round" /><circle cx="12" cy="12" r="3" strokeWidth={2} /></> },
    invoice_overdue:   { bg: '#FEF3C7', stroke: '#D97706', svg: <><circle cx="12" cy="12" r="10" strokeWidth={2} /><line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} strokeLinecap="round" /></> },
    estimate_expired:  { bg: 'rgba(100,116,139,0.1)', stroke: '#64748B', svg: <><circle cx="12" cy="12" r="10" strokeWidth={2} /><polyline points="12,6 12,12 16,14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></> },
  }
  const cfg = icons[type] ?? { bg: '#EFF4FF', stroke: '#2563EB', svg: <circle cx="12" cy="12" r="4" strokeWidth={2} /> }
  return (
    <div style={{ width: 34, height: 34, borderRadius: 9, background: cfg.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={cfg.stroke}>{cfg.svg}</svg>
    </div>
  )
}

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
  style?: React.CSSProperties
}

export default function NotifDropdown({ notifs, onClose, markOneRead, markAllRead, clearAll, style }: Props) {
  const router = useRouter()
  const hasUnread = notifs.some(n => !n.read)

  function handleNav(n: Notif) {
    if (n.link) router.push(n.link)
    onClose()
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 440,
      margin: '0 auto',
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.06)',
      boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
      ...style,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Notifications</span>
        {hasUnread && (
          <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {notifs.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#8A94A6' }}>No notifications yet.</div>
      ) : notifs.map(n => (
        <div
          key={n.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            background: n.read ? '#FAFAFA' : '#fff', borderBottom: '1px solid #EEF0F4',
          }}
        >
          {/* Unread dot */}
          <div style={{ width: 6, flexShrink: 0 }}>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#2563EB' }} />}
          </div>

          {/* Icon + text — clickable to navigate */}
          <div
            onClick={() => handleNav(n)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0, cursor: n.link ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLElement).style.opacity = '0.8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            {notifIcon(n.type)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: n.read ? '#475467' : '#0B1220', lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#475467', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: '#B3BAC6', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
            </div>
          </div>

          {/* × dismiss button */}
          <button
            onClick={e => { e.stopPropagation(); markOneRead(n.id) }}
            title="Mark as read"
            style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#B3BAC6', fontSize: 14, lineHeight: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B3BAC6' }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Footer — Clear all */}
      {notifs.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #EEF0F4', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={clearAll}
            style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8' }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
