'use client'
import { Megaphone } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

export default function MarketingPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F4F6FB',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <AppTopBar variant="dark" eyebrow="Marketing" title="Grow your business" />

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
