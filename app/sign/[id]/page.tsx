'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { Check } from 'lucide-react'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  user_id: string; total: number; status: string; scope_notes: string | null; valid_until: string | null
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
    if (!hasSignature) { setError('Please sign above'); return }
    const canvas = canvasRef.current; if (!canvas || !estimate) return
    setSaving(true); setError('')

    const dataUrl = canvas.toDataURL('image/png')
    let sigUrl = dataUrl
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const sigPath = `${id}/sig-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('signatures').upload(sigPath, blob, { contentType: 'image/png' })
      if (!upErr) sigUrl = supabase.storage.from('signatures').getPublicUrl(sigPath).data.publicUrl
    } catch {}

    const { error: updateErr } = await supabase.from('estimates').update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      client_signature_url: sigUrl,
    }).eq('id', id)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    await supabase.from('notifications').insert({
      user_id: estimate.user_id,
      type:    'estimate_signed',
      title:   'Estimate signed',
      body:    `${estimate.client_name || 'Client'} signed ${estimate.estimate_number}`,
      read:    false,
      link:    `/dashboard/estimates/${estimate.id}`,
    })

    await Promise.allSettled([
      estimate.client_email
        ? fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id, type: 'signed' }) })
        : Promise.resolve(),
      fetch('/api/deposit-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimateId: id }) }),
    ])

    setDone(true)
    setSaving(false)
  }

  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  if (!estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>
          Estimate<span style={{ color: '#2563EB' }}>OS</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0F8A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Check size={32} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#0A1628', marginBottom: 10, textAlign: 'center' }}>Signed!</div>
        <div style={{ fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          {estimate.estimate_number} has been signed for <strong>{fmtCAD(estimate.total)}</strong>.
          {estimate.client_email && ' A copy will be sent to your email.'}
          {' '}{profile?.company_name || 'Your contractor'} will be in touch shortly to confirm next steps.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Logo header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 24px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>
          Estimate<span style={{ color: '#2563EB' }}>OS</span>
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
          {profile?.contract_terms && (
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
        <button
          onClick={submitSignature}
          disabled={saving || !hasSignature}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, background: !hasSignature || saving ? '#CBD5E1' : '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !hasSignature || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
          {saving ? 'Saving…' : `I Agree — Sign ${estimate.estimate_number}`}
        </button>
      </div>

    </div>
  )
}
