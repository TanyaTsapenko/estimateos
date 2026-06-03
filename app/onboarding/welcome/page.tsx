'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CalendarPlus, Receipt, PenLine, Rocket } from 'lucide-react'

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
        {[
          { icon: CalendarPlus, title: 'Add your first appointment', sub: 'Client name, address, date' },
          { icon: Receipt, title: 'Build an estimate on-site', sub: 'Good / Better / Best tiers' },
          { icon: PenLine, title: 'Get the signature', sub: 'Client signs on your phone' },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '0.5px solid #F3F4F6' }}>
            <div style={{ width: 34, height: 34, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{sub}</div>
            </div>
          </div>
        ))}
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 20, cursor: 'pointer' }}>
          Go to dashboard
        </button>
      </div>
    </div>
  )
}
