'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notif {
  id: string; type: string; title: string; body: string; read: boolean; created_at: string; link: string | null
}

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

export default function NotificationsPanel() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.read).length

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('id,type,title,body,read,created_at,link')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setNotifs(data)
      supabase.channel('notifs-global')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifs(prev => [payload.new as Notif, ...prev].slice(0, 20))
        )
        .subscribe()
    }
    load()
    return () => { createClient().channel('notifs-global').unsubscribe() }
  }, [])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      }
    }
  }

  async function markAllRead() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  return (
    <div ref={ref} style={{
      position: 'fixed',
      top: 'max(12px, calc(env(safe-area-inset-top) + 8px))',
      right: 16,
      zIndex: 1000,
    }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', width: 36, height: 36,
          background: '#fff', border: '1px solid #E2E5EA',
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(10,22,40,0.08)',
        }}
      >
        <Bell size={15} strokeWidth={1.7} color="#475569" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            minWidth: 7, height: 7,
            background: '#DC2626', borderRadius: 999,
            border: '1.5px solid #fff',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.06)',
          boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
          fontFamily: '-apple-system, "SF Pro Text", "Inter", sans-serif',
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
              onClick={() => { if (n.link) router.push(n.link); setOpen(false) }}
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
              {n.read && <div style={{ width: 6, flexShrink: 0 }} />}
              {notifIcon(n.type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: n.read ? '#475467' : '#0B1220', lineHeight: 1.3 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#475467', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: '#B3BAC6', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
