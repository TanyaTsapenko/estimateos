'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { ArrowLeft } from 'lucide-react'

interface Opening { id: string; type: string; qty: number; total_cost: number; room: string | null }
interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  client_province: string | null; status: string; tier: string | null
  subtotal: number; tax_amount: number; total: number; valid_until: string | null
  scope_notes: string | null
}
interface Profile { company_name: string | null; city: string | null; province: string | null; contract_terms: string | null }

type Step = 'review' | 'sign' | 'success'

export default function SignPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('review')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('id, type, qty, total_cost, room').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, city, province, contract_terms').eq('id', user.id).single(),
      ])
      setEstimate(est)
      setOpenings(ops || [])
      setProfile(prof)
    }
    load()
  }, [id])

  // Canvas drawing
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return
    isDrawing.current = true
    lastPos.current = getPos(e, canvas)
    e.preventDefault()
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
    e.preventDefault()
  }

  function endDraw() { isDrawing.current = false }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function submitSignature() {
    if (!hasSignature) { setError('Please sign above'); return }
    const canvas = canvasRef.current; if (!canvas) return
    setSaving(true)
    setError('')

    const dataUrl = canvas.toDataURL('image/png')
    const blob = await (await fetch(dataUrl)).blob()
    const sigPath = `${id}/client-signature-${Date.now()}.png`

    const { error: uploadErr } = await supabase.storage.from('signatures').upload(sigPath, blob, { contentType: 'image/png' })
    let sigUrl = dataUrl
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(sigPath)
      sigUrl = publicUrl
    }

    const { error: updateErr } = await supabase.from('estimates').update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      client_signature_url: sigUrl,
    }).eq('id', id)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    // Send confirmation email + auto-create deposit invoice
    await Promise.allSettled([
      estimate?.client_email
        ? fetch('/api/send-email', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimateId: id, type: 'signed' }),
          })
        : Promise.resolve(),
      fetch('/api/deposit-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id }),
      }),
    ])

    setStep('success')
    setSaving(false)
  }

  if (!estimate) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard/estimates')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Estimates
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94A3B8', fontSize: 13 }}>
        Loading…
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── SUCCESS ──
  if (step === 'success') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </button>
          <div style={{ width: 1, height: 18, background: '#EEF0F4' }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>Signed!</span>
        </div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'popIn .4s ease' }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--jet)', marginBottom: 8 }}>Estimate signed!</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 28, maxWidth: 280 }}>
          {estimate.client_name} has signed {estimate.estimate_number} for <strong>{fmtCAD(estimate.total)}</strong>.
          {estimate.client_email ? ' A confirmation has been sent to their email.' : ''}
        </div>
        <button className="btn-next" style={{ width: 280, flex: 'none', marginBottom: 12 }}
          onClick={() => router.push(`/dashboard/estimates/${id}`)}>
          View Estimate →
        </button>
        <button className="btn-back" style={{ width: 280, flex: 'none' }}
          onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}>
          Create Invoice →
        </button>
      </div>
    </div>
  )

  // ── REVIEW ──
  if (step === 'review') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </button>
          <div style={{ width: 1, height: 18, background: '#EEF0F4', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
            {estimate.estimate_number}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {estimate.client_name || 'Client'}
          </span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2563EB', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 6, padding: '4px 10px', flexShrink: 0, marginLeft: 16 }}>
          CONTRACTOR VIEW
        </span>
      </div>

      <div className="card">
        <div className="sum-box" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)', marginBottom: 10 }}>
            {estimate.client_name} · {estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'} Package
          </div>
          {openings.map(op => (
            <div key={op.id} className="sum-row">
              <span>{OPENING_TYPES[op.type]?.name || op.type} × {op.qty}{op.room ? ` (${op.room})` : ''}</span>
              <span>{fmtCAD(op.total_cost)}</span>
            </div>
          ))}
          <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span></div>
          <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(estimate.tax_amount)}</span></div>
          <div className="sum-total">
            <span className="sum-total-l">Total</span>
            <span className="sum-total-v">{fmtCAD(estimate.total)}</span>
          </div>
        </div>

        {estimate.scope_notes && (
          <div className="info-box" style={{ marginBottom: 14 }}><strong>Scope: </strong>{estimate.scope_notes}</div>
        )}

        <div className="contract-box">
          {profile?.contract_terms || `This estimate prepared by ${profile?.company_name || 'the contractor'} on ${today} is valid until ${estimate.valid_until || '30 days from date of issue'}.\n\nScope of work: ${estimate.scope_notes || 'As described in the estimate.'}\n\nTotal price including applicable taxes: ${fmtCAD(estimate.total)}.\n\nPayment terms: 50% deposit upon signing, balance upon completion. All materials carry manufacturer warranty. Labour warranted for 1 year.\n\nBy signing, the client acknowledges that they have read, understood, and agree to the terms of this estimate.`}
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border-light)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Hand the phone to <strong>{estimate.client_name || 'your client'}</strong> to review and sign.
          </div>
          <button onClick={() => setStep('sign')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Hand to Client →
          </button>
        </div>
      </div>
    </div>
  )

  // ── CLIENT SIGN ──
  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>
          Estimate<span style={{ color: '#2563EB' }}>OS</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 6, padding: '4px 10px' }}>
          {estimate.estimate_number}
        </span>
      </div>

      {/* Hero */}
      <div style={{ background: '#EFF6FF', padding: 24 }}>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>
          Hi, {estimate.client_name || 'there'}!
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px', marginBottom: 4 }}>
          Sign Below
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>
          Your signature confirms {estimate.estimate_number}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 16px 120px', flex: 1 }}>

        {/* Summary card */}
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
          <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
            By signing below, you agree to this estimate for {fmtCAD(estimate.total)} including all taxes. A 50% deposit is due upon signing.
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Signature box */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>
          Your Signature
        </div>
        <div style={{ position: 'relative', border: '1.5px dashed #CBD5E1', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
          <canvas
            ref={canvasRef}
            width={354}
            height={140}
            className="sig-canvas"
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

        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6 }}>
          This is a legally binding e-signature. You'll receive a copy by email.
        </div>
      </div>

      {/* Sticky submit */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #EEF0F4', padding: '12px 16px 28px' }}>
        <button onClick={submitSignature} disabled={saving || !hasSignature}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px 0', background: !hasSignature || saving ? '#CBD5E1' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !hasSignature || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
          {saving ? 'Saving…' : `I Agree — Sign ${estimate.estimate_number}`}
        </button>
      </div>

    </div>
  )
}
