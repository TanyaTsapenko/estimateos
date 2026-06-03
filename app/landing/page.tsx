'use client'
import { useRouter } from 'next/navigation'
import { FileText, PenLine, Send } from 'lucide-react'

const FEATURES = [
  { icon: FileText, title: 'Estimate on-site in minutes', sub: 'Windows & doors, get instant pricing' },
  { icon: PenLine, title: 'Client signs on your phone', sub: 'Digital signature, legally binding' },
  { icon: Send, title: 'Invoice sent automatically', sub: 'GST/HST calculated · PDF to client' },
]

export default function LandingPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: "auto", background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* HERO */}
      <div style={{ background: '#fff', padding: 'max(52px, calc(env(safe-area-inset-top) + 24px)) 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: 220, height: 220, borderRadius: '50%', background: '#2563EB', opacity: 0.07, position: 'absolute', top: -80, right: -60, pointerEvents: 'none' }} />
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 120 120"><g transform="translate(28 28) scale(1.0625)"><path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/><path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/></g></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>ApexScale</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, background: '#F0F4FF', border: '0.5px solid #DBEAFE', borderRadius: 20, padding: '3px 10px', color: '#1D4ED8', fontWeight: 500 }}>🇨🇦 Canada</span>
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>For Windows & Doors contractors</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0A1628', lineHeight: 1.1, letterSpacing: '-0.8px' }}>
          Close jobs before you <span style={{ color: '#2563EB' }}>leave the driveway.</span>
        </div>
      </div>
      {/* BODY */}
      <div style={{ background: '#ffffff', padding: 24, minHeight: '60vh' }}>
        {FEATURES.map(({ icon: Icon, title, sub }) => (
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
        <button onClick={() => router.push('/auth/register')} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 20, cursor: 'pointer' }}>
          Get started — free trial
        </button>
        <button onClick={() => router.push('/auth/login')} style={{ width: '100%', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: 13, fontSize: 14, color: '#374151', marginTop: 10, cursor: 'pointer' }}>
          Sign in
        </button>
      </div>
    </div>
  )
}
