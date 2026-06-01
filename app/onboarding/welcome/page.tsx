'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CalendarPlus, PenLine, Receipt } from 'lucide-react'

const F = 'system-ui, -apple-system, sans-serif'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 120 120">
          <g transform="translate(28 28) scale(1.0625)">
            <path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/>
            <path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/>
          </g>
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>ApexScale</span>
    </div>
  )
}

const STEPS = [
  { Icon: CalendarPlus, title: 'Add your first appointment', sub: 'Client name, address, date' },
  { Icon: Receipt,      title: 'Build an estimate on-site',  sub: 'Good / Better / Best tiers' },
  { Icon: PenLine,      title: 'Get the signature',          sub: 'Client signs on your phone' },
]

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setFirstName(user?.user_metadata?.first_name || '')
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: F, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', padding: '48px 24px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -60, right: -60, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <Logo />

          {/* Rocket circle */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 32, marginBottom: 20,
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
              <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
          </div>

          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            {firstName ? `You're all set, ${firstName}!` : "You're all set!"}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
            Ready to close your <span style={{ color: '#2563EB' }}>first job.</span>
          </h1>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#F8F9FB', padding: '32px 24px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>
          {STEPS.map(({ Icon, title, sub }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} color="#2563EB" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
          }}
        >
          Go to dashboard →
        </button>
      </div>
    </div>
  )
}
