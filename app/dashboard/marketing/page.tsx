'use client'
import { Megaphone } from 'lucide-react'

export default function MarketingPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F4F6FB',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, #0B1220 0%, #1535a0 100%)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Space for burger button */}
        <div style={{ height: 38, marginBottom: 12 }} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Marketing
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
          Grow your business
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: '#EEF3FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Megaphone size={32} color="#2563EB" strokeWidth={1.6} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0B1220', letterSpacing: '-0.4px', marginBottom: 8 }}>
            Coming soon
          </div>
          <div style={{ fontSize: 14, color: '#94A0B4', lineHeight: 1.6, maxWidth: 280 }}>
            Marketing tools to help you win more jobs — email campaigns, follow-ups, and referral tracking.
          </div>
        </div>
      </div>
    </div>
  )
}
