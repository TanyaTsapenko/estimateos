'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Profile {
  id: string; first_name: string | null; last_name: string | null
  company_name: string | null; phone: string | null; website: string | null
  city: string | null; province: string | null; licence: string | null
  insurance: string | null; logo_url: string | null; contract_terms: string | null
  signature_url: string | null
}

type Section = 'info' | 'contract' | 'signature' | 'logo'

export default function CompanyProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [section, setSection] = useState<Section>('info')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setForm(data || {})
    }
    load()
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: e } = await supabase.from('profiles')
      .update({ ...form, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (e) { setError(e.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Logo upload ──
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user.id)
    setForm(p => ({ ...p, logo_url: publicUrl }))
    setUploading(false)
  }

  // ── Signature canvas ──
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
    const c = canvasRef.current; if (!c) return
    isDrawing.current = true; lastPos.current = getPos(e, c); e.preventDefault()
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current) return
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const pos = getPos(e, c)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos; setHasSignature(true); e.preventDefault()
  }
  function endDraw() { isDrawing.current = false }
  function clearSig() {
    const c = canvasRef.current; if (!c) return
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height); setHasSignature(false)
  }

  async function saveSig() {
    if (!hasSignature) { setError('Please sign above'); return }
    const c = canvasRef.current; if (!c) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const dataUrl = c.toDataURL('image/png')
    const blob = await (await fetch(dataUrl)).blob()
    const path = `${user.id}/contractor-signature.png`
    const { error: upErr } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true, contentType: 'image/png' })
    let sigUrl = dataUrl
    if (!upErr) {
      sigUrl = supabase.storage.from('signatures').getPublicUrl(path).data.publicUrl
    }
    await supabase.from('profiles').update({ signature_url: sigUrl }).eq('id', user.id)
    setForm(p => ({ ...p, signature_url: sigUrl }))
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: 'info',      label: 'Company',   icon: '🏢' },
    { key: 'logo',      label: 'Logo',      icon: '🖼️' },
    { key: 'signature', label: 'Signature', icon: '✍️' },
    { key: 'contract',  label: 'Contract',  icon: '📝' },
  ]

  // Completion score
  const fields = [form.company_name, form.phone, form.city, form.licence, form.logo_url, form.signature_url, form.contract_terms]
  const completion = Math.round(fields.filter(Boolean).length / fields.length * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/settings')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: completion === 100 ? '#4ade80' : '#f59e0b' }}>
            {completion}% complete
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Your brand</div>
          <div className="h-big">Company Profile</div>
          <div className="h-sub">Appears on all estimates and contracts</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {/* Progress bar */}
        <div style={{ background: 'var(--border-light)', borderRadius: 4, height: 4, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--amber)', borderRadius: 4, width: completion + '%', transition: 'width .4s ease' }} />
        </div>

        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">✅ Saved</div>}

        {/* Section selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {sections.map(s => (
            <div key={s.key}
              onClick={() => { setSection(s.key); setError(''); setSaved(false) }}
              style={{
                background: section === s.key ? 'rgba(217,119,6,.08)' : '#fff',
                border: `1.5px solid ${section === s.key ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 10, padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
              }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: section === s.key ? '#92400e' : 'var(--ash)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── COMPANY INFO ── */}
        {section === 'info' && (
          <>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>First Name</label>
                <input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
              <div className="f"><label>Last Name</label>
                <input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
            </div>
            <div className="r1" style={{ marginBottom: 10 }}><div className="f">
              <label>Company Name *</label>
              <input placeholder="Arctic Climate Solutions" value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} />
            </div></div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>Phone</label>
                <input type="tel" placeholder="(403) 555-0244" value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
              <div className="f"><label>Website</label>
                <input placeholder="arcticclimate.ca" value={form.website || ''} onChange={e => set('website', e.target.value)} /></div>
            </div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>City</label>
                <input placeholder="Calgary" value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
              <div className="f"><label>Province</label>
                <select value={form.province || 'AB'} onChange={e => set('province', e.target.value)}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="r2" style={{ marginBottom: 10 }}>
              <div className="f"><label>Licence / Reg #</label>
                <input placeholder="AB-G2-4821" value={form.licence || ''} onChange={e => set('licence', e.target.value)} />
                <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>Gas, electrical, contractor</div>
              </div>
              <div className="f"><label>Insurance</label>
                <input placeholder="Intact Insurance" value={form.insurance || ''} onChange={e => set('insurance', e.target.value)} /></div>
            </div>
            <button className="gen-btn" onClick={save} disabled={saving}>{saving ? '⏳ Saving…' : '💾 Save Company Info'}</button>
          </>
        )}

        {/* ── LOGO ── */}
        {section === 'logo' && (
          <>
            <div className="info-box">Your logo appears on all estimates and the PDF. Use a PNG or JPG, square format works best.</div>
            {form.logo_url && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={form.logo_url} alt="Logo" style={{ maxWidth: 140, maxHeight: 80, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border)' }} />
                <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 6 }}>Current logo</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 14, padding: 28, textAlign: 'center', cursor: 'pointer', background: '#fff', marginBottom: 14 }}>
              {uploading ? (
                <div style={{ fontSize: 13, color: 'var(--ash)' }}>Uploading…</div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>
                    {form.logo_url ? 'Tap to replace logo' : 'Tap to upload logo'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)' }}>PNG or JPG · Max 2MB</div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── SIGNATURE ── */}
        {section === 'signature' && (
          <>
            <div className="info-box">Your signature appears on contracts alongside the client's. Sign once — saved to all estimates.</div>
            {form.signature_url && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 8 }}>Current signature</div>
                <img src={form.signature_url} alt="Signature" style={{ maxHeight: 60, objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 6 }}>
              {form.signature_url ? 'Draw new signature' : 'Draw your signature'}
            </div>
            <div className="sig-wrap" style={{ marginBottom: 14 }}>
              <canvas ref={canvasRef} width={354} height={140} className="sig-canvas"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              {!hasSignature && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: '#C8C8C8', pointerEvents: 'none', textAlign: 'center' }}>
                  Sign here with your finger
                </div>
              )}
              <button className="sig-clear" onClick={clearSig}>Clear</button>
            </div>
            <button className="gen-btn" onClick={saveSig} disabled={saving || !hasSignature}>
              {saving ? '⏳ Saving…' : '💾 Save Signature'}
            </button>
          </>
        )}

        {/* ── CONTRACT TERMS ── */}
        {section === 'contract' && (
          <>
            <div className="info-box">These terms appear on every estimate before the client signs. You can override them per estimate.</div>
            <div className="r1" style={{ marginBottom: 14 }}><div className="f">
              <label>Standard Contract Terms</label>
              <textarea
                value={form.contract_terms || ''}
                onChange={e => set('contract_terms', e.target.value)}
                rows={10}
                placeholder={`Example:\n\nThis estimate is valid for 30 days from the date of issue. A 50% deposit is required upon signing, with the remaining balance due upon completion.\n\nAll materials carry the manufacturer's warranty. Labour is warranted for one year from the date of installation.\n\nBy signing, the client confirms they have read and agreed to all terms.`}
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.7 }}
              />
            </div></div>
            <button className="gen-btn" onClick={save} disabled={saving}>{saving ? '⏳ Saving…' : '💾 Save Terms'}</button>
          </>
        )}

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
