'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES } from '@/lib/pricing'

const F = "'Inter', system-ui, -apple-system, sans-serif"

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 4, flex: 1, borderRadius: 4,
          background: i < step ? 'rgba(32,69,184,0.4)' : i === step ? '#2045B8' : '#E8E8E8',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 48, height: 48, background: '#EEF2FF', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function HintBox({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#EEF2FF', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span style={{ fontSize: 12, color: '#2045B8', lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', background: disabled ? '#CBD5E1' : '#2045B8', border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F, marginBottom: 8 }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', background: 'none', border: 'none', padding: '11px 0', fontSize: 13, color: '#8892b0', cursor: 'pointer', fontFamily: F }}>
      {children}
    </button>
  )
}

export default function GBBOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 2 state
  const [tier1, setTier1] = useState('Good')
  const [tier2, setTier2] = useState('Better')
  const [tier3, setTier3] = useState('Best')

  // Step 3 state — prices per opening_type
  const [priceRows, setPriceRows] = useState<{ key: string; label: string; good: string; better: string; best: string }[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      const { data } = await supabase.from('price_lists').select('opening_type, base_price, good_price, better_price, best_price').eq('user_id', user.id)
      const existing: Record<string, any> = {}
      ;(data || []).forEach((r: any) => { existing[r.opening_type] = r })
      const rows = Object.entries(OPENING_TYPES).map(([key, def]) => ({
        key,
        label: def.name,
        good:   String(existing[key]?.good_price   || ''),
        better: String(existing[key]?.better_price || ''),
        best:   String(existing[key]?.best_price   || ''),
      }))
      setPriceRows(rows)
    })
  }, [])

  function setPrice(key: string, tier: 'good' | 'better' | 'best', val: string) {
    setPriceRows(rows => rows.map(r => r.key === key ? { ...r, [tier]: val } : r))
  }

  async function saveTierNames() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      gbb_tier1_name: tier1,
      gbb_tier2_name: tier2,
      gbb_tier3_name: tier3,
    }).eq('id', userId)
    setSaving(false)
    setStep(3)
  }

  async function savePricesAndFinish() {
    if (!userId) return
    setSaving(true)
    const rows = priceRows.map(r => ({
      user_id: userId,
      opening_type: r.key,
      good_price:   parseInt(r.good)   || null,
      better_price: parseInt(r.better) || null,
      best_price:   parseInt(r.best)   || null,
      updated_at: new Date().toISOString(),
    }))
    await supabase.from('price_lists').upsert(rows, { onConflict: 'user_id,opening_type' })
    await supabase.from('profiles').update({ pricing_mode: 'gbb' }).eq('id', userId)
    setSaving(false)
    setStep(4)
  }

  // ── STEP 1 ────────────────────────────────────
  if (step === 1) return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F }}>
      {/* Dark header */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '60px 22px 30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(59,108,255,0.4)', top: -80, right: -60 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(217,119,6,0.2)', bottom: -50, left: -20 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(217,119,6,0.35)', borderRadius: 20, padding: '5px 12px', marginBottom: 18 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em' }}>SELL MORE</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.18, marginBottom: 12 }}>
            Close bigger jobs<br/>with tiered pricing
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Contractors using G-B-B earn{' '}
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>$420 more per job</strong>{' '}
            and close{' '}
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>38% more deals.</strong>
          </div>
          {/* Tier preview */}
          <div style={{ display: 'flex', gap: 7, marginTop: 22 }}>
            {[
              { label: 'Good', price: '$800', active: false },
              { label: 'Better', price: '$1,100', active: true },
              { label: 'Best', price: '$1,500', active: false },
            ].map(t => (
              <div key={t.label} style={t.active
                ? { flex: 1, background: '#3B6CFF', borderRadius: 11, padding: '10px 8px', textAlign: 'center' }
                : { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, padding: '10px 8px', textAlign: 'center' }
              }>
                <div style={{ fontSize: 10, color: t.active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.active ? '#fff' : 'rgba(255,255,255,0.7)' }}>{t.price}</div>
                {t.active && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>✓ selected</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 18px 32px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { stat: '+$420', label: 'average ticket increase' },
            { stat: '68%', label: 'pick Better or Best tier' },
          ].map(c => (
            <div key={c.stat} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#2045B8' }}>{c.stat}</div>
              <div style={{ fontSize: 11, color: '#8892b0', marginTop: 3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { n: '1', title: 'You set three price tiers for each opening type', sub: 'Good, Better, Best — all in your Price List' },
            { n: '2', title: 'Client sees all three options on the estimate', sub: 'No pressure — they choose what fits their budget' },
            { n: '3', title: 'Client signs on the spot', sub: '68% pick the middle or top tier automatically' },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid #E8E8E8' : undefined }}>
              <div style={{ width: 24, height: 24, background: '#EEF2FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#2045B8' }}>{row.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', lineHeight: 1.4 }}>{row.title}</div>
                <div style={{ fontSize: 11, color: '#8892b0', marginTop: 2 }}>{row.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <PrimaryBtn onClick={() => setStep(2)}>Get started →</PrimaryBtn>
        <GhostBtn onClick={() => router.push('/dashboard')}>Not right now</GhostBtn>
      </div>
    </div>
  )

  // ── STEP 2 ────────────────────────────────────
  if (step === 2) return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F }}>
      <div style={{ padding: '60px 18px 28px' }}>
        <ProgressDots step={2} />
        <StepIcon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </StepIcon>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Name your tiers</div>
        <div style={{ fontSize: 13, color: '#8892b0', marginBottom: 20, lineHeight: 1.55 }}>
          Choose names your clients will understand. Good / Better / Best by default.
        </div>
        <HintBox text="Most contractors keep Good / Better / Best. You can always change these in Settings." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {/* Tier 1 */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#F0F0EE', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8892b0" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8892b0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tier 1 · Entry</span>
            </div>
            <input value={tier1} onChange={e => setTier1(e.target.value)} placeholder="Good"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0A1628', background: 'transparent', fontFamily: F, boxSizing: 'border-box' }} />
          </div>

          {/* Tier 2 */}
          <div style={{ background: '#F8FAFF', border: '1.5px solid #2045B8', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#2045B8', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2045B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tier 2 · Most Popular</span>
            </div>
            <input value={tier2} onChange={e => setTier2(e.target.value)} placeholder="Better"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#2045B8', background: 'transparent', fontFamily: F, boxSizing: 'border-box' }} />
          </div>

          {/* Tier 3 */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#FFF3E0', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8892b0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tier 3 · Premium</span>
            </div>
            <input value={tier3} onChange={e => setTier3(e.target.value)} placeholder="Best"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0A1628', background: 'transparent', fontFamily: F, boxSizing: 'border-box' }} />
          </div>
        </div>

        <PrimaryBtn onClick={saveTierNames} disabled={saving || !tier1.trim() || !tier2.trim() || !tier3.trim()}>
          {saving ? 'Saving…' : 'Continue →'}
        </PrimaryBtn>
        <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
      </div>
    </div>
  )

  // ── STEP 3 ────────────────────────────────────
  if (step === 3) return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F }}>
      <div style={{ padding: '60px 18px 28px' }}>
        <ProgressDots step={3} />
        <StepIcon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="18" y2="18"/>
            <circle cx="18" cy="6" r="3"/><circle cx="8" cy="12" r="3"/><circle cx="16" cy="18" r="3"/>
          </svg>
        </StepIcon>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Almost there!</div>
        <div style={{ fontSize: 13, color: '#8892b0', marginBottom: 20, lineHeight: 1.55 }}>
          Good / Better / Best is ready to activate. Next step — add tier prices to your Price List.
        </div>

        <div style={{ background: '#EEF2FF', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          {[
            'Your existing prices become the Good tier by default',
            'Add Better and Best prices in Price List → Settings',
            'Clients will see all three options on every estimate',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2045B8', flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontSize: 13, color: '#0A1628', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <PrimaryBtn onClick={async () => {
          if (!userId) return
          setSaving(true)
          await supabase.from('profiles').update({ pricing_mode: 'gbb' }).eq('id', userId)
          setSaving(false)
          router.push('/dashboard/price-list')
        }} disabled={saving}>
          {saving ? 'Activating…' : 'Activate & go to Price List →'}
        </PrimaryBtn>
        <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
      </div>
    </div>
  )

  // ── STEP 4 ────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 18px' }}>
      <div style={{ width: 72, height: 72, background: '#EEF2FF', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#0A1628', marginBottom: 8, textAlign: 'center' }}>You&apos;re all set!</div>
      <div style={{ fontSize: 13, color: '#8892b0', textAlign: 'center', lineHeight: 1.6, maxWidth: 300, marginBottom: 28 }}>
        Good / Better / Best is now active. Your next estimate will show all three tiers automatically.
      </div>

      {/* Preview card */}
      <div style={{ width: '100%', maxWidth: 340, background: '#fff', border: '1px solid #E8E8E8', borderRadius: 16, padding: '16px 14px', marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8892b0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How it looks on estimate</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: tier1, price: '$800', active: false },
            { label: tier2, price: '$1,100', active: true, note: '✓ client picks' },
            { label: tier3, price: '$1,500', active: false },
          ].map(t => (
            <div key={t.label} style={t.active
              ? { flex: 1, background: '#2045B8', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }
              : { flex: 1, background: '#F4F4F2', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }
            }>
              <div style={{ fontSize: 10, color: t.active ? 'rgba(255,255,255,0.75)' : '#8892b0', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.active ? '#fff' : '#0A1628' }}>{t.price}</div>
              {t.note && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{t.note}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <PrimaryBtn onClick={() => router.push('/dashboard')}>Go to dashboard →</PrimaryBtn>
      </div>
    </div>
  )
}
