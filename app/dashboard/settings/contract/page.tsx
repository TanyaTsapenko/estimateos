'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import AppTopBar from '@/components/AppTopBar'
import { usePermissions } from '@/lib/usePermissions'
import { SuccessBanner } from '@/components/SuccessBanner'
import { type ContractClause, DEFAULT_CLAUSES } from '@/lib/contractClauses'

// ── CONSTANTS ────────────────────────────────────

const PAYMENT_METHOD_OPTIONS = ['Cash', 'E-Transfer', 'Cheque', 'Financing']

// ── SHARED PRIMITIVES ────────────────────────────

function Card({ children, padding = 22 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, hint, error, required, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; hint?: string; error?: string
  required?: boolean; prefix?: string; suffix?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 13, fontSize: 14, color: '#64748B' }}>{prefix}</span>}
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 13px',
            paddingLeft: prefix ? 28 : 13,
            paddingRight: suffix ? 28 : 13,
            border: `1px solid ${error ? '#DC2626' : focused ? '#2563EB' : '#E2E5EA'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
            color: '#0A1628', background: '#fff', outline: 'none',
            boxShadow: focused ? (error ? '0 0 0 3px rgba(220,38,38,0.12)' : '0 0 0 3px rgba(37,99,235,0.12)') : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: 13, fontSize: 14, color: '#64748B' }}>{suffix}</span>}
      </div>
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function SaveBar({ dirty, valid, onSave, onDiscard }: { dirty: boolean; valid: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginTop: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onDiscard} disabled={!dirty} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: dirty ? '#475467' : '#94A3B8', fontSize: 15, fontWeight: 500, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Discard
        </button>
        <button onClick={onSave} disabled={!valid} style={{ flex: 1, height: 52, borderRadius: 12, border: 'none', background: dirty && valid ? '#2563EB' : '#93aef5', color: '#fff', fontSize: 15, fontWeight: 600, cursor: dirty && valid ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Save changes
        </button>
      </div>
    </div>
  )
}


function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div onClick={() => !disabled && onChange(!on)} style={{ width: 38, height: 22, borderRadius: 999, flexShrink: 0, background: on ? '#2563EB' : '#E2E5EA', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────

export default function ContractSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = usePermissions()

  const [warrantyPeriod,     setWarrantyPeriod]     = useState('1 year')
  const [depositRequired,    setDepositRequired]    = useState(true)
  const [depositPercent,     setDepositPercent]     = useState(10)
  const [depositTiming,      setDepositTiming]      = useState<string>('signing')
  const [contractClauses,    setContractClauses]    = useState<ContractClause[]>(DEFAULT_CLAUSES)
  const [expandedClause,     setExpandedClause]     = useState<string | null>('buyer_right_to_cancel')
  const [dragOverId,         setDragOverId]         = useState<string | null>(null)
  const [clauseToDelete,     setClauseToDelete]     = useState<string | null>(null)
  const [projectManager,     setProjectManager]     = useState('')
  const [completionTimeframe, setCompletionTimeframe] = useState('10-16 weeks from the date of signed contract')
  const [paymentMethods,     setPaymentMethods]     = useState<string[]>(['E-Transfer', 'Cheque'])

  const [savedClauses,              setSavedClauses]              = useState('')
  const [savedWarrantyPeriod,       setSavedWarrantyPeriod]       = useState('1 year')
  const [savedDepositRequired,      setSavedDepositRequired]      = useState(true)
  const [savedDepositPercent,       setSavedDepositPercent]       = useState(10)
  const [savedDepositTiming,        setSavedDepositTiming]        = useState<string>('signing')
  const [savedCompletionTimeframe,  setSavedCompletionTimeframe]  = useState('10-16 weeks from the date of signed contract')
  const [savedPaymentMethods,       setSavedPaymentMethods]       = useState<string[]>(['E-transfer', 'Cheque'])
  const [savedProjectManager,       setSavedProjectManager]       = useState('')

  const isDirty =
    JSON.stringify(contractClauses) !== savedClauses ||
    warrantyPeriod !== savedWarrantyPeriod ||
    depositRequired !== savedDepositRequired ||
    depositPercent !== savedDepositPercent ||
    depositTiming !== savedDepositTiming ||
    completionTimeframe !== savedCompletionTimeframe ||
    JSON.stringify(paymentMethods) !== JSON.stringify(savedPaymentMethods) ||
    projectManager !== savedProjectManager

  const [userId,      setUserId]      = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [sigKey,      setSigKey]      = useState(0)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const [isDrawing,   setIsDrawing]   = useState(false)
  const [redrawMode,  setRedrawMode]  = useState(false)
  const [hasStrokes,  setHasStrokes]  = useState(false)
  const [toast, setToast] = useState<{ message: string; submessage?: string; variant?: 'success' | 'error' | 'neutral' } | null>(null)

  const flash = (message: string, opts?: { submessage?: string; variant?: 'success' | 'error' | 'neutral' }) => {
    setToast({ message, ...opts })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const sanitizedId = data.user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      setUserId(sanitizedId)
      supabase
        .from('profiles')
        .select('signature_url, warranty_period, deposit_required, deposit_percent, deposit_timing, project_manager, completion_timeframe, payment_methods, contract_clauses')
        .eq('id', sanitizedId)
        .single()
        .then(({ data: prof }) => {
          if ((prof as any)?.signature_url) setSignatureUrl((prof as any).signature_url)
          const wp  = (prof as any)?.warranty_period     || '1 year'
          const dr  = (prof as any)?.deposit_required !== undefined && (prof as any)?.deposit_required !== null ? (prof as any).deposit_required : true
          const dp  = (prof as any)?.deposit_percent     || 10
          const pm  = (prof as any)?.project_manager     ?? ''
          const ct  = (prof as any)?.completion_timeframe || '10-16 weeks from the date of signed contract'
          const rawPms: string[] = (prof as any)?.payment_methods?.length ? (prof as any).payment_methods : ['E-Transfer', 'Cheque']
          const pms = rawPms.map(m => m.toLowerCase() === 'e-transfer' ? 'E-Transfer' : m)
          const dt  = (prof as any)?.deposit_timing || 'signing'
          setWarrantyPeriod(wp);      setSavedWarrantyPeriod(wp)
          setDepositRequired(dr);     setSavedDepositRequired(dr)
          setDepositPercent(dp);      setSavedDepositPercent(dp)
          setDepositTiming(dt);       setSavedDepositTiming(dt)
          setProjectManager(pm);      setSavedProjectManager(pm)
          setCompletionTimeframe(ct); setSavedCompletionTimeframe(ct)
          setPaymentMethods(pms);     setSavedPaymentMethods(pms)
          const rawClauses = (prof as any)?.contract_clauses
          if (rawClauses) {
            try {
              const parsed = JSON.parse(rawClauses)
              setContractClauses(parsed)
              setSavedClauses(rawClauses)
            } catch {}
          } else {
            const migrated = DEFAULT_CLAUSES.map(c => {
              if (c.id === 'cancellation'              && (prof as any)?.cancellation_policy)         return { ...c, content: (prof as any).cancellation_policy }
              if (c.id === 'customer_responsibilities' && (prof as any)?.customer_responsibilities)    return { ...c, content: (prof as any).customer_responsibilities }
              if (c.id === 'damage_disclaimer'         && (prof as any)?.damage_disclaimer)            return { ...c, content: (prof as any).damage_disclaimer }
              if (c.id === 'permits'                   && (prof as any)?.permits_responsibility)       return { ...c, content: (prof as any).permits_responsibility }
              return c
            })
            setContractClauses(migrated)
            setSavedClauses(JSON.stringify(migrated))
          }
        })
    })
  }, [])

  async function saveContract() {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      warranty_period:      warrantyPeriod,
      deposit_required:     depositRequired,
      deposit_percent:      depositPercent,
      deposit_timing:       depositTiming,
      project_manager:      projectManager,
      completion_timeframe: completionTimeframe,
      payment_methods:      paymentMethods,
      contract_clauses:     JSON.stringify(contractClauses),
    }).eq('id', userId)
    if (error) { flash('Save failed: ' + error.message, { variant: 'error' }); return }
    setSavedWarrantyPeriod(warrantyPeriod)
    setSavedDepositRequired(depositRequired)
    setSavedDepositPercent(depositPercent)
    setSavedDepositTiming(depositTiming)
    setSavedProjectManager(projectManager)
    setSavedCompletionTimeframe(completionTimeframe)
    setSavedPaymentMethods([...paymentMethods])
    setSavedClauses(JSON.stringify(contractClauses))
    flash('Saved')
  }

  useEffect(() => {
    if (!redrawMode && signatureUrl) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }, [redrawMode, signatureUrl])

  function getSigPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getSigPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasStrokes(true)
  }

  function onDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getSigPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#0A1628'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function stopDraw() { setIsDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  async function saveSignatureCanvas() {
    const canvas = canvasRef.current
    if (!canvas || !userId) return
    const dataUrl = canvas.toDataURL('image/png')
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const path = `${userId}/signature.png`
    const { error } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true, contentType: 'image/png' })
    if (error) { flash('Save failed', { variant: 'error' }); return }
    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('profiles').update({ signature_url: url }).eq('id', userId)
    setSignatureUrl(url)
    setSigKey(Date.now())
    setRedrawMode(false)
    flash('Signature saved')
  }

  if (roleLoading) return null
  if (role === 'estimator') return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Contract" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Access restricted</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>Contract Settings is managed by your account owner or manager.</div>
        <button onClick={() => router.push('/dashboard/settings')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Settings
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      {/* Back header */}
      <AppTopBar onBack={() => router.back()} backLabel="Settings" title="Contract" />

      {/* Content */}
      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Card 1 — Contract Defaults */}
        <Card>
          <SectionLabel>Contract Defaults</SectionLabel>

          {/* Warranty period */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Warranty Period</div>
            <select
              value={['1 year', '2 years', '5 years', '10 years'].includes(warrantyPeriod) ? warrantyPeriod : '__custom__'}
              onChange={e => setWarrantyPeriod(e.target.value === '__custom__' ? '' : e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            >
              {['1 year', '2 years', '5 years', '10 years'].map(o => <option key={o} value={o}>{o}</option>)}
              <option value="__custom__">Custom...</option>
            </select>
            {!['1 year', '2 years', '5 years', '10 years'].includes(warrantyPeriod) && (
              <input
                type="text"
                value={warrantyPeriod}
                onChange={e => setWarrantyPeriod(e.target.value)}
                placeholder="e.g. Lifetime, 6 months, 3 years on parts"
                style={{ marginTop: 8, width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Deposit */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: depositRequired ? 10 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Deposit</div>
              <Toggle on={depositRequired} onChange={setDepositRequired} />
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: depositRequired ? 10 : 0 }}>This sets your default deposit percentage for new estimates. You can adjust or remove the deposit on individual projects when creating an estimate.</div>
            {depositRequired && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Deposit Amount</div>
                <div style={{ position: 'relative', maxWidth: 160 }}>
                  <input
                    type="number" min={0} max={100} value={depositPercent}
                    onChange={e => setDepositPercent(Number(e.target.value))}
                    placeholder="10"
                    style={{ width: '100%', padding: '10px 32px 10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8', pointerEvents: 'none' }}>%</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Deposit due</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { value: 'signing',  label: 'Upon signing',  sub: 'Client pays deposit when signing the contract' },
                      { value: 'delivery', label: 'Upon delivery', sub: 'Client pays deposit when materials are delivered' },
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setDepositTiming(opt.value)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `0.5px solid ${depositTiming === opt.value ? '#2045B8' : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', background: depositTiming === opt.value ? '#EEF2FF' : 'white' }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${depositTiming === opt.value ? '#2045B8' : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {depositTiming === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2045B8' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{opt.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2 — Additional Contract Details */}
        <Card>
          <SectionLabel>Additional Contract Details</SectionLabel>

          {/* Project Manager */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Project Manager</div>
            <input
              type="text"
              value={projectManager}
              onChange={e => setProjectManager(e.target.value)}
              placeholder="e.g. John Smith"
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Completion Timeframe */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Completion Timeframe</div>
            <input
              type="text"
              value={completionTimeframe}
              onChange={e => setCompletionTimeframe(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Payment Methods */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Accepted Payment Methods</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHOD_OPTIONS.map(method => {
                const checked = paymentMethods.includes(method)
                return (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${checked ? '#2563EB' : '#E2E5EA'}`, background: checked ? 'rgba(37,99,235,0.07)' : '#fff', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setPaymentMethods(prev => checked ? prev.filter(m => m !== method) : [...prev, method])}
                      style={{ display: 'none' }}
                    />
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${checked ? '#2563EB' : '#CBD5E1'}`, background: checked ? '#2563EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: checked ? '#2563EB' : '#475569' }}>{method}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Card 3 — Terms & Conditions */}
        <Card>
          <SectionLabel>Terms &amp; Conditions</SectionLabel>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
            Customize the clauses shown on every contract before the client signs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ...[...contractClauses].filter(c => !c.fixed).sort((a, b) => a.order - b.order),
              ...[...contractClauses].filter(c => c.fixed),
            ].map((clause) => {
              const isExpanded = expandedClause === clause.id
              const isDragOver = dragOverId === clause.id
              return (
                <div
                  key={clause.id}
                  draggable={!clause.fixed}
                  onDragStart={e => e.dataTransfer.setData('clauseId', clause.id)}
                  onDragOver={e => { if (clause.fixed) return; e.preventDefault(); setDragOverId(clause.id) }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverId(null)
                    const fromId = e.dataTransfer.getData('clauseId')
                    if (fromId === clause.id || clause.fixed) return
                    setContractClauses(prev => {
                      const sorted = [...prev].sort((a, b) => a.order - b.order)
                      const fromIdx = sorted.findIndex(c => c.id === fromId)
                      const toIdx = sorted.findIndex(c => c.id === clause.id)
                      const moved = sorted.splice(fromIdx, 1)[0]
                      sorted.splice(toIdx, 0, moved)
                      return sorted.map((c, i) => ({ ...c, order: i }))
                    })
                  }}
                  style={{
                    borderRadius: 10,
                    border: isDragOver ? '1.5px solid #2563EB' : '1px solid #E2E5EA',
                    background: isDragOver ? '#EFF6FF' : '#fff',
                    overflow: 'hidden',
                    transition: 'border 0.1s',
                    opacity: clause.enabled ? 1 : 0.55,
                  }}
                >
                  {/* Clause header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                    {/* Drag handle */}
                    {!clause.fixed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, cursor: 'grab' }}>
                        <circle cx="9" cy="5" r="1" fill="#CBD5E1"/><circle cx="9" cy="12" r="1" fill="#CBD5E1"/><circle cx="9" cy="19" r="1" fill="#CBD5E1"/>
                        <circle cx="15" cy="5" r="1" fill="#CBD5E1"/><circle cx="15" cy="12" r="1" fill="#CBD5E1"/><circle cx="15" cy="19" r="1" fill="#CBD5E1"/>
                      </svg>
                    )}
                    {clause.fixed && <div style={{ width: 14, flexShrink: 0 }} />}

                    {/* Toggle or "Required" badge */}
                    {clause.fixed ? (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563EB', background: '#EFF6FF', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>Required by law</span>
                    ) : (
                      <div
                        onClick={() => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, enabled: !c.enabled } : c))}
                        style={{ width: 34, height: 20, borderRadius: 10, background: clause.enabled ? '#2563EB' : '#9CA3AF', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                      >
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', transform: clause.enabled ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
                      </div>
                    )}

                    {/* Title */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0A1628', minWidth: 0 }}>{clause.title}</span>

                    {/* Delete button (non-fixed only) */}
                    {!clause.fixed && (
                      <button
                        onClick={() => setClauseToDelete(clause.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}

                    {/* Chevron */}
                    <div onClick={() => setExpandedClause(isExpanded ? null : clause.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px' }}>
                      {clause.fixed ? (
                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#64748B', lineHeight: 1.6, border: '1px solid #E2E5EA' }}>
                          {clause.content}
                        </div>
                      ) : (
                        <textarea
                          value={clause.content}
                          rows={4}
                          onChange={e => setContractClauses(prev => prev.map(c => c.id === clause.id ? { ...c, content: e.target.value } : c))}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#0A1628', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add clause button */}
          <button
            onClick={() => {
              const newClause: ContractClause = {
                id: 'custom_' + Date.now(),
                title: 'New clause',
                content: '',
                enabled: true,
                fixed: false,
                order: contractClauses.length,
              }
              setContractClauses(prev => [...prev, newClause])
              setExpandedClause(newClause.id)
            }}
            style={{ width: '100%', marginTop: 12, padding: '10px', background: '#fff', border: '1.5px dashed #E2E5EA', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add clause
          </button>
        </Card>

        {/* Card 4 — Contractor Signature */}
        <Card>
          <SectionLabel>Contractor Signature</SectionLabel>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
            Appears on all estimate PDFs sent to clients.
          </p>

          {signatureUrl && !redrawMode ? (
            <>
              <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <img src={`${signatureUrl}?v=${sigKey}`} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <button
                onClick={() => setRedrawMode(true)}
                style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Redraw
              </button>
            </>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={800}
                height={160}
                onMouseDown={startDraw}
                onMouseMove={onDraw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={onDraw}
                onTouchEnd={stopDraw}
                style={{ width: '100%', height: 160, display: 'block', border: '1.5px solid #E5E7EB', borderRadius: 12, background: '#fff', cursor: 'crosshair', touchAction: 'none', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={clearCanvas}
                  style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Clear
                </button>
                <button
                  onClick={saveSignatureCanvas}
                  disabled={!hasStrokes}
                  style={{ flex: 2, padding: '10px', background: hasStrokes ? '#2563EB' : '#93aef5', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: hasStrokes ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  Save Signature
                </button>
              </div>
            </>
          )}
        </Card>

        <SaveBar dirty={isDirty} valid={true} onSave={saveContract} onDiscard={() => {}} />
      </div>

      {toast && <SuccessBanner message={toast.message} submessage={toast.submessage} variant={toast.variant} mode="floating" onDismiss={() => setToast(null)} />}

      <ConfirmModal
        open={clauseToDelete !== null}
        icon="trash"
        title="Remove clause"
        body="Are you sure you want to remove this clause? This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (clauseToDelete) {
            setContractClauses(prev => prev.filter(c => c.id !== clauseToDelete).map((c, i) => ({ ...c, order: i })))
          }
          setClauseToDelete(null)
        }}
        onCancel={() => setClauseToDelete(null)}
      />
    </div>
  )
}
