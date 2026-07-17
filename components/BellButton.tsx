'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
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

type FilterTab = 'all' | 'estimates' | 'payments' | 'team'

const ESTIMATE_TYPES = ['estimate_viewed', 'estimate_signed', 'estimate_expired', 'estimate_declined']
const PAYMENT_TYPES  = ['deposit_paid', 'final_paid']
const TEAM_TYPES     = ['team_activity', 'team_member_joined']

const C = {
  ink:       '#0B1220',
  inkMid:    '#475467',
  inkSoft:   '#8A94A6',
  hair:      'rgba(15,23,42,0.07)',
  hairStrong:'rgba(15,23,42,0.12)',
  blue:      '#2563EB',
  blueDeep:  '#1D4ED8',
  blueSoft:  '#EFF6FF',
  card:      '#FFFFFF',
  red:       '#C0341A',
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

function dayGroup(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d   = new Date(iso)
  const now = new Date()
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString())  return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return 'Earlier'
}

interface BellButtonProps {
  notifications: AppNotification[]
  unreadCount: number
  onMarkRead:    (id: string) => void
  onMarkAllRead: () => void
  onDeleteOne:   (id: string) => void
  onClearAll:    () => void
  variant?: 'light' | 'dark'
  isMobile?: boolean
}

export default function BellButton({
  notifications, unreadCount,
  onMarkRead, onMarkAllRead, onDeleteOne, onClearAll,
  variant = 'light', isMobile = false,
}: BellButtonProps) {
  const [open,   setOpen]   = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const ref    = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const btnStyle: React.CSSProperties = variant === 'dark'
    ? { background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative' }
    : { background: '#fff', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative' }

  const filtered = notifications.filter(n => {
    if (filter === 'estimates') return ESTIMATE_TYPES.includes(n.type)
    if (filter === 'payments')  return PAYMENT_TYPES.includes(n.type)
    if (filter === 'team')      return TEAM_TYPES.includes(n.type)
    return true
  })

  // Group by day: Today → Yesterday → Earlier
  const groups: { label: 'Today' | 'Yesterday' | 'Earlier'; items: AppNotification[] }[] = []
  const groupMap: Record<string, AppNotification[]> = {}
  for (const n of filtered) {
    const g = dayGroup(n.created_at)
    if (!groupMap[g]) groupMap[g] = []
    groupMap[g].push(n)
  }
  for (const label of ['Today', 'Yesterday', 'Earlier'] as const) {
    if (groupMap[label]?.length) groups.push({ label, items: groupMap[label] })
  }

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed', top: 70, left: 16, right: 16,
    maxHeight: 480,
    background: C.card, borderRadius: 14,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    zIndex: 9999,
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    width: 380, maxHeight: 480,
    background: C.card, borderRadius: 14,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    zIndex: 9999,
    display: 'flex', flexDirection: 'column',
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'estimates', label: 'Estimates' },
    { key: 'payments',  label: 'Payments'  },
    { key: 'team',      label: 'Team'      },
  ]

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Bell button */}
      <button onClick={() => setOpen(v => !v)} style={btnStyle}>
        <Bell size={18} strokeWidth={2} color={variant === 'dark' ? 'rgba(255,255,255,0.8)' : '#475569'} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#DC2626', border: '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
            fontFamily: 'inherit', padding: '0 3px', boxSizing: 'border-box',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Mobile scrim */}
      {open && isMobile && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998 }}
        />
      )}

      {/* Panel */}
      {open && (
        <div style={panelStyle}>

          {/* Header */}
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.hair}`, flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>Notifications</span>
            <button
              onClick={onMarkAllRead}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.blueDeep, fontFamily: 'inherit', padding: 0 }}
            >
              Mark all read
            </button>
          </div>

          {/* Filter pills */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.hair}`, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'background .12s, color .12s',
                  ...(filter === tab.key
                    ? { background: C.blue, color: '#fff', border: `1px solid ${C.blue}` }
                    : { background: C.card, color: C.inkMid, border: `1px solid ${C.hairStrong}` }
                  ),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: C.inkSoft, fontSize: 13 }}>
                No notifications yet
              </div>
            ) : groups.map(group => (
              <div key={group.label}>
                <div style={{ padding: '12px 16px 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkSoft }}>
                  {group.label}
                </div>
                {group.items.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id)
                      if (n.link) { setOpen(false); router.push(n.link) }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '13px 16px',
                      background: n.read ? C.card : C.blueSoft,
                      borderBottom: `1px solid ${C.hair}`,
                      cursor: n.link ? 'pointer' : 'default',
                    }}
                  >
                    {/* Unread dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: n.read ? 'transparent' : C.blue,
                    }} />

                    {/* Text block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 12, color: C.inkMid, marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>{relTime(n.created_at)}</div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteOne(n.id) }}
                      aria-label="Dismiss"
                      style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: C.card, border: `1px solid ${C.hairStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      <X size={13} strokeWidth={2.2} color={C.inkMid} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: `1px solid ${C.hair}`, flexShrink: 0 }}>
            <button
              onClick={() => { onClearAll(); setOpen(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.red, fontFamily: 'inherit' }}
            >
              Clear all
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
