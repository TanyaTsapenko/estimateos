'use client'
import { useRouter } from 'next/navigation'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"
const HDR = 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)'
const GLOW = 'radial-gradient(ellipse at 100% 0%, rgba(59,108,255,0.35) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(32,69,184,0.2) 0%, transparent 55%)'

export default function SplashPage() {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: F, background: '#F4F4F2' }}>

      {/* DARK HERO */}
      <div style={{ background: HDR, padding: '56px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: GLOW, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div>
            <ApexScaleLogo theme="dark" size={36} />
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', marginBottom: 16, letterSpacing: '0.05em' }}>
            🇨🇦 For Canadian Contractors
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Close jobs before<br />you leave the<br />driveway.
          </div>
        </div>
      </div>

      {/* CARD */}
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', marginTop: -24, flex: 1, padding: '28px 20px 48px', position: 'relative', zIndex: 2 }}>
        {([
          { title: 'Estimate on-site in minutes', sub: 'Add windows & doors, get instant pricing' },
          { title: 'Client signs on your phone',  sub: 'Digital signature, legally binding' },
          { title: 'Invoice sent automatically',  sub: 'GST/HST calculated · PDF to client' },
        ] as const).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2045B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{item.sub}</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <button
            onClick={() => router.push('/auth/register')}
            style={{ height: 54, width: '100%', background: '#2045B8', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: F, cursor: 'pointer', boxShadow: '0 8px 20px rgba(32,69,184,0.3)' }}>
            Get Started — Free Trial →
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            style={{ height: 50, width: '100%', background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 12, color: '#6B7280', fontWeight: 500, fontSize: 14, fontFamily: F, cursor: 'pointer' }}>
            Sign In →
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16, fontFamily: F }}>
          14-day free trial · No credit card needed
        </div>
      </div>
    </div>
  )
}
