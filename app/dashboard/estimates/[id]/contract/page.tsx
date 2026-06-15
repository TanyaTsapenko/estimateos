'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { getColourLabel, getShapeLabel, getGlassLabel } from '@/lib/openingLabels'
import WindowDiagram from '@/components/WindowDiagram'

interface Opening {
  id: string; type: string; qty: number; total_cost: number
  width_in: number | null; height_in: number | null
  colour: string | null; glass: string | null; frame: string | null; floor: string | null
  install: string | null; shape: string | null; material: string | null; brand: string | null
  room: string | null; notes: string | null; hardware_colour: string | null; grid_pattern: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  glass_type: string | null; core_type: string | null
  custom_colour_label: string | null; custom_shape_label: string | null
}
interface Profile {
  id: string
  company_name: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; postal: string | null; website: string | null
  licence: string | null
  contract_terms: string | null; deposit_percent: number | null
  signature_url: string | null; logo_url: string | null
  warranty_period: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  project_manager: string | null; contract_clauses: string | null
}
interface Estimate {
  id: string; estimate_number: string; created_at: string
  client_name: string | null; client_email: string | null; client_phone: string | null
  client_address: string | null; client_city: string | null; client_province: string | null
  subtotal: number; tax_amount: number; total: number
  discount_amount: number; discount_type: string | null; discount_value: number | null
  user_id: string
}

const F = '"Inter", system-ui, sans-serif'

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ width: 28, height: 28, background: '#EEF2FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0E1A' }}>{title}</span>
    </div>
  )
}

function CheckRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ width: 20, height: 20, background: '#EEF2FF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#2045B8" strokeWidth="2.2" strokeLinecap="round">
          <polyline points="2 6 5 9 10 3" />
        </svg>
      </div>
      <span style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

