'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { fmtCAD } from '@/lib/pricing'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'
import { createClient } from '@/lib/supabase/client'
import { Download } from 'lucide-react'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  user_id: string; total: number; status: string; valid_until: string | null
}
interface Profile { company_name: string | null; contract_terms: string | null; phone?: string | null; deposit_percent?: number | null }

export default function PublicSignPage() {
  const { id } = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [isAnon, setIsAnon] = useState<boolean | null>(null)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [error, setError] = useState('')
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    createClient().auth.getUser()
      .then(({ data: { user } }) => setIsAnon(!user))
      .catch(() => setIsAnon(true))
  }, [])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/estimate/${id}`)
      if (!res.ok) return
      const { estimate: est, profile: prof } = await res.json()
      if (!est) return
      setEstimate(est)
      setProfile(prof)
    }
    load()
  }, [id])

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
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    lastPos.current = pos; setHasSignature(true); e.preventDefault()
  }
  function endDraw() { isDrawing.current = false }
  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function submitSignature() {
    if (saving) return
    if (!hasSignature) { setError('Please sign above'); return }
    const canvas = canvasRef.current; if (!canvas || !estimate) return
    setSaving(true); setError('')
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const res = await fetch('/api/sign-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, action: 'sign', signatureBase64: dataUrl, clientName: estimate.client_name }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError((json as any).error || 'Failed to save signature. Please try again.')
        return
      }
      const depositRes = await fetch('/api/create-deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id }) })
      if (!depositRes.ok) console.error('[sign] deposit invoice creation failed for estimate', id)
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDecline() {
    if (!estimate) return
    await fetch('/api/sign-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimateId: id, action: 'decline', clientName: estimate.client_name }),
    })
    setDeclined(true)
  }

  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  if (!estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
    </div>
  )

  if (estimate.status === 'signed' || estimate.status === 'accepted') return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>Apex<span style={{ color: '#2563EB' }}>Scale</span></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', marginBottom: 8, textAlign: 'center' }}>Already Signed</div>
        <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 1.6, maxWidth: 300 }}>
          This estimate has already been signed. Contact {profile?.company_name || 'your contractor'} if you have questions.
        </div>
      </div>
    </div>
  )

  if (done) {
    const depositPct = profile?.deposit_percent ?? 10
    const depositAmt = estimate.total * (depositPct / 100)
    const balanceAmt = estimate.total - depositAmt
    const companyPhone = profile?.phone ?? null

    // Anonymous client → new client-facing confirmation screen
    if (isAnon !== false) return (
      <div style={{ minHeight: '100vh', background: '#F5F6F8', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
          <ApexScaleLogo theme="light" size={26} />
        </div>

        <div style={{ flex: 1, padding: '36px 16px 24px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(22,163,74,0.10)', border: '1.5px solid rgba(22,163,74,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 10, letterSpacing: '-0.01em' }}>Your estimate is approved</div>
            <div style={{ fontSize: 14, color: '#475467', lineHeight: 1.65, maxWidth: 320, margin: '0 auto' }}>
              Thank you, <strong style={{ color: '#0A1628' }}>{estimate.client_name}</strong>! A copy of your signed estimate and next steps are on their way to your email.
            </div>
          </div>

          {/* Summary sheet */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 2 }}>Estimate</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{estimate.estimate_number}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 12px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: '0.06em' }}>SIGNED</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>Project total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(estimate.total)}</span>
            </div>
            {profile?.deposit_percent != null && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>Deposit due ({depositPct}%)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{fmtCAD(depositAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>Balance on completion</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{fmtCAD(balanceAmt)}</span>
              </div>
            </>}
          </div>

          {/* What happens next */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 14 }}>What happens next</div>
            {([
              estimate.client_email ? `Check your email (${estimate.client_email})` : 'Check your email for confirmation',
              profile?.deposit_percent != null ? `Pay your deposit of ${fmtCAD(depositAmt)}` : 'Review your signed estimate',
              'We\'ll be in touch to schedule next steps',
            ] as string[]).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: 13, color: '#0A1628', lineHeight: 1.55, flex: 1 }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Download */}
          <a
            href={`/api/estimate-pdf?id=${estimate.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: '#2563EB', color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 16, boxSizing: 'border-box' }}
          >
            <Download size={16} /> Download signed estimate (PDF)
          </a>

          {/* Contact line */}
          {(profile?.company_name || companyPhone) && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginBottom: 24 }}>
              Questions about your order?{' '}
              {profile?.company_name && <strong style={{ color: '#0A1628' }}>{profile.company_name}</strong>}
              {companyPhone && (
                <>{' · '}<a href={`tel:${companyPhone.replace(/\s/g, '')}`} style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>{companyPhone}</a></>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#CBD5E1' }}>
          Powered by ApexScale · useapexscale.com
        </div>
      </div>
    )

    // Authenticated rep → existing dark-gradient screen
    return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      {/* Dark gradient header */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '44px 24px 28px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 60%, #0D1B3E 100%)' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.35) 0%, transparent 70%)', top: -60, right: -50 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(32,69,184,0.2) 0%, transparent 70%)', bottom: -40, left: -20 }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.09em', marginBottom: 18 }}>ALL DONE</div>
          <div style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 7, letterSpacing: -0.2 }}>Signed!</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>Your estimate has been signed.</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '22px 18px 32px', flex: 1 }}>
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2045B8', marginBottom: 4 }}>{estimate.estimate_number}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A0E1A', marginBottom: 8 }}>{fmtCAD(estimate.total)}</div>
          <div style={{ fontSize: 13, color: '#8892b0', lineHeight: 1.55 }}>
            {estimate.client_email && 'A copy has been sent to your email. '}
            {profile?.company_name || 'Your contractor'} will be in touch shortly to confirm next steps.
          </div>
        </div>
      </div>
    </div>
    )
  }

  if (declined) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
        <ApexScaleLogo theme="light" size={26} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          You have declined {estimate?.estimate_number}. {profile?.company_name || 'Your contractor'} has been notified.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Logo header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>
          Apex<span style={{ color: '#2563EB' }}>Scale</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 6, padding: '4px 10px' }}>
          {estimate.estimate_number}
        </span>
      </div>

      {/* Section header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>
          SIGNATURE
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px', marginBottom: 2 }}>
          Sign Below
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>
          Hi {estimate.client_name || 'there'} — your signature confirms {estimate.estimate_number}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 16px', flex: 1, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>
              {estimate.estimate_number}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{today}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 10 }}>
            Total: <span style={{ color: '#2563EB' }}>{fmtCAD(estimate.total)}</span>
          </div>
          {profile?.contract_terms && profile.contract_terms !== 'тут компанія щось напише' && (
            <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.75, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
              {profile.contract_terms}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
            By signing below, you agree to this estimate for {fmtCAD(estimate.total)} including all applicable taxes.
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Signature pad */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>
          Your Signature
        </div>
        <div style={{ position: 'relative', border: '1.5px dashed #CBD5E1', borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#fff' }}>
          <canvas
            ref={canvasRef}
            width={354}
            height={140}
            style={{ width: '100%', display: 'block' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasSignature && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: '#CBD5E1', pointerEvents: 'none', textAlign: 'center' }}>
              Sign here with your finger
            </div>
          )}
          <button onClick={clearCanvas}
            style={{ position: 'absolute', top: 10, right: 10, background: '#fff', border: '1px solid #E2E5EA', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
          This is a legally binding e-signature. You&apos;ll receive a copy by email.
        </div>
      </div>

      {/* Fixed submit bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid #E2E8F0',
        padding: '12px 16px',
        paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))',
        zIndex: 45,
      }}>
        {showDeclineConfirm ? (
          <div>
            <div style={{ fontSize: 13, color: '#0A1628', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
              Are you sure you want to decline this estimate?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeclineConfirm(false)}
                style={{ flex: 1, height: 44, background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDecline}
                style={{ flex: 1, height: 44, background: '#DC2626', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Yes, decline
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={submitSignature}
              disabled={saving || !hasSignature}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, background: !hasSignature || saving ? '#CBD5E1' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !hasSignature || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .15s', marginBottom: 8 }}>
              {saving ? 'Saving…' : `I Agree — Sign ${estimate.estimate_number}`}
            </button>
            <button onClick={() => setShowDeclineConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 36, background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }}>
              Decline this estimate
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
