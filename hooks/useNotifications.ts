'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notif {
  id: string; type: string; title: string; body: string
  read: boolean; created_at: string; link: string | null
}

export function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
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
      supabase.channel('notifs-hook')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => setNotifs(prev => [payload.new as Notif, ...prev].slice(0, 20)))
        .subscribe()
    }
    load()
    return () => { createClient().channel('notifs-hook').unsubscribe() }
  }, [])

  async function markAllRead() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function openPanel() {
    setOpen(true)
    if (unread > 0) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      }
    }
  }

  return { notifs, unread, open, setOpen, openPanel, markAllRead }
}