export default function ContractPage() {
  const router       = useRouter()
  const { id }       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const trigger      = searchParams.get('trigger') || 'send'
  const urlPayment   = searchParams.get('payment_method')
  const urlDeposit   = searchParams.get('deposit_percent')
  const supabase     = createClient()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)

  // Inline signing state
  const svgRef                                        = useRef<SVGSVGElement>(null)
  const [paths,              setPaths]              = useState<string[]>([])
  const [currentPath,        setCurrentPath]        = useState<string>('')
  const [isDrawing,          setIsDrawing]          = useState(false)
  const [agreedToTerms,      setAgreedToTerms]      = useState(false)
  const [showSuccess,        setShowSuccess]        = useState(false)
  const [clientSignatureUrl, setClientSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: ops }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('*').eq('estimate_id', id).order('sort_order'),
      ])
      console.log('[contract page] est:', est)
      console.log('[contract page] est.user_id:', est?.user_id)
      if (!est) { setLoading(false); return }
      setEstimate(est)
      setOpenings(ops || [])
      const estOwnerId = est.user_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('id, company_name, phone, email, address, city, postal, website, licence, signature_url, contract_terms, logo_url, deposit_percent, warranty_period, completion_timeframe, payment_methods, project_manager, contract_clauses')
        .eq('id', estOwnerId)
        .single()
      console.log('[contract page] prof:', prof, 'error:', profError)
      if (prof) setProfile(prof as Profile)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: '#94A3B8' }}>
      Loading…
    </div>
  )
  if (!estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: '#94A3B8' }}>
      Contract not found.
    </div>
  )

  function getPoint(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 600,
      y: ((e.clientY - rect.top) / rect.height) * 200,
    }
  }

  async function handleAction() {
    if (trigger === 'sign') {
      if (paths.length === 0) { alert('Please sign before submitting'); return }
      if (!agreedToTerms) { alert('Please agree to the terms before signing'); return }
    }

    setSending(true)
    try {
      // Persist payment details to the estimate
      const estimateUpdate: Record<string, unknown> = {}
      if (urlPayment)  estimateUpdate.payment_method  = urlPayment
      if (urlDeposit)  estimateUpdate.deposit_percent = parseFloat(urlDeposit!)
      if (Object.keys(estimateUpdate).length > 0) {
        await supabase.from('estimates').update(estimateUpdate).eq('id', id)
      }

      const contractStatus = trigger === 'sign' ? 'signing' : 'sent'
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          estimate_id: id,
          profile_id: profile?.id,
          status: contractStatus,
          contract_terms_snapshot: profile?.contract_terms,
          contractor_signature_url: profile?.signature_url,
          company_name: profile?.company_name || '',
          company_email: profile?.email || '',
          company_phone: profile?.phone || '',
          ...(urlDeposit ? { deposit_percent: parseFloat(urlDeposit) } : {}),
          ...(urlPayment ? { payment_method: urlPayment } : {}),
        })
        .select()
        .single()

      if (error || !contract) {
        alert('Error creating contract: ' + error?.message)
        return
      }

      if (trigger === 'sign') {
        // Render SVG pad to canvas PNG
        const svgElement = svgRef.current
        if (!svgElement) { setSending(false); return }

        const svgData = new XMLSerializer().serializeToString(svgElement)
        const offscreen = document.createElement('canvas')
        offscreen.width = 600
        offscreen.height = 200
        const ctx = offscreen.getContext('2d')

        let signatureBase64: string
        try {
          await new Promise<void>((resolve, reject) => {
            const img = new Image()
            img.onload = () => { ctx?.drawImage(img, 0, 0); resolve() }
            img.onerror = reject
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
          })
          signatureBase64 = offscreen.toDataURL('image/png')
        } catch {
          setSending(false)
          alert('Could not render signature. Please try again.')
          return
        }

        const res = await fetch('/api/sign-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: contract.id,
            signatureBase64,
            clientName: estimate?.client_name,
          }),
        })
        const result = await res.json()
        if (!res.ok) {
          setSending(false)
          alert('Signing failed: ' + (result.error || 'Unknown error'))
          return
        }

        setClientSignatureUrl(result.signatureUrl)

        await Promise.allSettled([
          fetch('/api/notify-contractor-signed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorEmail: profile?.email || '',
              contractorName: profile?.company_name || '',
              clientName: estimate?.client_name || '',
              companyName: profile?.company_name || 'Your Company',
              total: estimate?.total || 0,
              depositPercent: depositPct,
              contractId: contract.id,
            }),
          }),
          fetch('/api/deposit-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimateId: id }),
          }),
        ])

        setShowSuccess(true)
        return
      }

      // trigger === 'send'
      if (!estimate?.client_email) { alert('No client email on this estimate'); return }
      await fetch('/api/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          estimateId: id,
          clientEmail: estimate.client_email,
          clientName: estimate.client_name,
          companyName: profile?.company_name || 'Your Contractor',
        }),
      })
      alert('Contract sent to ' + estimate.client_email)
      router.push(`/dashboard/estimates/${id}`)
    } catch (e: any) {
      alert('Error: ' + (e?.message || JSON.stringify(e)))
    } finally {
      setSending(false)
    }
  }

  const COLOUR_LABELS: Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
  const FRAME_LABELS: Record<string, string> = { none: 'Good condition', repair: 'Needs repair', rotted: 'Rotted frame' }
  const FLOOR_LABELS: Record<string, string> = { first: 'Ground floor', second: '2nd floor', third: '3rd floor' }
  const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
  const SHAPE_LABELS: Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
  const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }
  const DIRECTION_LABELS: Record<string, string> = { left: 'Opens left', right: 'Opens right', both: 'Opens both sides' }
  const GLASS_TYPE_LABELS: Record<string, string> = { full: 'Full glass', half: 'Half glass' }
  const CORE_LABELS: Record<string, string> = { hollow: 'Hollow core', solid: 'Solid core' }
  const GRID_LABELS: Record<string, string> = { none: 'No grid', colonial: 'Colonial grid', prairie: 'Prairie grid', diamond: 'Diamond grid', custom: 'Custom grid' }
  const HARDWARE_LABELS: Record<string, string> = { white: 'White hardware', black: 'Black hardware', chrome: 'Chrome hardware', brass: 'Brass hardware', bronze: 'Bronze hardware' }

  const contractId  = 'CON-' + estimate.id.slice(0, 6).toUpperCase()
  const createdDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.created_at))
  const depositPct  = urlDeposit ? parseFloat(urlDeposit) : (profile?.deposit_percent ?? 30)
  const depositAmt  = estimate.total * (depositPct / 100)
  const isEmpty     = paths.length === 0

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8', marginBottom: 12, overflow: 'hidden',
  }

  return (
    <>
      {/* ── SUCCESS OVERLAY (after inline sign) ── */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>

          {/* Green check */}
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 10, textAlign: 'center' }}>You're all signed!</div>
          <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
            Thank you, <strong style={{ color: '#0A1628' }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
          </div>

          {/* Deposit card */}
          <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#2563EB', marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate.total)}</div>

            <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                SIGNED
              </span>
            </div>

            {estimate.client_email && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>Sent to</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{estimate.client_email}</span>
              </div>
            )}
          </div>

          {/* Resend link */}
          <button style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 20 }}>
            Resend confirmation email →
          </button>

          {/* Done */}
          <button
            onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
            Done
          </button>
        </div>
      )}

      {/* ── MAIN CONTRACT PAGE ── */}
      <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F, display: 'flex', flexDirection: 'column' }}>

        {/* HEADER */}
        <div className="page-hd" style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
          <button onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2045B8', fontWeight: 600, fontSize: 14, fontFamily: F, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
            ← Estimate
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0E1A' }}>Contract</span>
          <div style={{ width: 70 }} />
        </div>

        {/* CONTRACT BAR */}
        <div style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%)', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>CONTRACT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{contractId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>DATE</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{createdDate}</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '16px 16px 160px', flex: 1 }}>

          {/* PARTIES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {/* Contractor */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{profile?.company_name || '—'}</div>
              <div style={{ fontSize: 11, color: '#8892b0', lineHeight: 1.6 }}>
                {profile?.phone && <div>{profile.phone}</div>}
                {profile?.email && <div style={{ fontSize: 13, color: '#475569' }}>{profile.email}</div>}
                {profile?.address && <div style={{ fontSize: 13, color: '#475569' }}>{profile.address}</div>}
                {profile?.city && <div>{profile.city}</div>}
              </div>
              {profile?.licence && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ background: '#EEF2FF', color: '#2045B8', fontSize: 9, borderRadius: 6, padding: '2px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    LIC #{profile.licence}
                  </span>
                </div>
              )}
            </div>
            {/* Client */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{estimate.client_name || '—'}</div>
              <div style={{ fontSize: 11, color: '#8892b0', lineHeight: 1.6 }}>
                {estimate.client_phone && <div>{estimate.client_phone}</div>}
                {estimate.client_email && <div>{estimate.client_email}</div>}
                {estimate.client_address && <div>{estimate.client_address}</div>}
              </div>
            </div>
          </div>

          {/* SCOPE OF WORK */}
          <div style={cardStyle}>
            <CardHeader icon={<DocumentIcon />} title="Scope of Work" />
            <div style={{ padding: '14px 16px' }}>
              {openings.map((op, i) => {
                const def = OPENING_TYPES[op.type]
                const name = def?.name || op.type
                return (
                  <div key={op.id} style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderBottom: '0.5px solid #E5E7EB' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{name} × {op.qty}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                    </div>
                    {/* Body: diagram + specs */}
                    <div style={{ display: 'flex' }}>
                      {/* Diagram */}
                      <div style={{ width: 140, borderRight: '0.5px solid #F1F5F9', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flexShrink: 0 }}>
                        <WindowDiagram type={op.type} widthIn={op.width_in || undefined} heightIn={op.height_in || undefined} size={110} />
                      </div>
                      {/* Specs */}
                      <div style={{ flex: 1, padding: '10px 12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', marginBottom: 8 }}>
                          {op.colour && op.colour !== 'white' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Colour</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{getColourLabel(op)}</span></div>}
                          {op.glass && op.glass !== 'clear' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Glass</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{getGlassLabel(op)}</span></div>}
                          {op.install && op.install !== 'retrofit' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Install</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{INSTALL_LABELS[op.install] || op.install}</span></div>}
                          {op.frame && op.frame !== 'none' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Frame</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{FRAME_LABELS[op.frame] || op.frame}</span></div>}
                          {op.floor && op.floor !== 'first' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Floor</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{FLOOR_LABELS[op.floor] || op.floor}</span></div>}
                          {op.shape && op.shape !== 'rect' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Shape</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{getShapeLabel(op)}</span></div>}
                          {op.material && op.material !== 'vinyl' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Material</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{MATERIAL_LABELS[op.material] || op.material}</span></div>}
                          {op.brand && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Brand</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{op.brand}</span></div>}
                          {op.width_in && op.height_in && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Size</span><span style={{ fontSize: 11, fontWeight: 500, color: '#0A0E1A' }}>{op.width_in}" × {op.height_in}"</span></div>}
                        </div>
                        {(() => {
                          const pills: React.ReactNode[] = []
                          if (op.has_screen) pills.push(<span key="screen" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>Screen ✓</span>)
                          if (op.tilt_clean) pills.push(<span key="tilt" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>Tilt-in ✓</span>)
                          if (op.opening_direction) pills.push(<span key="dir" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{DIRECTION_LABELS[op.opening_direction]}</span>)
                          if (op.panels_count) pills.push(<span key="panels" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{op.panels_count} panels</span>)
                          if (op.bay_angle) pills.push(<span key="angle" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{op.bay_angle}°</span>)
                          if (op.sidelight_left) pills.push(<span key="sll" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>← SL {op.sidelight_left}"</span>)
                          if (op.sidelight_right) pills.push(<span key="slr" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>→ SL {op.sidelight_right}"</span>)
                          if (op.transom_above) pills.push(<span key="ta" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>Transom above</span>)
                          if (op.glass_type) pills.push(<span key="gt" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{GLASS_TYPE_LABELS[op.glass_type]}</span>)
                          if (op.core_type) pills.push(<span key="ct" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{CORE_LABELS[op.core_type]}</span>)
                          if (op.grid_pattern && op.grid_pattern !== 'none') pills.push(<span key="grid" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{GRID_LABELS[op.grid_pattern]}</span>)
                          if (op.hardware_colour && op.hardware_colour !== 'white') pills.push(<span key="hw" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{HARDWARE_LABELS[op.hardware_colour]}</span>)
                          if (op.room) pills.push(<span key="room" style={{ background: '#F1F5F9', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#475569' }}>{op.room}</span>)
                          if (op.notes) pills.push(<span key="notes" style={{ background: '#FFF7ED', borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#C2410C' }}>📝 {op.notes}</span>)
                          if (pills.length === 0) return null
                          return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '0.5px solid #F1F5F9', paddingTop: 8 }}>{pills}</div>
                        })()}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div style={{ height: 1, background: '#F0F0F0', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                  <span>Discount</span><span>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 4 }}>
                <span>Tax</span><span>{fmtCAD(estimate.tax_amount)}</span>
              </div>

              <div style={{ height: 1, background: '#F0F0F0', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0E1A' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(estimate.total)}</span>
              </div>

              {depositAmt > 0 && (
                <>
                  <div style={{ background: '#EEF2FF', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#2045B8', fontWeight: 600 }}>
                      Deposit due upon signing ({depositPct}%)
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(depositAmt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8F9FC', borderRadius: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                      Balance on completion ({100 - depositPct}%)
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628' }}>
                      {fmtCAD(estimate.total - depositAmt)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TERMS & CONDITIONS */}
          <div style={cardStyle}>
            <CardHeader icon={<DocumentIcon />} title="Terms & Conditions" />
            <div style={{ padding: '14px 16px' }}>
              {(() => {
                const clauses: any[] = profile?.contract_clauses ? (() => { try { return JSON.parse(profile.contract_clauses) } catch { return [] } })() : []
                const enabledClauses = clauses.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
                if (enabledClauses.length === 0) return null
                return enabledClauses.map((clause: any) => (
                  <CheckRow key={clause.id} text={`${clause.title}: ${clause.content}`} />
                ))
              })()}
            </div>
          </div>

          {/* CONTRACT DETAILS */}
          {(profile?.warranty_period || profile?.completion_timeframe || urlPayment || (profile?.payment_methods && profile.payment_methods.length > 0)) && (
            <div style={cardStyle}>
              <CardHeader icon={<DocumentIcon />} title="Contract Details" />
              <div style={{ padding: '12px 16px' }}>
                {profile?.warranty_period && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Warranty Period</div>
                    <div style={{ fontSize: 14, color: '#0A1628' }}>{profile.warranty_period}</div>
                  </div>
                )}
                {profile?.completion_timeframe && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Completion Timeframe</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.completion_timeframe}</p>
                  </div>
                )}
                {(urlPayment || (profile?.payment_methods && profile.payment_methods.length > 0)) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 6 }}>Accepted Payment Methods</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {urlPayment
                        ? <span style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{urlPayment}</span>
                        : profile!.payment_methods!.map((m: string) => (
                            <span key={m} style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>
                          ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SIGNATURES */}
          <div style={cardStyle}>
            <CardHeader icon={<PenIcon />} title="Signatures" />
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Contractor */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
                {profile?.signature_url ? (
                  <img src={profile.signature_url} alt="Contractor signature" style={{ height: 60, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 4 }} />
                ) : (
                  <div style={{ height: 60, marginBottom: 4 }} />
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{profile?.company_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{createdDate}</div>
              </div>
              {/* Client */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
                {trigger === 'sign' ? (
                  clientSignatureUrl ? (
                    <img src={clientSignatureUrl} alt="Client signature" style={{ height: 60, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 4 }} />
                  ) : (
                    <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', marginBottom: 4 }}>
                      <svg
                        ref={svgRef}
                        viewBox="0 0 600 200"
                        style={{ width: '100%', height: 80, border: '2px dashed #E0E0E0', borderRadius: 10, background: '#fff', display: 'block', cursor: 'crosshair' }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          const p = getPoint(e)
                          setCurrentPath(`M ${p.x} ${p.y}`)
                          setIsDrawing(true)
                        }}
                        onPointerMove={(e) => {
                          if (!isDrawing) return
                          const p = getPoint(e)
                          setCurrentPath(prev => prev + ` L ${p.x} ${p.y}`)
                        }}
                        onPointerUp={() => {
                          if (currentPath) setPaths(prev => [...prev, currentPath])
                          setCurrentPath('')
                          setIsDrawing(false)
                        }}
                      >
                        {paths.map((d, i) => (
                          <path key={i} d={d} stroke="#0A0E1A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                        {currentPath && (
                          <path d={currentPath} stroke="#0A0E1A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {isEmpty && !isDrawing && (
                          <text x="300" y="105" textAnchor="middle" fill="#C0C8D0" fontSize="14" fontFamily="sans-serif">Sign here</text>
                        )}
                      </svg>
                      {!isEmpty && (
                        <button
                          onClick={() => { setPaths([]); setCurrentPath(''); setIsDrawing(false) }}
                          style={{ background: 'none', border: 'none', fontSize: 11, color: '#8892b0', cursor: 'pointer', padding: '2px 0', fontFamily: F }}>
                          Clear
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ height: 60, border: '1.5px dashed #E0E0E0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#C0C8D0' }}>Awaiting signature</span>
                  </div>
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>
                  {clientSignatureUrl
                    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
                    : 'Date: ___________'}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CTA */}
          {trigger === 'sign' ? (
            <div style={{ padding: '8px 0 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 12, border: agreedToTerms ? '1.5px solid #2045B8' : '1.5px solid #E8E8E8', cursor: 'pointer' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, background: agreedToTerms ? '#2045B8' : '#fff', border: agreedToTerms ? 'none' : '1.5px solid #D0D5DD', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {agreedToTerms && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="1.5 5 4 7.5 8.5 2.5" />
                    </svg>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#353A3E', lineHeight: 1.5, margin: 0 }}>
                  I have read and agree to the <span style={{ color: '#2045B8', fontWeight: 600 }}>Terms & Conditions</span> and authorize the work described in this contract.
                </p>
              </div>
              <button
                onClick={handleAction}
                disabled={isEmpty || !agreedToTerms || sending}
                style={{ width: '100%', background: '#2045B8', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: (isEmpty || !agreedToTerms || sending) ? 'not-allowed' : 'pointer', opacity: (isEmpty || !agreedToTerms || sending) ? 0.5 : 1, fontFamily: F }}>
                {sending ? 'Signing…' : 'I Agree — Sign Contract'}
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px 0 40px' }}>
              <button onClick={handleAction} disabled={sending}
                style={{ width: '100%', background: '#2045B8', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: sending ? 0.7 : 1, fontFamily: F }}>
                {sending ? 'Sending…' : 'Send to client →'}
              </button>
            </div>
          )}

        </div>

      </div>
    </>
  )
}
