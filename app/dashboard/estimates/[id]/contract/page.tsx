'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { getColourLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { hasTrim, trimSummaryLines } from '@/lib/v2/trimUtils'
import { substituteProvince } from '@/lib/provinces'
import WindowDiagram from '@/components/WindowDiagram'
import AppTopBar from '@/components/AppTopBar'

const NAVY    = '#0A1628'
const BLUE    = '#2563EB'
const BLUE_D  = '#1D4ED8'
const BLUE_BG = '#EEF3FF'
const GRAY_BG = '#F8FAFC'
const BORDER  = '#E2E8F0'
const MUTED   = '#64748B'
const FAINT   = '#94A3B8'
const F       = '"Inter", system-ui, sans-serif'

interface Opening {
  id: string; type: string; qty: number; total_cost: number
  width_in: number | null; height_in: number | null
  colour: string | null; glass: string | null; frame: string | null; floor: string | null
  install: string | null; shape: string | null; material: string | null; brand: string | null
  room: string | null; notes: string | null; grid_pattern: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  glass_type: string | null; core_type: string | null
  custom_colour_label: string | null; custom_shape_label: string | null
  colour_palette_id?: string | null; colour_name?: string | null
  glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null
  interior_colour_palette_id?: string | null; interior_colour_name?: string | null; interior_colour?: string | null
  pane?: string | null; argon?: boolean | null; laminated_glass?: boolean | null
  grid?: boolean | null; grille_type?: string | null; window_subtype?: string | null
}
interface Profile {
  id: string
  company_name: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; province: string | null; postal: string | null
  website: string | null; licence: string | null; insurance: string | null
  contract_terms: string | null; deposit_percent: number | null
  signature_url: string | null; logo_url: string | null
  warranty_period: string | null; completion_timeframe: string | null
  payment_methods: string[] | null; project_manager: string | null
  contract_clauses: string | null
  gst_hst_number: string | null; wsib_number: string | null
  company_contact_email: string | null
  signing_rep_name: string | null; signing_rep_title: string | null
}
interface Estimate {
  id: string; estimate_number: string; created_at: string
  client_name: string | null; client_email: string | null; client_phone: string | null
  client_address: string | null; client_city: string | null; client_province: string | null; client_postal_code: string | null
  subtotal: number; tax_amount: number; tax_rate: number | null; total: number
  discount_amount: number; discount_type: string | null; discount_value: number | null
  job_site_same_as_client: boolean | null; job_site_address: string | null; job_site_city: string | null; job_site_province: string | null
  user_id: string
  trim_casing?: string | null; trim_casing_size?: string | null; trim_casing_custom_name?: string | null
  trim_jamb?: string | null; trim_jamb_extension_depth?: string | null; trim_jamb_extension_depth_custom?: string | null; trim_jamb_custom_name?: string | null
  trim_brickmold?: boolean | null; trim_brickmold_colour_name?: string | null
  trim_rosettes?: string | null; trim_caping?: boolean | null; trim_nail_fin?: boolean | null
  trim_drip_cap?: boolean | null; trim_blue_skin?: boolean | null
}

function humanize(s?: string | null): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 8, marginTop: 2 }}>
      {children}
    </div>
  )
}

function GrpHdr({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: 8, marginBottom: 3, borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 2 }}>
      {children}
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', marginBottom: 3 }}>
      <span style={{ fontSize: 11, color: FAINT, width: 86, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: NAVY }}>{value}</span>
    </div>
  )
}

const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
const FLOOR_LABELS:   Record<string, string> = { second: '2nd floor', third: '3rd floor' }
const DIRECTION_LABELS: Record<string, string> = { left: 'Opens left', right: 'Opens right', both: 'Opens both sides' }
const GLASS_TYPE_LABELS: Record<string, string> = { full: 'Full glass', half: 'Half glass' }
const CORE_LABELS: Record<string, string> = { hollow: 'Hollow core', solid: 'Solid core' }

