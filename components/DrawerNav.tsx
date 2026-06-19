'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home, Calendar, FileText, Users, Receipt,
  Megaphone, Settings, LogOut, Plus, FileEdit, CalendarPlus, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard',              label: 'Home',       Icon: Home,     exact: true,  badge: false },
  { path: '/dashboard/appointments', label: 'Schedule',   Icon: Calendar, exact: false, badge: false },
  { path: '/dashboard/estimates',    label: 'Estimates',  Icon: FileText, exact: false, badge: true  },
  { path: '/dashboard/invoices',     label: 'Invoices',   Icon: Receipt,  exact: false, badge: false },
  { path: '/dashboard/clients',      label: 'Clients',    Icon: Users,    exact: false, badge: false },
  { path: '/dashboard/marketing',    label: 'Marketing',  Icon: Megaphone,exact: false, badge: false },
]

export default function DrawerNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [open,       setOpen]       = useState(false)
  const [fabOpen,    setFabOpen]    = useState(false)
  const [draftCount, setDraftCount] = useState(0)

  useEffect(() => {
    async function fetchDrafts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // try owner scope first, fall back to user scope
      const { data: prof } = await supabase
        .from('profiles').select('team_owner_id').eq('id', user.id).maybeSingle()
      const ownerId = prof?.team_owner_id || user.id
      const { count } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .eq('status', 'draft')
      setDraftCount(count ?? 0)
    }
    fetchDrafts()
  }, [])

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="dashboard-mobile-nav">
      {/* ── Burger button ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          left: 16,
          zIndex: 65,
          width: 38, height: 38,
          borderRadius: 11,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.22)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(11,18,32,0.14)',
        }}
      >
        {/* Hamburger three-line icon */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect y="0"  width="16" height="2" rx="1" fill="#fff"/>
          <rect y="5"  width="11" height="2" rx="1" fill="#fff"/>
          <rect y="10" width="7"  height="2" rx="1" fill="#fff"/>
        </svg>
      </button>

      {/* ── Drawer scrim ── */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'rgba(11,18,32,0.42)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.28s',
        }}
      />

      {/* ── Drawer panel ── */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 296,
          zIndex: 71,
          background: '#0B1220',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.32)',
        }}
      >
        {/* Header row */}
        <div style={{
          padding: '20px 16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            EstimateOS
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} color="rgba(255,255,255,0.65)" strokeWidth={2.2} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{
          flex: 1, padding: '12px 10px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {NAV_ITEMS.map(({ path, label, Icon, exact, badge }) => {
            const active = exact ? pathname === path : pathname.startsWith(path)
            return (
              <button
                key={path}
                onClick={() => go(path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 11,
                  background: active ? '#2563EB' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2 : 1.6}
                  color={active ? '#fff' : 'rgba(255,255,255,0.5)'}
                />
                <span style={{
                  flex: 1,
                  fontSize: 15, fontWeight: 600,
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                }}>
                  {label}
                </span>
                {badge && draftCount > 0 && (
                  <span style={{
                    minWidth: 20, height: 20, borderRadius: 10,
                    background: active ? 'rgba(255,255,255,0.22)' : '#2563EB',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px', flexShrink: 0,
                  }}>
                    {draftCount}
                  </span>
                )}
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 4px' }} />

          {/* Settings */}
          {(() => {
            const active = pathname.startsWith('/dashboard/settings')
            return (
              <button
                onClick={() => go('/dashboard/settings')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 11,
                  background: active ? '#2563EB' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <Settings size={19} strokeWidth={active ? 2 : 1.6} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
                <span style={{ fontSize: 15, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                  Settings
                </span>
              </button>
            )
          })()}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '8px 10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={signOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 11,
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,52,26,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={19} strokeWidth={1.6} color="rgba(255,255,255,0.38)" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Sign out</span>
          </button>
        </div>
      </div>

      {/* ── FAB + speed dial ── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        right: 20,
        zIndex: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {/* Speed-dial items */}
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); router.push('/dashboard/appointments/new') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: 'none', borderRadius: 14,
                padding: '10px 14px 10px 10px',
                cursor: 'pointer', boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#EEF3FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CalendarPlus size={17} color="#2563EB" strokeWidth={1.8} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1220', lineHeight: 1.2 }}>New appointment</div>
                <div style={{ fontSize: 11, color: '#94A0B4', marginTop: 2 }}>Schedule a visit</div>
              </div>
            </button>

            <button
              onClick={() => { setFabOpen(false); router.push('/dashboard/estimates/new') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: 'none', borderRadius: 14,
                padding: '10px 14px 10px 10px',
                cursor: 'pointer', boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#EEF3FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FileEdit size={17} color="#2563EB" strokeWidth={1.8} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1220', lineHeight: 1.2 }}>New estimate</div>
                <div style={{ fontSize: 11, color: '#94A0B4', marginTop: 2 }}>Build a quote</div>
              </div>
            </button>

            {/* FAB dismiss backdrop */}
            <div
              onClick={() => setFabOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: -1 }}
            />
          </>
        )}

        {/* FAB button */}
        <button
          onClick={() => setFabOpen(v => !v)}
          aria-label={fabOpen ? 'Close menu' : 'Quick add'}
          style={{
            width: 60, height: 60,
            borderRadius: 19,
            background: '#2563EB',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 14px 30px rgba(37,99,235,0.45), 0 2px 6px rgba(37,99,235,0.25)',
            transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), background 0.18s',
            transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <Plus size={26} strokeWidth={2.4} color="#fff" />
        </button>
      </div>
    </div>
  )
}
