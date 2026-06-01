'use client'
import { useRouter } from 'next/navigation'
import { FileText, PenLine, Send } from 'lucide-react'

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

const FEATURES = [
  { Icon: FileText,  title: 'Estimate on-site in minutes',   sub: 'Windows & doors, instant pricing' },
  { Icon: PenLine,   title: 'Client signs on your phone',    sub: 'Digital signature, legally binding' },
  { Icon: Send,      title: 'Invoice sent automatically',    sub: 'GST/HST calculated · PDF to client' },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: F, WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', padding: '36px 24px 44px', position: 'relative', overflow: 'hidden' }}>
        {/* Blob */}
        <div style={{
          position: 'absolute', width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)', top: -80, right: -60, pointerEvents: 'none',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, position: 'relative' }}>
          <Logo />
          <div style={{
            background: '#F0F4FF', border: '1px solid #DBEAFE', borderRadius: 20,
            padding: '5px 12px', fontSize: 12, color: '#1D4ED8', fontWeight: 600,
          }}>
            🇨🇦 For Canadian Contractors
          </div>
        </div>

        {/* Kicker */}
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, position: 'relative' }}>
          For Windows &amp; Doors contractors
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 30, fontWeight: 800, color: '#0A1628',
          letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0,
          position: 'relative',
        }}>
          Close jobs before you<br />
          <span style={{ color: '#2563EB' }}>leave the driveway.</span>
        </h1>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#F8F9FB', padding: '36px 24px 40px' }}>
        {/* Feature rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>
          {FEATURES.map(({ Icon, title, sub }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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

        {/* CTA buttons */}
        <button
          onClick={() => router.push('/auth/register')}
          style={{
            width: '100%', height: 52, borderRadius: 12, border: 'none',
            background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', marginBottom: 10, fontFamily: F,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          Get started — free trial
        </button>
        <button
          onClick={() => router.push('/auth/login')}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            background: '#FFFFFF', border: '0.5px solid #E5E7EB',
            color: '#0A1628', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: F,
          }}
        >
          Sign in
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
          Free 14-day trial · No credit card required
        </p>
      </div>
    </div>
  )
}
