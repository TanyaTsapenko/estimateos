'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, opCost, fmtCAD, type Opening } from '@/lib/pricing'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_province: string | null
  status: string; tier: string | null; subtotal: number; tax_rate: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  payment_method: string | null; scope_notes: string | null; valid_until: string | null; created_at: string
  sent_method: string | null
}
interface Profile {
  company_name: string | null; city: string | null; province: string | null
  logo_url: string | null; deposit_pct: number | null; contract_pdf_url: string | null
}

const TIERS = [
  { key: 'good',   label: 'Good',   mult: 1.0, why: 'Standard materials & workmanship. 1-year labour warranty.', badge: '' },
  { key: 'better', label: 'Better', mult: 1.2, why: 'Mid-grade product, enhanced energy efficiency, 5-year warranty.', badge: 'MOST POPULAR' },
  { key: 'best',   label: 'Best',   mult: 1.4, why: 'Premium product with lifetime manufacturer warranty and priority service.', badge: 'BEST VALUE' },
]

const INSTALL_LABELS: Record<string, string> = { insert: 'Retrofit', retrofit: 'Retrofit', fullframe: 'Full Frame', stud_to_stud: 'Stud to Stud' }
const FLOOR_LABELS: Record<string, string> = { first: '', second: '2nd floor', third: '3rd+ floor' }

