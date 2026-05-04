'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, opCost, fmtCAD, type Opening } from '@/lib/pricing'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_province: string | null
  status: string; subtotal: number; tax_rate: number; tax_amount: number; total: number
  scope_notes: string | null; valid_until: string | null; created_at: string
}
interface Profile { company_name: string | null; city: string | null; province: string | null; logo_url: string | null }

const TIERS = [
  { key: 'good',   label: 'Good',   mult: 1.0, why: 'Standard materials & workmanship. 1-year labour warranty.', badge: '' },
  { key: 'better', label: 'Better', mult: 1.2, why: 'Mid-grade product, enhanced energy efficiency, 5-year warranty.', badge: 'MOST POPULAR' },
  { key: 'best',   label: 'Best',   mult: 1.4, why: 'Premium product with lifetime manufacturer warranty and priority service.', badge: 'BEST VALUE' },
]

type Screen = 'view' | 'sign' | 'success' | 'declined' | 'already_signed'

export default function ClientEstimatePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedTier, setSelectedTier] = useState('better')
  const [screen, setScreen] = useState<Screen>('view')
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    async function load() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
      if (!est) return
      setEstimate(est)
      if (est.status === 'signed') { setScreen('already_signed'); return }

      const { data: ops } = await supabase.from('estimate_openings')
        .select('*').eq('estimate_id', id).order('sort_order')
      setOpenings(ops || [])

      // Get profile by joining through estimates
      const { data: prof } = await supabase.from('profiles')
        .select('company_name, city, province, logo_url')
        .eq('id', (est as any).user_id).single()
      setProfile(prof)
      if (est.tier) setSelectedTier(est.tier)
    }
    load()
  }, [id])

  // Canvas drawing (same as sign page)
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return
    isDrawing.current = true; lastPos.current = getPos(e, canvas); e.preventDefault()
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos; setHasSignature(true); e.preventDefault()
  }
  function endDraw() { isDrawing.current = false }
  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function submitSignature() {
    if (!hasSignature) { setError('Please sign above'); return }
    const canvas = canvasRef.current; if (!canvas || !estimate) return
    setSaving(true); setError('')
    const dataUrl = canvas.toDataURL('image/png')
    let sigUrl = dataUrl
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const sigPath = `${id}/client-sig-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('signatures').upload(sigPath, blob, { contentType: 'image/png' })
      if (!upErr) sigUrl = supabase.storage.from('signatures').getPublicUrl(sigPath).data.publicUrl
    } catch {}

    const mult = TIERS.find(t => t.key === selectedTier)?.mult || 1.2
    const [taxRate] = TAX_RATES[estimate.client_province || 'AB'] || [0.05]
    const subtotal = openings.reduce((s, op) => s + opCost(op, mult), 0)
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    const { error: updateErr } = await supabase.from('estimates').update({
      status: 'signed', signed_at: new Date().toISOString(),
      client_signature_url: sigUrl, tier: selectedTier,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }).eq('id', id)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    try {
      await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, type: 'signed' }),
      })
    } catch {}

    setScreen('success')
    setSaving(false)
  }

  async function declineEstimate() {
    if (!confirm('Decline this estimate?')) return
    await supabase.from('estimates').update({ status: 'declined' }).eq('id', id)
    setScreen('declined')
  }

  if (!estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--platinum)' }}>
      <div style={{ fontSize: 13, color: 'var(--ash)' }}>Loading estimate...</div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const mult = TIERS.find(t => t.key === selectedTier)?.mult || 1.2
  const subtotal = openings.reduce((s, op) => s + opCost(op, mult), 0)
  const taxAmount = subtotal * (TAX_RATES[estimate.client_province || 'AB']?.[0] || 0.05)
  const total = subtotal + taxAmount

  // ── ALREADY SIGNED ──
  if (screen === 'already_signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div>
        <div className="h-title"><div className="h-eye">All done</div><div className="h-big">Already signed</div></div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>{estimate.estimate_number} is signed</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          This estimate has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
        </div>
      </div>
    </div>
  )

  // ── DECLINED ──
  if (screen === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div>
        <div className="h-title"><div className="h-eye">Declined</div><div className="h-big">No problem.</div></div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>👋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>Estimate declined</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          We&apos;ve noted your response. Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
        </div>
      </div>
    </div>
  )

  // ── SUCCESS ──
  if (screen === 'success') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div>
        <div className="h-title"><div className="h-eye">All done!</div><div className="h-big">Signed! 🎉</div></div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'popIn .4s ease' }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>You&apos;re all set!</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          {estimate.estimate_number} is signed for <strong>{fmtCAD(total)}</strong>.
          A copy has been sent to your email. {profile?.company_name} will be in touch shortly to confirm next steps.
        </div>
      </div>
    </div>
  )

  // ── SIGN SCREEN ──
  if (screen === 'sign') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <button onClick={() => setScreen('view')}
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">{estimate.estimate_number} · {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Package</div>
          <div className="h-big">Sign to approve</div>
          <div className="h-sub">Total: {fmtCAD(total)}</div>
        </div>
      </div>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: 'var(--surface)', borderRadius: 10 }}>
          By signing, you approve the <strong>{selectedTier}</strong> package for <strong>{fmtCAD(total)}</strong> including {taxLabel}. 50% deposit due upon signing.
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 6 }}>Your signature</div>
        <div className="sig-wrap" style={{ marginBottom: 14 }}>
          <canvas ref={canvasRef} width={354} height={140} className="sig-canvas"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          {!hasSignature && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: '#C8C8C8', pointerEvents: 'none', textAlign: 'center' }}>
              Sign here with your finger
            </div>
          )}
          <button className="sig-clear" onClick={clearCanvas}>Clear</button>
        </div>
        <button className="gen-btn" onClick={submitSignature} disabled={saving || !hasSignature}>
          {saving ? '⏳ Processing...' : `✅ I Agree — Approve ${fmtCAD(total)}`}
        </button>
        <button onClick={declineEstimate}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, padding: '12px 0', cursor: 'pointer', marginTop: 8 }}>
          Decline this estimate
        </button>
      </div>
    </div>
  )

  // ── MAIN VIEW ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">{estimate.estimate_number} · {profile?.company_name || 'Contractor'}</div>
          <div className="h-big">Your Estimate</div>
          <div className="h-sub">Choose a package below and sign to approve</div>
        </div>
      </div>

      <div className="card screen-enter">
        {estimate.scope_notes && (
          <div className="info-box" style={{ marginBottom: 16 }}>
            <strong>Scope of work:</strong> {estimate.scope_notes}
          </div>
        )}

        <div className="sl" style={{ marginBottom: 12 }}>Choose your package</div>

        <div className="tier-grid">
          {TIERS.map(t => {
            const tierSubtotal = openings.reduce((s, op) => s + opCost(op, t.mult), 0)
            const tierTax = tierSubtotal * (TAX_RATES[estimate.client_province || 'AB']?.[0] || 0.05)
            const tierTotal = tierSubtotal + tierTax
            return (
              <div key={t.key} className={`tier${selectedTier === t.key ? ' on' : ''}`}
                onClick={() => setSelectedTier(t.key)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="t-tag">{t.label}</span>
                  {t.badge && <span className="t-badge">{t.badge}</span>}
                </div>
                <div className="t-price">{fmtCAD(tierTotal)}</div>
                <div className="t-sub">inc. {taxLabel}</div>
                <div className="t-why">{t.why}</div>
              </div>
            )
          })}
        </div>

        {openings.length > 0 && (
          <>
            <div className="sl" style={{ marginTop: 4 }}>What&apos;s included</div>
            {openings.map(op => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 13, color: 'var(--jet)' }}>
                  {OPENING_TYPES[op.type]?.icon} {OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
                  {op.room ? <span style={{ fontSize: 10, color: 'var(--ash)', marginLeft: 6 }}>{op.room}</span> : null}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)' }}>
                  {fmtCAD(opCost(op, mult))}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="sum-box" style={{ marginTop: 12 }}>
          <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(subtotal)}</span></div>
          <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(taxAmount)}</span></div>
          <div className="sum-total">
            <span className="sum-total-l">Total</span>
            <span className="sum-total-v">{fmtCAD(total)}</span>
          </div>
        </div>

        {estimate.valid_until && (
          <div style={{ fontSize: 11, color: 'var(--ash)', textAlign: 'center', marginBottom: 16 }}>
            Valid until {estimate.valid_until}
          </div>
        )}

        <button className="gen-btn" onClick={() => setScreen('sign')}>
          ✍️ Approve {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} — {fmtCAD(total)} →
        </button>

        <button onClick={declineEstimate}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, padding: '12px 0', cursor: 'pointer', marginTop: 4 }}>
          Decline this estimate
        </button>
      </div>
    </div>
  )
}
