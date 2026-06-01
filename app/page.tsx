'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setTimeout(() => router.replace('/landing'), 1800)
      }
    })
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>

      {/* Blob */}
      <div style={{
        position: 'absolute', width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
        filter: 'blur(48px)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, background: '#2563EB', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 120 120">
              <g transform="translate(28 28) scale(1.0625)">
                <path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/>
                <path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/>
              </g>
            </svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.5px' }}>ApexScale</span>
        </div>

        {/* Spinner */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid #EFF6FF', borderTopColor: '#2563EB',
          animation: '_spin 0.8s linear infinite',
        }} />
      </div>
    </div>
  )
}
