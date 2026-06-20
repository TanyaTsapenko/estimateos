'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#F4F6FB', card: '#FFFFFF',
  border: 'rgba(15,23,42,0.08)',
  ink: '#0B1220', inkMid: '#475467', inkSoft: '#8A94A6', inkFaint: '#B3BAC6',
  blue: '#2563EB', blueDeep: '#1D4ED8', blueSoft: '#EEF3FF',
}
const HEAD = 'linear-gradient(165deg,#2F6BF3 0%,#1E45C9 70%,#1A3BB0 100%)'

function NIcon({ name, size = 22, color = 'currentColor', stroke = 1.8 }: {
  name: string; size?: number; color?: string; stroke?: number
}) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'menu':     return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    case 'home':     return <svg {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
    case 'calendar': return <svg {...p}><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>
    case 'doc':      return <svg {...p}><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/></svg>
    case 'invoice':  return <svg {...p}><path d="M6 2h9l3 3v17l-3-1.5L15 22l-3-1.5L9 22l-3-1.5L6 22z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>
    case 'users':    return <svg {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0111 0"/><path d="M16 5.2a3.2 3.2 0 010 6M19.5 20a5.5 5.5 0 00-3-4.9"/></svg>
    case 'mega':     return <svg {...p}><path d="M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1z"/><path d="M16 9a3 3 0 010 6M18.5 6.5a6.5 6.5 0 010 11"/></svg>
    case 'gear':     return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
    case 'plus':     return <svg {...p} strokeWidth={2.4}><path d="M12 5v14M5 12h14"/></svg>
    case 'x':        return <svg {...p} strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18"/></svg>
    case 'chev':     return <svg {...p} strokeWidth={2}><path d="M9 6l6 6-6 6"/></svg>
    case 'logout':   return <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
    default: return null
  }
}

const MENU = [
  { id: 'home',      path: '/dashboard',              label: 'Home',      icon: 'home',     exact: true,  badge: false },
  { id: 'schedule',  path: '/dashboard/appointments', label: 'Schedule',  icon: 'calendar', exact: false, badge: false },
  { id: 'estimates', path: '/dashboard/estimates',    label: 'Estimates', icon: 'doc',      exact: false, badge: false },
  { id: 'invoices',  path: '/dashboard/invoices',     label: 'Invoices',  icon: 'invoice',  exact: false, badge: false },
  { id: 'clients',   path: '/dashboard/clients',      label: 'Clients',   icon: 'users',    exact: false, badge: false },
  { id: 'marketing', path: '/dashboard/marketing',    label: 'Marketing', icon: 'mega',     exact: false, badge: false },
]

