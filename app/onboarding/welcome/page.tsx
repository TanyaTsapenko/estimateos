'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Rocket, List, FileText, Building2, ChevronRight } from 'lucide-react'

const SETUP_ROWS = [
  {
    icon: List,
    title: 'Price list',
    sub: 'Add your services and pricing',
    href: '/dashboard/settings#price',
  },
  {
    icon: FileText,
    title: 'Contract clauses',
    sub: 'Customize your contract terms',
    href: '/dashboard/settings#contract',
  },
  {
    icon: Building2,
    title: 'Company settings',
    sub: 'Logo, address, payment details',
    href: '/dashboard/settings#company',
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.first_name) setName(user.user_metadata.first_name)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* HERO */}
      <div style={{ background: '#fff', padding: 'max(40px, calc(env(safe-area-inset-top) + 16px)) 24px 28px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ width: 220, height: 220, borderRadius: '50%', background: '#2563EB', opacity: 0.07, position: 'absolute', top: -80, right: -60, pointerEvents: 'none' }} />
        <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Rocket size={28} color="#2563EB" />
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
          {name ? `You're all set, ${name}` : "You're all set"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0A1628', lineHeight: 1.1, letterSpacing: '-0.6px' }}>
          Ready to close your <span style={{ color: '#2563EB' }}>first job.</span>
        </div>
      </div>

      {/* BODY */}
      <div style={{ background: '#F8F9FB', padding: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 12 }}>
          Set up your business
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E5E7EB', overflow: 'hidden', marginBottom: 24 }}>
          {SETUP_ROWS.map(({ icon: Icon, title, sub, href }, i) => (
            <div
              key={href}
              onClick={() => router.push(href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: i < SETUP_ROWS.length - 1 ? '0.5px solid #F3F4F6' : 'none',
              }}
            >
              <div style={{ width: 36, height: 36, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color="#2563EB" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{sub}</div>
              </div>
              <ChevronRight size={16} color="#D1D5DB" />
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
        >
          Go to dashboard
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>
          You can always update these in Settings
        </p>
      </div>
    </div>
  )
}
