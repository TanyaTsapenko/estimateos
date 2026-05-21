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
  markAllRead: () => void
  /** CSS positioning for the panel box itself */
  style?: React.CSSProperties
}

export default function NotifDropdown({ notifs, onClose, markAllRead, style }: Props) {
  const router = useRouter()
  return (
    <div style={{
      width: 'min(340px, calc(100vw - 32px))',
      maxHeight: 'min(480px, calc(100vh - 120px))',
      overflowY: 'auto',
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.06)',
      boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
      fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
      zIndex: 100,
      ...style,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Notifications</span>
        {notifs.some(n => !n.read) && (
          <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {notifs.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#8A94A6' }}>No notifications yet.</div>
      ) : notifs.map(n => (
        <button
          key={n.id}
          onClick={() => { if (n.link) router.push(n.link); onClose() }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
            background: n.read ? '#FAFAFA' : '#fff', borderBottom: '1px solid #EEF0F4',
            width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit',
            cursor: n.link ? 'pointer' : 'default',
          }}
          onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLElement).style.background = '#F1F5FF' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? '#FAFAFA' : '#fff' }}
        >
          {!n.read && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#2563EB', flexShrink: 0, marginTop: 6 }} />}
          {n.read  && <div style={{ width: 6, flexShrink: 0 }} />}
          {notifIcon(n.type)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: n.read ? '#475467' : '#0B1220', lineHeight: 1.3 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: '#475467', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
            <div style={{ fontSize: 11, color: '#B3BAC6', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
