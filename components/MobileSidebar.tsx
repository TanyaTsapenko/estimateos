'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Home, Calendar, Users, FileText, Receipt, BarChart2, Settings } from 'lucide-react'
import { ApexScaleLogo } from './ApexScaleLogo'

const MAIN_ITEMS = [
  { path: '/dashboard',            label: 'Home',      Icon: Home,     exact: true  },
  { path: '/dashboard/schedule',   label: 'Schedule',  Icon: Calendar, exact: false },
  { path: '/dashboard/clients',    label: 'Clients',   Icon: Users,    exact: false },
  { path: '/dashboard/estimates',  label: 'Estimates', Icon: FileText, exact: false },
  { path: '/dashboard/invoices',   label: 'Invoices',  Icon: Receipt,  exact: false },
]

const TEAM_ITEMS = [
  { path: '/dashboard/appointments', label: 'Appointments', Icon: Calendar,  exact: false },
  { path: '/dashboard/analytics',    label: 'Analytics',    Icon: BarChart2, exact: false },
]

export default function MobileSidebar() {
  const [open, setOpen]               = useState(false)
  const [name, setName]               = useState('')
  const [companyName, setCompanyName] = useState('')
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single()
      if (!prof) return
      setName([prof.first_name, prof.last_name].filter(Boolean).join(' '))
      setCompanyName(prof.company_name || '')
    })
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('open-mobile-sidebar', handleOpen)
    return () => window.removeEventListener('open-mobile-sidebar', handleOpen)
  }, [])

  const parts   = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()

  function go(path: string) {
    router.push(path)
    setOpen(false)
  }

  function NavRow({
    path, label, Icon, exact, badge,
  }: { path: string; label: string; Icon: React.ElementType; exact: boolean; badge?: string }) {
    const active = exact ? pathname === path : pathname.startsWith(path)
    return (
      <button
        onClick={() => go(path)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', borderRadius: 10, border: 'none',
          background: active ? '#2563EB' : 'transparent',
          color: active ? '#fff' : 'rgba(255,255,255,0.65)',
          fontSize: 14, fontWeight: active ? 600 : 500,
          cursor: 'pointer', textAlign: 'left', marginBottom: 2,
          fontFamily: 'inherit', transition: 'background 0.15s',
        }}
      >
        <Icon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
          <span style={{
            background: '#16A34A', color: '#fff',
            fontSize: 9, fontWeight: 700, borderRadius: 4,
            padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{badge}</span>
        )}
      </button>
    )
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
      )}

      {/* Slide-in panel */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 280, background: '#0A1628', zIndex: 80,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: '"Inter", system-ui, sans-serif',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-hidden={!open}
      >
        {/* Logo + close */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <ApexScaleLogo theme="dark" size={26} />
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              padding: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name || '…'}
            </div>
            {companyName && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {companyName}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 10px 0' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
            padding: '0 10px', marginBottom: 6,
          }}>
            Main
          </div>
          {MAIN_ITEMS.map(item => <NavRow key={item.path + item.label} {...item} />)}

          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
            padding: '18px 10px 6px',
          }}>
            Team
          </div>
          {TEAM_ITEMS.map(item => <NavRow key={item.path + item.label} {...item} />)}
        </div>

        {/* Bottom — Settings */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <NavRow path="/dashboard/settings" label="Settings" Icon={Settings} exact={false} />
        </div>
      </div>
    </>
  )
}
