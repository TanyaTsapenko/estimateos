'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/usePermissions'
import type { Permissions } from '@/lib/usePermissions'
import { useEffect, useState } from 'react'
import { SIcon } from './SIcon'

import type { IconName } from './SIcon'
import { ApexScaleLogo, ApexMark } from './ApexScaleLogo'

const ALL_ITEMS: { path: string; label: string; icon: IconName; exact: boolean; permKey?: keyof Permissions; ownerOnly?: boolean }[] = [
  { path: '/dashboard',              label: 'Dashboard',    icon: 'home',      exact: true  },
  { path: '/dashboard/estimates',    label: 'Estimates',    icon: 'contract',  exact: false, permKey: 'estimates' },
  { path: '/dashboard/appointments', label: 'Appointments', icon: 'calendar',  exact: false, permKey: 'schedule' },
  { path: '/dashboard/clients',      label: 'Clients',      icon: 'team',      exact: false, permKey: 'clients' },
  { path: '/dashboard/reports',      label: 'Reports',      icon: 'bar-chart', exact: false, permKey: 'reports' },
  { path: '/dashboard/invoices',     label: 'Invoices',     icon: 'invoice',   exact: false, ownerOnly: true },
  { path: '/dashboard/settings',     label: 'Settings',     icon: 'settings2', exact: false, permKey: 'settings' },
]

export default function Sidebar() {
  const router   = useRouter()
  const path     = usePathname()
  const supabase = createClient()
  const { role, permissions, loading } = usePermissions()
  const [displayName, setDisplayName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
      const name = prof ? [prof.first_name, prof.last_name].filter(Boolean).join(' ') : user.email?.split('@')[0] || ''
      setDisplayName(name)
    })
  }, [])

  useEffect(() => {
    if (!loading) setRoleLabel(role === 'estimator' ? 'Estimator' : 'Owner')
  }, [role, loading])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const items = loading ? ALL_ITEMS : ALL_ITEMS.filter(i => {
    if (i.ownerOnly && role !== 'owner') return false
    if (i.permKey && !permissions[i.permKey]) return false
    return true
  })

  const parts = displayName.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  return (
    <div style={{
      width: collapsed ? 64 : 232,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      background: '#0A1628',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    }}>

      {/* Wordmark */}
      <div style={{
        padding: collapsed ? '24px 0 20px' : '24px 20px 20px',
        fontSize: 18, fontWeight: 700, letterSpacing: -0.3,
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && <ApexScaleLogo theme="dark" size={28} />}
        {collapsed && <ApexMark theme="dark" size={24} />}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const active = item.exact ? path === item.path : path.startsWith(item.path)
          return (
            <div
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: active ? '#2563EB' : 'transparent',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <SIcon name={item.icon} size={20} strokeWidth={1.7} />
              {!collapsed && item.label}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          onClick={toggleCollapse}
          style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', padding: '6px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          <SIcon name='chevron-r' size={15} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* User block */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {!collapsed ? (
          <>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#2563EB',
              color: '#fff', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || '…'}
              </div>
              {roleLabel && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                  {roleLabel} · Pro Plan
                </div>
              )}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              <SIcon name="logout" size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            <SIcon name="logout" size={15} />
          </button>
        )}
      </div>

    </div>
  )
}