type Screen = 'view' | 'summary' | 'sign' | 'success' | 'declined' | 'already_signed' | 'contract'

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
  const [contractRead, setContractRead] = useState(false)
  const [error, setError] = useState('')
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    async function load() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
      if (!est) return
      if (est.status === 'signed') { setEstimate(est); setScreen('already_signed'); return }
      const [{ data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimate_openings').select('*').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, city, province, logo_url, deposit_pct, contract_pdf_url').eq('id', (est as any).user_id).single(),
      ])
      setEstimate(est); setSelectedTier(est.tier || 'better')
      setOpenings(ops || []); setProfile(prof)
      if ((est.sent_method === 'email_estimate_contract' || est.sent_method === 'email_contract') && prof?.contract_pdf_url) {
        setScreen('contract')
      }
    }
    load()
  }, [id])

  // ── PRICING CALCULATIONS ──────────────────────
  function calcPricing(tierKey: string) {
    const mult = TIERS.find(t => t.key === tierKey)?.mult || 1.2
    const [taxRate] = TAX_RATES[estimate?.client_province || 'AB'] || [0.05]
    const rawSubtotal = openings.reduce((s, op) => s + opCost(op, mult), 0)
    const discountAmt = !estimate ? 0
      : estimate.discount_type === 'percent'
        ? rawSubtotal * ((estimate.discount_value || 0) / 100)
        : Math.min(estimate.discount_amount || 0, rawSubtotal)
    const afterDiscount = rawSubtotal - discountAmt
    const taxAmount = afterDiscount * taxRate
    const total = afterDiscount + taxAmount
    const depositPct = profile?.deposit_pct ?? 30
    const deposit = Math.round(total * depositPct) / 100
    const balance = Math.round((total - deposit) * 100) / 100
    return { mult, rawSubtotal, discountAmt, afterDiscount, taxRate, taxAmount, total, depositPct, deposit, balance }
  }

  const pricing = estimate ? calcPricing(selectedTier) : null
  const [, taxLabel] = TAX_RATES[estimate?.client_province || 'AB'] || [0, 'Tax']

  // ── CANVAS DRAWING ────────────────────────────
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

    const { rawSubtotal, discountAmt, taxAmount, total } = calcPricing(selectedTier)

    const { error: updateErr } = await supabase.from('estimates').update({
      status: 'signed', signed_at: new Date().toISOString(),
      client_signature_url: sigUrl, tier: selectedTier,
      subtotal: Math.round(rawSubtotal * 100) / 100,
      discount_amount: Math.round(discountAmt * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }).eq('id', id)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    await Promise.allSettled([
      fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id, type: 'signed' }) }),
      ...(estimate.sent_method !== 'email_contract' ? [fetch('/api/deposit-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id }) })] : []),
    ])
    setScreen('success'); setSaving(false)
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

  // ── ALREADY SIGNED ────────────────────────────
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

  // ── DECLINED ─────────────────────────────────
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

  // ── SUCCESS ───────────────────────────────────
  if (screen === 'success') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div>
        <div className="h-title"><div className="h-eye">All done!</div><div className="h-big">Signed! 🎉</div></div>
      </div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>You&apos;re all set!</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          {estimate.estimate_number} is signed for <strong>{fmtCAD(pricing?.total || 0)}</strong>.
          A copy has been sent to your email. {profile?.company_name} will be in touch shortly to confirm next steps.
        </div>
      </div>
    </div>
  )

  if (!pricing) return null

  // ── SIGN SCREEN ───────────────────────────────
  if (screen === 'sign') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <button onClick={() => setScreen(estimate.sent_method === 'email_contract' ? 'contract' : 'summary')}
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">{estimate.estimate_number} · {estimate.sent_method === 'email_contract' ? profile?.company_name || 'Contractor' : selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1) + ' Package'}</div>
          <div className="h-big">{estimate.sent_method === 'email_contract' ? 'Sign contract' : 'Sign to approve'}</div>
          {estimate.sent_method !== 'email_contract' && <div className="h-sub">Total: {fmtCAD(pricing.total)} · Deposit: {fmtCAD(pricing.deposit)}</div>}
        </div>
      </div>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        {estimate.sent_method !== 'email_contract' && (
          <>
            {/* Mini summary on sign screen */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--ash)' }}>Package</span>
                <span style={{ fontWeight: 700, color: 'var(--jet)', textTransform: 'capitalize' }}>{selectedTier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--ash)' }}>Total (inc. {taxLabel})</span>
                <span style={{ fontWeight: 700, color: 'var(--jet)' }}>{fmtCAD(pricing.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--ash)' }}>Deposit due today ({pricing.depositPct}%)</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{fmtCAD(pricing.deposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--ash)' }}>Balance on delivery</span>
                <span style={{ fontWeight: 700, color: 'var(--jet)' }}>{fmtCAD(pricing.balance)}</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: 'rgba(59,108,255,.04)', border: '1px solid rgba(59,108,255,.12)', borderRadius: 10 }}>
              By signing, you approve the <strong>{selectedTier}</strong> package for <strong>{fmtCAD(pricing.total)}</strong> including {taxLabel}. A deposit of <strong>{fmtCAD(pricing.deposit)}</strong> ({pricing.depositPct}%) is due upon signing.
            </div>
          </>
        )}
        {estimate.sent_method === 'email_contract' && (
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: 'rgba(59,108,255,.04)', border: '1px solid rgba(59,108,255,.12)', borderRadius: 10 }}>
            By signing, you acknowledge that you have read and agree to the contract terms and conditions presented by <strong>{profile?.company_name || 'the contractor'}</strong>.
          </div>
        )}

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
          {saving ? '⏳ Processing...' : estimate.sent_method === 'email_contract' ? '✅ I Agree — Sign Contract' : `✅ I Agree — Approve ${fmtCAD(pricing.total)}`}
        </button>
        <button onClick={declineEstimate}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, padding: '12px 0', cursor: 'pointer', marginTop: 8 }}>
          {estimate.sent_method === 'email_contract' ? 'Decline' : 'Decline this estimate'}
        </button>
      </div>
    </div>
  )

  // ── CONTRACT SCREEN ───────────────────────────
  if (screen === 'contract') {
    const nextScreen: Screen = estimate.sent_method === 'email_contract' ? 'sign' : 'view'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="gh">
          <div className="h-top">
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <div className="h-title">
            <div className="h-eye">{estimate.estimate_number} · {profile?.company_name || 'Contractor'}</div>
            <div className="h-big">Review Contract</div>
            <div className="h-sub">Read and acknowledge before continuing</div>
          </div>
        </div>
        <div className="card screen-enter">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <iframe
              src={profile?.contract_pdf_url || ''}
              style={{ width: '100%', height: 400, border: 'none', display: 'block' }}
              title="Contract PDF"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
            <input type="checkbox" checked={contractRead} onChange={e => setContractRead(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#2045B8', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--jet)', lineHeight: 1.5 }}>
              I have read and agree to the contract terms and conditions presented by {profile?.company_name || 'the contractor'}.
            </span>
          </label>
          <button className="gen-btn" disabled={!contractRead} onClick={() => setScreen(nextScreen)}>
            {nextScreen === 'sign' ? 'Continue to Sign →' : 'Continue to Estimate →'}
          </button>
          {profile?.contract_pdf_url && (
            <a href={profile.contract_pdf_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', fontSize: 11, color: '#2045B8', marginTop: 12, textDecoration: 'none' }}>
              Open PDF in new tab →
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── SUMMARY SCREEN ────────────────────────────
  if (screen === 'summary') {
    const tierLabel = selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)
    return (
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
            <div className="h-eye">{estimate.estimate_number} · {tierLabel} Package</div>
            <div className="h-big">Order Summary</div>
            <div className="h-sub">Review before signing</div>
          </div>
        </div>

        <div className="card screen-enter">
          {/* ── Line items ── */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 10, paddingBottom: 8, borderBottom: '1.5px solid var(--border-light)' }}>
            Line items ({openings.length})
          </div>

          {openings.map((op, idx) => {
            const price = opCost(op, pricing.mult)
            const details = [
              op.width_in && op.height_in ? `${op.width_in}" × ${op.height_in}"` : null,
              INSTALL_LABELS[op.install] || op.install,
              FLOOR_LABELS[op.floor] || null,
              op.room || null,
            ].filter(Boolean).join(' · ')
            return (
              <div key={op.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '11px 0', borderBottom: idx < openings.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jet)', marginBottom: 3 }}>
                    {OPENING_TYPES[op.type]?.icon} {OPENING_TYPES[op.type]?.name || op.type}
                    {op.qty > 1 && <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}> × {op.qty}</span>}
                  </div>
                  {details && (
                    <div style={{ fontSize: 11, color: 'var(--ash)', lineHeight: 1.5 }}>{details}</div>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--jet)', flexShrink: 0, textAlign: 'right' }}>
                  {fmtCAD(price)}
                </div>
              </div>
            )
          })}

          {/* ── Pricing breakdown ── */}
          <div style={{
            background: '#F4F5F7', border: '1.5px solid #1A2744',
            borderRadius: 14, padding: 16, marginTop: 16,
          }}>
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <span>Subtotal ({tierLabel})</span>
              <span>{fmtCAD(pricing.rawSubtotal)}</span>
            </div>

            {/* Discount */}
            {pricing.discountAmt > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                <span>−{fmtCAD(pricing.discountAmt)}</span>
              </div>
            )}

            {/* Tax */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <span>{taxLabel}</span>
              <span>{fmtCAD(pricing.taxAmount)}</span>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #1A2744', paddingTop: 12, marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--jet)' }}>Total</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#2045B8', letterSpacing: '-.02em' }}>{fmtCAD(pricing.total)}</span>
            </div>

            {/* Deposit & balance */}
            <div style={{ borderTop: '1.5px dashed rgba(26,39,68,.25)', marginTop: 14, paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2744' }}>
                    Deposit due on signing
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{pricing.depositPct}% of total</div>
                </div>
                <span style={{
                  fontSize: 18, fontWeight: 800, color: '#2563eb',
                  background: 'rgba(37,99,235,.1)', padding: '4px 12px', borderRadius: 8,
                }}>
                  {fmtCAD(pricing.deposit)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>
                    Balance on delivery
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>Due upon installation</div>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)' }}>
                  {fmtCAD(pricing.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          {estimate.payment_method && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--ash)' }}>
              <span>💳</span>
              <span>Payment method: <strong style={{ color: 'var(--jet)' }}>{estimate.payment_method}</strong></span>
            </div>
          )}

          {/* Valid until */}
          {estimate.valid_until && (
            <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 8 }}>
              ⏱ Estimate valid until {estimate.valid_until}
            </div>
          )}

          {/* CTA */}
          <div style={{ marginTop: 20 }}>
            <button className="gen-btn" onClick={() => setScreen('sign')}
              style={{ marginBottom: 10 }}>
              ✍️ Sign &amp; Approve — {fmtCAD(pricing.total)} →
            </button>
            <button onClick={() => setScreen('view')}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, padding: '10px 0', cursor: 'pointer' }}>
              ← Change package
            </button>
            <button onClick={declineEstimate}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#dc262640', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}>
              Decline this estimate
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN VIEW (tier selection) ─────────────────
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
            const p = calcPricing(t.key)
            return (
              <div key={t.key} className={`tier${selectedTier === t.key ? ' on' : ''}`}
                onClick={() => setSelectedTier(t.key)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="t-tag">{t.label}</span>
                  {t.badge && <span className="t-badge">{t.badge}</span>}
                </div>
                <div className="t-price">{fmtCAD(p.total)}</div>
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
                  {fmtCAD(opCost(op, pricing.mult))}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="sum-box" style={{ marginTop: 12 }}>
          <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(pricing.rawSubtotal)}</span></div>
          {pricing.discountAmt > 0 && (
            <div className="sum-row" style={{ color: '#16a34a' }}>
              <span>Discount</span><span>−{fmtCAD(pricing.discountAmt)}</span>
            </div>
          )}
          <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(pricing.taxAmount)}</span></div>
          <div className="sum-total">
            <span className="sum-total-l">Total</span>
            <span className="sum-total-v">{fmtCAD(pricing.total)}</span>
          </div>
        </div>

        {estimate.valid_until && (
          <div style={{ fontSize: 11, color: 'var(--ash)', textAlign: 'center', marginBottom: 16 }}>
            Valid until {estimate.valid_until}
          </div>
        )}

        <button className="gen-btn" onClick={() => setScreen('summary')}>
          Review &amp; Approve {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} — {fmtCAD(pricing.total)} →
        </button>

        <button onClick={declineEstimate}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, padding: '12px 0', cursor: 'pointer', marginTop: 4 }}>
          Decline this estimate
        </button>
      </div>
    </div>
  )
}
