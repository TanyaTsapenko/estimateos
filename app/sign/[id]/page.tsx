'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { Check } from 'lucide-react'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  user_id: string; total: number; status: string; valid_until: string | null
  has_tiers: boolean | null; tier: string | null
  total_good: number | null; total_better: number | null; total_best: number | null
}
interface Profile { company_name: string | null; contract_terms: string | null }

export default function PublicSignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [error, setError] = useState('')
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    async function load() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
      if (!est) return
      setEstimate(est)
      const { data: prof } = await supabase.from('profiles').select('company_name, contract_terms').eq('id', est.user_id).single()
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
      const blob = await (await fetch(dataUrl)).blob()
      const sigPath = `${id}/sig-${Date.now()}.png`

      let sigUrl = ''
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: upErr } = await supabase.storage.from('signatures').upload(sigPath, blob, { contentType: 'image/png' })
        if (!upErr) {
          sigUrl = supabase.storage.from('signatures').getPublicUrl(sigPath).data.publicUrl
          break
        }
        if (attempt === 3) {
          setError('Failed to save signature. Please try again.')
          return
        }
        await new Promise(r => setTimeout(r, 1000))
      }

      const { error: updateErr } = await supabase.from('estimates').update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        client_signature_url: sigUrl,
      }).eq('id', id)

      if (updateErr) { setError(updateErr.message); return }

      await supabase.from('notifications').insert({
        user_id: estimate.user_id,
        type:    'estimate_signed',
        title:   'Estimate signed',
        body:    `${estimate.client_name || 'Client'} signed ${estimate.estimate_number}`,
        read:    false,
        link:    `/dashboard/estimates/${estimate.id}`,
      })

      await fetch('/api/create-deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id }) })

      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDecline() {
    if (!estimate) return
    await supabase.from('estimates').update({ status: 'declined' }).eq('id', id)
    await supabase.from('notifications').insert({
      user_id: estimate.user_id,
      type:    'estimate_declined',
      title:   'Estimate declined',
      body:    `${estimate.client_name || 'Client'} declined ${estimate.estimate_number}`,
      read:    false,
      link:    `/dashboard/estimates/${estimate.id}`,
    })
    setDeclined(true)
  }

  function getTierTotal(est: Estimate): number {
    if (!est.has_tiers) return est.total
    if (est.tier === 'good') return est.total_good ?? est.total
    if (est.tier === 'best') return est.total_best ?? est.total
    return est.total_better ?? est.total
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

  if (done) return (
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
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A0E1A', marginBottom: 8 }}>{fmtCAD(getTierTotal(estimate))}</div>
          <div style={{ fontSize: 13, color: '#8892b0', lineHeight: 1.55 }}>
            {estimate.client_email && 'A copy has been sent to your email. '}
            {profile?.company_name || 'Your contractor'} will be in touch shortly to confirm next steps.
          </div>
        </div>
      </div>
    </div>
  )

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
            Total: <span style={{ color: '#2563EB' }}>{fmtCAD(getTierTotal(estimate))}</span>
          </div>
          {profile?.contract_terms && profile.contract_terms !== 'тут компанія щось напише' && (
            <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.75, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
              {profile.contract_terms}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
            By signing below, you agree to this estimate for {fmtCAD(getTierTotal(estimate))} including all applicable taxes.
          </div>
        </div>

        {estimate.has_tiers && !estimate.tier && (
          <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 16 }}>
            Please select a pricing tier before signing. Contact {profile?.company_name || 'your contractor'} to confirm which option you&apos;d like.
          </div>
        )}

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
              disabled={saving || !hasSignature || (!!estimate.has_tiers && !estimate.tier)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, background: !hasSignature || saving || (!!estimate.has_tiers && !estimate.tier) ? '#CBD5E1' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !hasSignature || saving || (!!estimate.has_tiers && !estimate.tier) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .15s', marginBottom: 8 }}>
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