export default function DrawerNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [fabOpen,     setFabOpen]     = useState(false)
  const [userName,    setUserName]    = useState('')
  const [companyName, setCompanyName] = useState('')
  const [initial,     setInitial]     = useState('')

  // Load profile once
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .maybeSingle()

      const name =
        (user.user_metadata as any)?.full_name ||
        (prof?.first_name ? `${prof.first_name} ${prof.last_name || ''}`.trim() : '') ||
        user.email?.split('@')[0] || 'User'
      const company = (prof as any)?.company_name || ''

      setUserName(name)
      setCompanyName(company)
      setInitial(name.charAt(0).toUpperCase())
    }
    load()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (drawerOpen) setDrawerOpen(false)
      if (fabOpen) setFabOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen, fabOpen])

  function go(path: string) {
    setDrawerOpen(false)
    router.push(path)
  }

  function openDrawer() {
    setDrawerOpen(true)
    setFabOpen(false)
  }

  function toggleFab() {
    setFabOpen(v => !v)
    setDrawerOpen(false)
  }

  async function signOut() {
    setDrawerOpen(false)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const settingsActive = pathname.startsWith('/dashboard/settings')

  // Glass style on dark/gradient pages; solid style on white-topbar pages
  const isGradientPage = pathname === '/dashboard' || pathname.startsWith('/dashboard/marketing')
  const burgerBg    = isGradientPage ? 'rgba(255,255,255,0.15)' : '#F4F6FB'
  const burgerBorder= isGradientPage ? 'none'                   : '1px solid rgba(15,23,42,0.10)'
  const burgerIcon  = isGradientPage ? '#fff'                   : '#475467'

  return (
    <div className="dashboard-mobile-nav">

      {/* ── Burger ─────────────────────────────────────────────── */}
      <button
        onClick={openDrawer}
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          left: 20,
          zIndex: 50,
          width: 42, height: 42, borderRadius: 13,
          background: burgerBg,
          border: burgerBorder, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <NIcon name="menu" size={21} color={burgerIcon} stroke={1.8} />
      </button>

      {/* ── FAB scrim (behind FAB, above page) ─────────────────── */}
      <div
        onClick={() => setFabOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 46,
          background: 'rgba(244,246,251,0.55)',
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)',
          opacity: fabOpen ? 1 : 0,
          pointerEvents: fabOpen ? 'auto' : 'none',
          transition: 'opacity .25s',
        }}
      />

      {/* ── FAB + speed-dial ───────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        right: 18,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 26px)',
        zIndex: 47,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12,
          opacity: fabOpen ? 1 : 0,
          transform: fabOpen ? 'translateY(0)' : 'translateY(10px)',
          pointerEvents: fabOpen ? 'auto' : 'none',
          transition: 'opacity .18s, transform .18s',
        }}>
          {/* New estimate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              background: C.card, borderRadius: 12,
              boxShadow: '0 6px 18px rgba(15,23,42,0.16)',
              padding: '7px 13px', textAlign: 'right',
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>New estimate</div>
              <div style={{ fontSize: 11, color: C.inkSoft }}>Build a quote</div>
            </div>
            <button
              aria-label="New estimate"
              onClick={() => { setFabOpen(false); router.push('/dashboard/estimates/new') }}
              style={{
                width: 48, height: 48, borderRadius: 15,
                background: C.card, border: `1px solid ${C.border}`,
                boxShadow: '0 6px 16px rgba(15,23,42,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <NIcon name="doc" size={21} color={C.blue} />
            </button>
          </div>

          {/* New appointment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              background: C.card, borderRadius: 12,
              boxShadow: '0 6px 18px rgba(15,23,42,0.16)',
              padding: '7px 13px', textAlign: 'right',
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>New appointment</div>
              <div style={{ fontSize: 11, color: C.inkSoft }}>Schedule a visit</div>
            </div>
            <button
              aria-label="New appointment"
              onClick={() => { setFabOpen(false); router.push('/dashboard/appointments/new') }}
              style={{
                width: 48, height: 48, borderRadius: 15,
                background: C.card, border: `1px solid ${C.border}`,
                boxShadow: '0 6px 16px rgba(15,23,42,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <NIcon name="calendar" size={21} color={C.blue} />
            </button>
          </div>
        </div>

        {/* FAB button */}
        <button
          onClick={toggleFab}
          aria-label={fabOpen ? 'Close' : 'Quick add'}
          style={{
            width: 60, height: 60, borderRadius: 19,
            background: C.blue, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 26px rgba(37,99,235,0.45)',
            transition: 'transform .2s',
            transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            willChange: 'transform',
          }}
        >
          <NIcon name="plus" size={28} color="#fff" stroke={2.4} />
        </button>
      </div>

      {/* ── Drawer scrim ───────────────────────────────────────── */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(11,18,32,0.42)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity .25s',
        }}
      />

      {/* ── Drawer panel ───────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0, width: 296,
        zIndex: 61,
        background: C.card,
        boxShadow: '16px 0 40px rgba(0,0,0,0.2)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        willChange: 'transform',
      }}>

        {/* Profile head */}
        <div style={{
          background: HEAD,
          padding: 'calc(env(safe-area-inset-top, 0px) + 52px) 18px 18px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 800, flexShrink: 0,
              }}>
                {initial || '?'}
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>{userName || 'User'}</div>
                {companyName && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{companyName}</div>
                )}
              </div>
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255,255,255,0.16)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <NIcon name="x" size={16} color="#fff" />
            </button>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {MENU.map(m => {
            const active = m.exact ? pathname === m.path : pathname.startsWith(m.path)
            return (
              <button
                key={m.id}
                onClick={() => go(m.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 13,
                  padding: '13px 12px', borderRadius: 13,
                  background: active ? C.blueSoft : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  marginBottom: 2, fontFamily: 'inherit',
                }}
              >
                <NIcon name={m.icon} size={21} color={active ? C.blue : C.inkMid} stroke={active ? 2 : 1.8} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: active ? 800 : 600, color: active ? C.blueDeep : C.ink }}>
                  {m.label}
                </span>
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: C.border, margin: '10px 12px' }} />

          {/* Settings */}
          <button
            onClick={() => go('/dashboard/settings')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 13,
              padding: '13px 12px', borderRadius: 13,
              background: settingsActive ? C.blueSoft : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <NIcon name="gear" size={21} color={settingsActive ? C.blue : C.inkMid} stroke={settingsActive ? 2 : 1.8} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: settingsActive ? 800 : 600, color: settingsActive ? C.blueDeep : C.ink }}>
              Settings
            </span>
            <NIcon name="chev" size={17} color={C.inkFaint} />
          </button>
        </div>

        {/* Sign out */}
        <div style={{
          padding: 'calc(env(safe-area-inset-bottom, 0px) + 10px) 12px 26px',
          borderTop: `1px solid ${C.border}`,
        }}>
          <button
            onClick={signOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 13,
              padding: '13px 12px', borderRadius: 13,
              border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            <NIcon name="logout" size={20} color={C.inkSoft} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: C.inkSoft }}>Sign out</span>
          </button>
        </div>

      </div>
    </div>
  )
}