export default function ContractPage() {
  const router         = useRouter()
  const { id }         = useParams<{ id: string }>()
  const searchParams   = useSearchParams()
  const trigger        = searchParams.get('trigger') || 'send'
  const urlPayment     = searchParams.get('payment_method')
  const urlDeposit     = searchParams.get('deposit_percent')
  const supabase       = createClient()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)

  const svgRef                                  = useRef<SVGSVGElement>(null)
  const [paths,           setPaths]           = useState<string[]>([])
  const [currentPath,     setCurrentPath]     = useState<string>('')
  const [isDrawing,       setIsDrawing]       = useState(false)
  const [agreedToTerms,   setAgreedToTerms]   = useState(false)
  const [showSuccess,     setShowSuccess]     = useState(false)
  const [clientSigUrl,    setClientSigUrl]    = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: ops }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('*').eq('estimate_id', id).order('sort_order'),
      ])
      if (!est) { setLoading(false); return }
      setEstimate(est)
      setOpenings(ops || [])
      const ownerId = est.user_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, company_name, phone, email, address, city, province, postal, website, licence, insurance, signature_url, logo_url, contract_terms, deposit_percent, warranty_period, completion_timeframe, payment_methods, project_manager, contract_clauses, gst_hst_number, wsib_number, company_contact_email, signing_rep_name, signing_rep_title')
        .eq('id', ownerId)
        .single()
      if (prof) setProfile(prof as Profile)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: FAINT }}>Loading…</div>
  )
  if (!estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: FAINT }}>Contract not found.</div>
  )

  function getPoint(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * 600, y: ((e.clientY - rect.top) / rect.height) * 200 }
  }

  async function handleAction() {
    if (trigger === 'sign') {
      if (paths.length === 0) { alert('Please sign before submitting'); return }
      if (!agreedToTerms) { alert('Please agree to the terms before signing'); return }
    }
    setSending(true)
    try {
      const estimateUpdate: Record<string, unknown> = {}
      if (urlPayment) estimateUpdate.payment_method  = urlPayment
      if (urlDeposit) estimateUpdate.deposit_percent = parseFloat(urlDeposit!)
      if (Object.keys(estimateUpdate).length > 0) {
        await supabase.from('estimates').update(estimateUpdate).eq('id', id)
      }

      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          estimate_id: id, profile_id: profile?.id,
          status: trigger === 'sign' ? 'signing' : 'sent',
          contract_terms_snapshot: profile?.contract_terms,
          contractor_signature_url: profile?.signature_url,
          company_name: profile?.company_name || '',
          company_email: profile?.email || '',
          company_phone: profile?.phone || '',
          ...(urlDeposit ? { deposit_percent: parseFloat(urlDeposit) } : {}),
          ...(urlPayment ? { payment_method: urlPayment } : {}),
        })
        .select().single()

      if (error || !contract) { alert('Error creating contract: ' + error?.message); return }

      if (trigger === 'sign') {
        const svgElement = svgRef.current
        if (!svgElement) { setSending(false); return }
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const offscreen = document.createElement('canvas')
        offscreen.width = 600; offscreen.height = 200
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: contract.id, signatureBase64, clientName: estimate?.client_name }),
        })
        const result = await res.json()
        if (!res.ok) { setSending(false); alert('Signing failed: ' + (result.error || 'Unknown error')); return }
        setClientSigUrl(result.signatureUrl)
        await Promise.allSettled([
          fetch('/api/notify-contractor-signed', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorEmail: profile?.email || '', contractorName: profile?.company_name || '',
              clientName: estimate?.client_name || '', companyName: profile?.company_name || 'Your Company',
              total: estimate?.total || 0, depositPercent: depositPct, contractId: contract.id,
            }),
          }),
          fetch('/api/deposit-invoice', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimateId: id }),
          }),
        ])
        setShowSuccess(true)
        return
      }

      if (!estimate?.client_email) { alert('No client email on this estimate'); return }
      await fetch('/api/send-contract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id, estimateId: id,
          clientEmail: estimate.client_email, clientName: estimate.client_name,
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

  const contractId  = 'CON-' + estimate.id.slice(0, 6).toUpperCase()
  const createdDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.created_at))
  const depositPct  = urlDeposit ? parseFloat(urlDeposit) : (profile?.deposit_percent ?? 30)
  const depositAmt  = estimate.total * (depositPct / 100)
  const balanceAmt  = estimate.total - depositAmt
  const isEmpty     = paths.length === 0
  const payMethods: string[] = Array.isArray(profile?.payment_methods) ? profile!.payment_methods! : []
  const clauses = (() => {
    try {
      const raw = profile?.contract_clauses
      if (!raw) return []
      const parsed = Array.isArray(raw) ? raw : JSON.parse(raw as string)
      return (parsed as any[]).filter(c => c.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    } catch { return [] }
  })()
  const hasDetails = !!(profile?.warranty_period || profile?.completion_timeframe || profile?.project_manager || payMethods.length > 0)

  return (
    <>
      {/* ── SUCCESS OVERLAY ── */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 10, textAlign: 'center' }}>You're all signed!</div>
          <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
            Thank you, <strong style={{ color: NAVY }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
          </div>
          <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 6 }}>Deposit Due</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
            <div style={{ fontSize: 13, color: FAINT, marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
            <div style={{ height: 1, background: GRAY_BG, marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: FAINT }}>Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />SIGNED
              </span>
            </div>
            {estimate.client_email && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: FAINT }}>Sent to</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{estimate.client_email}</span>
              </div>
            )}
          </div>
          <button style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: BLUE, cursor: 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 20 }}>
            Resend confirmation email →
          </button>
          <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: FAINT, cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
            Done
          </button>
        </div>
      )}

      {/* ── MAIN PAGE ── */}
      <div style={{ minHeight: '100vh', background: GRAY_BG, fontFamily: F, display: 'flex', flexDirection: 'column' }}>

        <AppTopBar onBack={() => router.back()} backLabel="Back" title="Contract" />

        {/* HEADER — Variant 2: left white + right blue */}
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '14px 16px', background: '#fff', minWidth: 0 }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain', display: 'block', marginBottom: 6 }} />
            )}
            <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 2 }}>{profile?.company_name || 'Your Company'}</div>
            {profile?.phone                && <div style={{ fontSize: 11, color: MUTED }}>{profile.phone}</div>}
            {profile?.company_contact_email && <div style={{ fontSize: 11, color: MUTED }}>{profile.company_contact_email}</div>}
            {(profile?.city || profile?.province) && <div style={{ fontSize: 11, color: MUTED }}>{[profile?.city, profile?.province].filter(Boolean).join(', ')}</div>}
            {profile?.licence              && <div style={{ fontSize: 11, color: MUTED }}>Lic# {profile.licence}</div>}
          </div>
          <div style={{ background: BLUE, padding: '14px 16px', textAlign: 'right', flexShrink: 0, minWidth: 148, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Installation Contract</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{contractId}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{createdDate}</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '16px 16px 160px', flex: 1 }}>

          {/* PARTIES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: GRAY_BG, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 6 }}>Contractor</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{profile?.company_name || '—'}</div>
              {profile?.phone        && <div style={{ fontSize: 11, color: MUTED }}>{profile.phone}</div>}
              {profile?.email        && <div style={{ fontSize: 11, color: MUTED }}>{profile.email}</div>}
              {profile?.address      && <div style={{ fontSize: 11, color: MUTED }}>{[profile.address, profile.city, profile.province].filter(Boolean).join(', ')}</div>}
              {profile?.licence      && <div style={{ fontSize: 11, color: MUTED }}>Lic# {profile.licence}</div>}
              {profile?.insurance    && <div style={{ fontSize: 11, color: MUTED }}>Ins# {profile.insurance}</div>}
              {profile?.wsib_number  && <div style={{ fontSize: 11, color: MUTED }}>WSIB# {profile.wsib_number}</div>}
              {profile?.gst_hst_number && <div style={{ fontSize: 11, color: MUTED }}>GST/HST# {profile.gst_hst_number}</div>}
            </div>
            <div style={{ background: GRAY_BG, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 6 }}>Client</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{estimate.client_name || '—'}</div>
              {estimate.client_phone   && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_phone}</div>}
              {estimate.client_email   && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_email}</div>}
              {estimate.client_address && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_address}</div>}
              {(estimate.client_city || estimate.client_province) && (
                <div style={{ fontSize: 11, color: MUTED }}>{[estimate.client_city, estimate.client_province, estimate.client_postal_code].filter(Boolean).join(', ')}</div>
              )}
              {estimate.job_site_same_as_client === false && estimate.job_site_address && (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Site: {[estimate.job_site_address, estimate.job_site_city, estimate.job_site_province].filter(Boolean).join(', ')}</div>
              )}
            </div>
          </div>

          {/* SCOPE OF WORK */}
          <SecLabel>Scope of Work</SecLabel>
          {openings.map((op, i) => {
            const typeName  = OPENING_TYPES[op.type]?.name || humanize(op.type)
            const subLabel  = getSubtypeLabel(op as any)
            const title     = [op.qty > 1 ? `${op.qty}×` : null, typeName, subLabel ? `(${subLabel})` : null].filter(Boolean).join(' ')
            const extColour = getColourLabel(op as any)
            const intColour = getInteriorColourLabel(op as any)
            const floorVal  = op.floor && op.floor !== 'first' ? (FLOOR_LABELS[op.floor] || humanize(op.floor)) : null
            const gridVal   = (op as any).grid
              ? ((op as any).grille_type ? humanize((op as any).grille_type) : 'Yes')
              : (op.grid_pattern && op.grid_pattern !== 'none' ? humanize(op.grid_pattern) : null)
            const paneLabel = (op as any).pane === 'triple' ? 'Triple Pane' : (op as any).pane === 'single' ? 'Single Pane' : null

            const glassChips: string[] = []
            if (paneLabel)                                    glassChips.push(paneLabel)
            if (op.glass_kind && op.glass_kind !== 'clear')  glassChips.push(humanize(op.glass_kind))
            if (op.low_e)                                     glassChips.push('Low-E')
            if ((op as any).argon)                            glassChips.push('Argon')
            if (op.tempered)                                  glassChips.push('Tempered')
            if ((op as any).laminated_glass)                  glassChips.push('Laminated')

            const extraPills: string[] = []
            if (op.has_screen)        extraPills.push('Screen')
            if (op.tilt_clean)        extraPills.push('Tilt-in')
            if (op.opening_direction) extraPills.push(DIRECTION_LABELS[op.opening_direction] || humanize(op.opening_direction))
            if (op.panels_count)      extraPills.push(`${op.panels_count} panels`)
            if (op.bay_angle)         extraPills.push(`${op.bay_angle}°`)
            if (op.sidelight_left)    extraPills.push(`← SL ${op.sidelight_left}"`)
            if (op.sidelight_right)   extraPills.push(`→ SL ${op.sidelight_right}"`)
            if (op.transom_above)     extraPills.push('Transom above')
            if (op.glass_type)        extraPills.push(GLASS_TYPE_LABELS[op.glass_type] || humanize(op.glass_type))
            if (op.core_type)         extraPills.push(CORE_LABELS[op.core_type] || humanize(op.core_type))
            if (op.brand)             extraPills.push(op.brand)

            return (
              <div key={op.id} style={{ border: `0.5px solid ${BORDER}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: GRAY_BG, padding: '8px 12px', borderBottom: `0.5px solid ${BORDER}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: FAINT, width: 20, marginRight: 8, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, flex: 1 }}>{title}{op.room ? ` — ${op.room}` : ''}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: BLUE, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</span>
                </div>
                <div style={{ display: 'flex', padding: 10 }}>
                  <div style={{ width: 110, marginRight: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <WindowDiagram type={op.type} widthIn={op.width_in || undefined} heightIn={op.height_in || undefined} size={100} />
                    {op.width_in && op.height_in && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginTop: 3, textAlign: 'center' }}>{op.width_in}" × {op.height_in}"</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {(op.room || floorVal) && (
                      <>
                        <GrpHdr>Location</GrpHdr>
                        <SpecRow label="Room"  value={op.room} />
                        <SpecRow label="Floor" value={floorVal} />
                      </>
                    )}
                    <GrpHdr>Product</GrpHdr>
                    <SpecRow label="Material"     value={humanize(op.material)} />
                    <SpecRow label="Ext. colour"  value={extColour || undefined} />
                    <SpecRow label="Int. colour"  value={intColour || undefined} />
                    <SpecRow label="Grid"         value={gridVal || undefined} />
                    <SpecRow label="Installation" value={op.install ? (INSTALL_LABELS[op.install] || humanize(op.install)) : undefined} />
                    <SpecRow label="Frame"        value={op.frame && op.frame !== 'none' ? humanize(op.frame) : undefined} />
                    {glassChips.length > 0 && (
                      <>
                        <GrpHdr>Glass</GrpHdr>
                        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 2 }}>
                          {glassChips.map(c => (
                            <div key={c} style={{ border: `0.5px solid ${BLUE}`, borderRadius: 3, padding: '2px 6px', marginRight: 4, marginBottom: 4 }}>
                              <span style={{ fontSize: 9, color: BLUE, fontWeight: 700 }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {extraPills.length > 0 && (
                      <>
                        <GrpHdr>Options</GrpHdr>
                        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 2 }}>
                          {extraPills.map(p => (
                            <div key={p} style={{ background: GRAY_BG, borderRadius: 3, padding: '2px 6px', marginRight: 4, marginBottom: 4 }}>
                              <span style={{ fontSize: 9, color: MUTED }}>{p}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {op.notes && (
                      <>
                        <GrpHdr>Notes</GrpHdr>
                        <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>{op.notes}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* TRIM & FINISHING */}
          {hasTrim(estimate) && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel>Trim &amp; Finishing</SecLabel>
              {trimSummaryLines(estimate).map(line => (
                <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `0.5px solid ${GRAY_BG}` }}>
                  <span style={{ fontSize: 13, color: MUTED }}>{line.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{line.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* PRICE SUMMARY */}
          <div style={{ marginBottom: 14 }}>
            <SecLabel>Price Summary</SecLabel>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', maxWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: NAVY }}>{fmtCAD(estimate.subtotal)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${BORDER}` }}>
                    <span style={{ fontSize: 13, color: MUTED }}>Discount</span>
                    <span style={{ fontSize: 13, color: NAVY }}>−{fmtCAD(estimate.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Tax{estimate.tax_rate ? ` (${(estimate.tax_rate * 100).toFixed(0)}%)` : ''}</span>
                  <span style={{ fontSize: 13, color: NAVY }}>{fmtCAD(estimate.tax_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: BLUE }}>{fmtCAD(estimate.total)}</span>
                </div>
              </div>
            </div>
            {depositPct > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div style={{ background: BLUE_BG, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: BLUE_D, marginBottom: 4 }}>Deposit on signing ({depositPct}%)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: BLUE_D }}>{fmtCAD(depositAmt)}</div>
                </div>
                <div style={{ background: BLUE_BG, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: BLUE_D, marginBottom: 4 }}>Balance on completion</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: BLUE_D }}>{fmtCAD(balanceAmt)}</div>
                </div>
              </div>
            )}
          </div>

          {/* CONTRACT DETAILS */}
          {hasDetails && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel>Contract Details</SecLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {profile?.warranty_period && (
                  <div style={{ background: GRAY_BG, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Warranty</div>
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{profile.warranty_period}</div>
                  </div>
                )}
                {profile?.completion_timeframe && (
                  <div style={{ background: GRAY_BG, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Completion Timeframe</div>
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{profile.completion_timeframe}</div>
                  </div>
                )}
                {payMethods.length > 0 && (
                  <div style={{ background: GRAY_BG, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Payment Methods</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{payMethods.join(', ')}</div>
                  </div>
                )}
                {profile?.project_manager && (
                  <div style={{ background: GRAY_BG, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Project Manager</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{profile.project_manager}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TERMS & CONDITIONS */}
          {clauses.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel>Terms &amp; Conditions</SecLabel>
              <div style={{ background: '#fff', borderRadius: 10, border: `0.5px solid ${BORDER}`, padding: '12px 14px' }}>
                {clauses.map((clause: any) => (
                  <div key={clause.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{clause.title}</div>
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{substituteProvince(clause.content, profile?.province)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIGNATURES */}
          <div style={{ marginBottom: 14 }}>
            <SecLabel>Signatures</SecLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Contractor</div>
                {profile?.signature_url ? (
                  <img src={profile.signature_url} alt="Contractor signature" style={{ height: 50, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 4 }} />
                ) : (
                  <div style={{ height: 50, marginBottom: 4 }} />
                )}
                <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
                <div style={{ fontSize: 11, color: NAVY }}>{profile?.company_name || '—'}</div>
                {profile?.signing_rep_name  && <div style={{ fontSize: 10, color: MUTED }}>{profile.signing_rep_name}</div>}
                {profile?.signing_rep_title && <div style={{ fontSize: 10, color: MUTED }}>{profile.signing_rep_title}</div>}
                <div style={{ fontSize: 10, color: MUTED }}>{createdDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Client</div>
                {trigger === 'sign' ? (
                  clientSigUrl ? (
                    <img src={clientSigUrl} alt="Client signature" style={{ height: 50, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 4 }} />
                  ) : (
                    <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', marginBottom: 4 }}>
                      <svg
                        ref={svgRef}
                        viewBox="0 0 600 200"
                        style={{ width: '100%', height: 80, border: `2px dashed ${BORDER}`, borderRadius: 10, background: '#fff', display: 'block', cursor: 'crosshair' }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          const p = getPoint(e); setCurrentPath(`M ${p.x} ${p.y}`); setIsDrawing(true)
                        }}
                        onPointerMove={(e) => {
                          if (!isDrawing) return
                          const p = getPoint(e); setCurrentPath(prev => prev + ` L ${p.x} ${p.y}`)
                        }}
                        onPointerUp={() => {
                          if (currentPath) setPaths(prev => [...prev, currentPath])
                          setCurrentPath(''); setIsDrawing(false)
                        }}
                      >
                        {paths.map((d, idx) => <path key={idx} d={d} stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
                        {currentPath && <path d={currentPath} stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                        {isEmpty && !isDrawing && <text x="300" y="105" textAnchor="middle" fill="#C0C8D0" fontSize="14" fontFamily="sans-serif">Sign here</text>}
                      </svg>
                      {!isEmpty && (
                        <button onClick={() => { setPaths([]); setCurrentPath(''); setIsDrawing(false) }}
                          style={{ background: 'none', border: 'none', fontSize: 11, color: FAINT, cursor: 'pointer', padding: '2px 0', fontFamily: F }}>
                          Clear
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ height: 50, border: `1.5px dashed ${BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: FAINT }}>Awaiting signature</span>
                  </div>
                )}
                <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
                <div style={{ fontSize: 11, color: NAVY }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {clientSigUrl
                    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
                    : 'Date: ___________'}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CTA */}
          {trigger === 'sign' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 40 }}>
              <div
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 12, border: agreedToTerms ? `1.5px solid ${BLUE}` : `1.5px solid ${BORDER}`, cursor: 'pointer' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, background: agreedToTerms ? BLUE : '#fff', border: agreedToTerms ? 'none' : `1.5px solid ${BORDER}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {agreedToTerms && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2.5" /></svg>}
                </div>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  I have read and agree to the <span style={{ color: BLUE, fontWeight: 600 }}>Terms &amp; Conditions</span> and authorize the work described in this contract.
                </p>
              </div>
              <button
                onClick={handleAction}
                disabled={isEmpty || !agreedToTerms || sending}
                style={{ width: '100%', background: BLUE, border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: (isEmpty || !agreedToTerms || sending) ? 'not-allowed' : 'pointer', opacity: (isEmpty || !agreedToTerms || sending) ? 0.5 : 1, fontFamily: F }}>
                {sending ? 'Signing…' : 'I Agree — Sign Contract'}
              </button>
            </div>
          ) : (
            <div style={{ paddingBottom: 40 }}>
              <button onClick={handleAction} disabled={sending}
                style={{ width: '100%', background: BLUE, border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: sending ? 0.7 : 1, fontFamily: F }}>
                {sending ? 'Sending…' : 'Send to client →'}
              </button>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderTop: `1px solid ${BORDER}`, marginTop: 24, fontSize: 11, color: FAINT, gap: 12 }}>
            <div>{[
              profile?.address ? [profile.address, profile.city, profile.province].filter(Boolean).join(', ') : null,
              profile?.gst_hst_number ? `GST/HST# ${profile.gst_hst_number}` : null,
              profile?.website ? profile.website.replace(/^https?:\/\//i, '') : null,
            ].filter(Boolean).join(' · ')}</div>
            <div style={{ flexShrink: 0 }}>{contractId}</div>
          </div>

        </div>
      </div>
    </>
  )
}
