'use client'
import { useEffect, useState, useRef } from 'react'
import { SuccessBanner } from '@/components/SuccessBanner'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'
import { getColourLabel, getGlassLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { substituteProvince } from '@/lib/provinces'
import { getEffectiveClauses } from '@/lib/contractClauses'
import { getCompanyName } from '@/lib/getCompanyName'
import { OpeningDrawing } from '@/components/estimate-builder-v2/opening-drawing'
import AppTopBar from '@/components/AppTopBar'

interface Opening {
  id: string; type: string; qty: number; total_cost: number
  width_in: number | null; height_in: number | null
  colour: string | null; glass: string | null; frame: string | null; floor: string | null
  install: string | null; shape: string | null; material: string | null; brand: string | null
  room: string | null; notes: string | null; grid_pattern: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  window_subtype?: string | null
  sections?: { type: string; width: number }[] | null
  glass_type: string | null; core_type: string | null
  custom_colour_label: string | null; custom_shape_label: string | null
  colour_palette_id?: string | null; colour_name?: string | null
  glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null
  interior_colour_palette_id?: string | null; interior_colour_name?: string | null; interior_colour?: string | null
}
interface Profile {
  id: string
  company_name: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; province: string | null; postal: string | null; website: string | null
  licence: string | null
  contract_terms: string | null; deposit_percent: number | null
  signature_url: string | null; logo_url: string | null
  warranty_period: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  project_manager: string | null; contract_clauses: string | null
  gst_hst_number: string | null; signing_rep_name: string | null; signing_rep_title: string | null
  warranty_summary: string | null
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
const HAIR  = 'rgba(15,23,42,0.08)'
const HAIR_S = 'rgba(15,23,42,0.14)'
const BLUE  = '#2563EB'
const BLUE_D = '#1D4ED8'
const INK   = '#0B1220'
const INK_M = '#475467'
const INK_S = '#94A0B4'

const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }

const SECTION_TYPE_MAP: Record<string, string> = {
  'Casement': 'casement', 'Fixed': 'picture', 'Picture': 'picture',
  'Slider': 'slider', 'Awning': 'awning', 'Single Hung': 'singleHung',
}
function parseSections(raw: any): { type: string; width: number }[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

const sheetStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 6,
  boxShadow: '0 1px 3px rgba(15,23,42,0.10), 0 8px 24px rgba(15,23,42,0.08)',
  padding: '22px 20px 26px',
  marginBottom: 14,
}

function SecTitle({ children, mt }: { children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', paddingBottom: 7, borderBottom: `1px solid ${HAIR_S}`, marginTop: mt }}>
      {children}
    </div>
  )
}

function DetCard({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px', height: '100%', boxSizing: 'border-box', ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
    </div>
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
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>('Your Contractor')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)

  const svgRef                                        = useRef<SVGSVGElement>(null)
  const [paths,              setPaths]              = useState<string[]>([])
  const [currentPath,        setCurrentPath]        = useState<string>('')
  const [isDrawing,          setIsDrawing]          = useState(false)
  const [agreedToTerms,      setAgreedToTerms]      = useState(false)
  const [showSuccess,        setShowSuccess]        = useState(false)
  const [clientSignatureUrl, setClientSignatureUrl] = useState<string | null>(null)
  const [flash,              setFlash]              = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: ops, error: opsErr }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('*').eq('estimate_id', id).order('created_at', { ascending: true }),
      ])
      if (opsErr) console.error('[contract page] openings error:', opsErr)
      if (!est) { setLoading(false); return }
      setEstimate(est)
      setOpenings(ops || [])
      const estOwnerId = est.user_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, company_name, phone, email, address, city, province, postal, website, licence, signature_url, contract_terms, logo_url, deposit_percent, warranty_period, warranty_summary, completion_timeframe, payment_methods, project_manager, contract_clauses, gst_hst_number, signing_rep_name, signing_rep_title')
        .eq('id', estOwnerId)
        .single()
      if (prof) setProfile(prof as Profile)
      const name = await getCompanyName(supabase, est.user_id)
      setResolvedCompanyName(name)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: INK_S }}>
      Loading…
    </div>
  )
  if (!estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: INK_S }}>
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

  function showFlash(message: string, variant: 'success' | 'error' = 'error') {
    setFlash({ message, variant })
    if (variant !== 'success') setTimeout(() => setFlash(null), 3500)
  }

  async function handleAction() {
    if (trigger === 'sign') {
      if (paths.length === 0) { showFlash('Please sign before submitting'); return }
      if (!agreedToTerms) { showFlash('Please agree to the terms before signing'); return }
    }

    setSending(true)
    try {
      const estimateUpdate: Record<string, unknown> = {}
      if (urlPayment) estimateUpdate.payment_method  = urlPayment
      if (urlDeposit) estimateUpdate.deposit_percent = parseFloat(urlDeposit!)
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
          company_name: resolvedCompanyName,
          company_email: profile?.email || '',
          company_phone: profile?.phone || '',
          ...(urlDeposit ? { deposit_percent: parseFloat(urlDeposit) } : {}),
          ...(urlPayment ? { payment_method: urlPayment } : {}),
        })
        .select()
        .single()

      if (error || !contract) {
        showFlash('Error creating contract: ' + (error?.message || 'Unknown error'))
        return
      }

      if (trigger === 'sign') {
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
          showFlash('Could not render signature. Please try again.')
          return
        }

        const res = await fetch('/api/sign-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: contract.id, signatureBase64, clientName: estimate?.client_name }),
        })
        const result = await res.json()
        if (!res.ok) {
          setSending(false)
          showFlash('Signing failed: ' + (result.error || 'Unknown error'))
          return
        }

        setClientSignatureUrl(result.signatureUrl)

        await Promise.allSettled([
          fetch('/api/notify-contractor-signed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorEmail: profile?.email || '',
              contractorName: resolvedCompanyName,
              clientName: estimate?.client_name || '',
              companyName: resolvedCompanyName,
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

      if (!estimate?.client_email) { showFlash('No client email on this estimate'); return }
      await fetch('/api/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          estimateId: id,
          clientEmail: estimate.client_email,
          clientName: estimate.client_name,
          companyName: resolvedCompanyName,
        }),
      })
      showFlash('Contract sent to ' + estimate.client_email, 'success')
      setTimeout(() => router.push(`/dashboard/estimates/${id}`), 1600)
    } catch (e: any) {
      showFlash('Error: ' + (e?.message || JSON.stringify(e)))
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
  const companyName = resolvedCompanyName
  const taxRate     = estimate.subtotal > 0 ? Math.round(estimate.tax_amount / estimate.subtotal * 100) : 0
  const taxLabel    = estimate.tax_amount > 0 ? (taxRate > 0 ? `Tax (${taxRate}%)` : 'Tax') : null

  const enabledClauses = getEffectiveClauses(profile?.contract_clauses)
    .filter(c => c.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const paymentValue = urlPayment || (profile?.payment_methods && profile.payment_methods.length > 0 ? profile.payment_methods.join(', ') : null)

  const detCards: { label: string; value: string }[] = []
  if (profile?.warranty_period)      detCards.push({ label: 'Warranty period',       value: profile.warranty_period })
  if (profile?.completion_timeframe) detCards.push({ label: 'Completion timeframe',  value: profile.completion_timeframe })
  if (paymentValue)                  detCards.push({ label: 'Accepted payment',       value: paymentValue })

  const ctaDisabled = trigger === 'sign' ? (isEmpty || !agreedToTerms || sending) : sending

  return (
    <>
      {/* ── SUCCESS OVERLAY ── */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginBottom: 10, textAlign: 'center' }}>You're all signed!</div>
          <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
            Thank you, <strong style={{ color: INK }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
          </div>
          <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 6 }}>Deposit Due</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
            <div style={{ fontSize: 13, color: INK_S, marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
            <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: INK_S }}>Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />SIGNED
              </span>
            </div>
            {estimate.client_email && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: INK_S }}>Sent to</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{estimate.client_email}</span>
              </div>
            )}
          </div>
          <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: INK_S, cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
            Done
          </button>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{ minHeight: '100vh', background: '#E9ECF2', fontFamily: F, display: 'flex', flexDirection: 'column' }}>

        <AppTopBar onBack={() => router.back()} backLabel="Back" title="Contract" />

        {/* Scrollable document area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 140px', maxWidth: 390, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* ═══ SHEET 1 — SCOPE ═══ */}
          <div style={sheetStyle}>

            {/* Doc header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 15, borderBottom: `2px solid ${BLUE}`, marginBottom: 16 }}>
              {/* Logo / monogram */}
              <div style={{ height: 34, maxWidth: '46%', minWidth: 0, flexShrink: 0, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 34, background: BLUE, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{companyName.charAt(0).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</span>
                  </div>
                )}
              </div>
              {/* Contract meta */}
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: BLUE }}>Installation Contract</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>{contractId}</div>
                <div style={{ fontSize: 10.5, color: INK_S, marginTop: 2 }}>{createdDate}</div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 5 }}>Company</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{companyName}</div>
                <div style={{ fontSize: 10.5, color: INK_M, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
                  {profile?.phone && <div>{profile.phone}</div>}
                  {profile?.email && <div>{profile.email}</div>}
                </div>
              </div>
              <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 5 }}>Client</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 10.5, color: INK_M, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
                  {estimate.client_phone   && <div>{estimate.client_phone}</div>}
                  {estimate.client_email   && <div>{estimate.client_email}</div>}
                  {estimate.client_address && <div>{estimate.client_address}</div>}
                  {(estimate.client_city || estimate.client_province) && (
                    <div>{[estimate.client_city, estimate.client_province].filter(Boolean).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Scope of Work */}
            <SecTitle>Scope of Work</SecTitle>

            {openings.map((op, i) => {
              const resolvedType = V2_TO_OLD_TYPE_KEY[op.type] || op.type
              const nameLabel = resolvedType === 'window_arch'
                ? 'Special shape'
                : (OPENING_TYPES[resolvedType]?.name ?? V2_TYPE_LABELS[op.type] ?? op.type)
              const name = `${nameLabel}${op.window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''}`
              const extCol      = op.colour && op.colour !== 'white' ? getColourLabel(op) : null
              const intCol      = getInteriorColourLabel(op)
              const glass       = getGlassLabel(op)
              const installLbl  = (op.install  && op.install  !== 'retrofit') ? (INSTALL_LABELS[op.install]   || op.install)  : null
              const materialLbl = (op.material && op.material !== 'vinyl')    ? (MATERIAL_LABELS[op.material] || op.material) : null
              const isCombo = op.type === 'combination' || op.type === 'window_combo'
              const comboSecs = isCombo ? parseSections(op.sections) : []
              const borderStyle = i < openings.length - 1 ? `1px solid ${HAIR}` : 'none'

              if (isCombo) {
                return (
                  <div key={op.id} style={{ padding: '14px 0', borderBottom: borderStyle }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 0 }}>{name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: INK_S, marginBottom: 10 }}>
                      Qty {op.qty}{op.width_in && op.height_in ? ` · ${op.width_in}" × ${op.height_in}"` : ''}{comboSecs.length > 0 ? ` · ${comboSecs.length} sections` : ''}
                    </div>
                    <div style={{ maxWidth: 280, margin: '0 auto', marginBottom: 12 }}>
                      <OpeningDrawing op={{ ...op, type: resolvedType, colour: null }} hideComboLabels />
                    </div>
                    {comboSecs.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {comboSecs.map((sec, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: idx < comboSecs.length - 1 ? `1px solid ${HAIR}` : 'none' }}>
                            <div style={{ fontSize: 10, color: INK_S, width: 16, textAlign: 'right' as const, flexShrink: 0 }}>{idx + 1}.</div>
                            <div style={{ width: 34, flexShrink: 0, pointerEvents: 'none' as const }}>
                              <OpeningDrawing op={{ id: `${op.id}-s${idx}`, type: SECTION_TYPE_MAP[sec.type] ?? 'picture' }} />
                            </div>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{sec.type}</span>
                              <span style={{ fontSize: 11, color: INK_S }}> · {sec.width}"</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(extCol || intCol || glass || installLbl || materialLbl) && (
                      <div style={{ fontSize: 11, color: INK_M, lineHeight: 1.6 }}>
                        {(extCol || intCol) && (
                          <div>
                            {extCol && <>Ext. <strong style={{ color: INK, fontWeight: 600 }}>{extCol}</strong></>}
                            {extCol && intCol && ' · '}
                            {intCol && <>Int. <strong style={{ color: INK, fontWeight: 600 }}>{intCol}</strong></>}
                          </div>
                        )}
                        {glass && <div>Glass: <strong style={{ color: INK, fontWeight: 600 }}>{glass}</strong></div>}
                        {(installLbl || materialLbl) && (
                          <div>
                            {installLbl && <>Install: <strong style={{ color: INK, fontWeight: 600 }}>{installLbl}</strong></>}
                            {installLbl && materialLbl && ' · '}
                            {materialLbl && <>Material: <strong style={{ color: INK, fontWeight: 600 }}>{materialLbl}</strong></>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div key={op.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: borderStyle }}>
                  <div style={{ width: 74, flexShrink: 0, paddingTop: 2 }}>
                    <OpeningDrawing op={{ ...op, type: resolvedType, colour: null }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: INK_S, marginBottom: 5 }}>
                      Qty {op.qty}{op.width_in && op.height_in ? ` · ${op.width_in}" × ${op.height_in}"` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: INK_M, lineHeight: 1.6 }}>
                      {(extCol || intCol) && (
                        <div>
                          {extCol && <>Ext. <strong style={{ color: INK, fontWeight: 600 }}>{extCol}</strong></>}
                          {extCol && intCol && ' · '}
                          {intCol && <>Int. <strong style={{ color: INK, fontWeight: 600 }}>{intCol}</strong></>}
                        </div>
                      )}
                      {glass && (
                        <div>Glass: <strong style={{ color: INK, fontWeight: 600 }}>{glass}</strong></div>
                      )}
                      {(installLbl || materialLbl) && (
                        <div>
                          {installLbl  && <>Install: <strong style={{ color: INK, fontWeight: 600 }}>{installLbl}</strong></>}
                          {installLbl && materialLbl && ' · '}
                          {materialLbl && <>Material: <strong style={{ color: INK, fontWeight: 600 }}>{materialLbl}</strong></>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Totals */}
            <div style={{ paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
                <span>Subtotal</span>
                <span style={{ minWidth: 92, textAlign: 'right', color: INK, fontWeight: 600 }}>{fmtCAD(estimate.subtotal)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
                  <span>Discount</span>
                  <span style={{ minWidth: 92, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              {taxLabel && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
                  <span>{taxLabel}</span>
                  <span style={{ minWidth: 92, textAlign: 'right', color: INK, fontWeight: 600 }}>{fmtCAD(estimate.tax_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 15, fontWeight: 800, color: INK, padding: '8px 0', marginTop: 6, borderTop: `1px solid ${HAIR_S}` }}>
                <span>Total</span>
                <span style={{ minWidth: 92, textAlign: 'right', color: BLUE_D, fontWeight: 800 }}>{fmtCAD(estimate.total)}</span>
              </div>
            </div>

            {/* Payment band */}
            <div style={{ background: '#F4F7FE', border: '1px solid rgba(37,99,235,0.14)', borderRadius: 8, padding: '12px 14px', marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                <span style={{ color: BLUE_D, fontWeight: 700 }}>Deposit due upon signing ({depositPct}%)</span>
                <span style={{ color: BLUE_D, fontWeight: 800 }}>{fmtCAD(depositAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                <span style={{ color: INK_M }}>Balance on completion ({100 - depositPct}%)</span>
                <span style={{ fontWeight: 700 }}>{fmtCAD(balanceAmt)}</span>
              </div>
            </div>

            {/* Contract detail cards */}
            {detCards.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 16, alignItems: 'stretch' }}>
                {detCards.map((d, i) => <DetCard key={d.label} label={d.label} value={d.value} fullWidth={detCards.length % 2 === 1 && i === detCards.length - 1} />)}
              </div>
            )}

            {/* Sheet 1 footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_S, marginTop: 22, paddingTop: 10, borderTop: `1px solid ${HAIR}` }}>
              <span>{companyName} · Installation Contract</span>
              <span>Page 1 of 2</span>
            </div>
          </div>

          {/* ═══ SHEET 2 — TERMS + SIGNATURES ═══ */}
          <div style={sheetStyle}>

            {/* Terms & Conditions */}
            <SecTitle>Terms &amp; Conditions</SecTitle>

            {enabledClauses.map((clause, i) => (
              <div key={clause.id} style={{ padding: '11px 0', borderBottom: i < enabledClauses.length - 1 ? `1px solid ${HAIR}` : 'none' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>{clause.title}</div>
                <div style={{ fontSize: 11, color: INK_M, lineHeight: 1.65 }}>
                  {substituteProvince(clause.content, profile?.province)}
                </div>
              </div>
            ))}

            {/* Signatures */}
            <SecTitle mt={22}>Signatures</SecTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 18 }}>

              {/* Contractor */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 8 }}>Contractor</div>
                <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {profile?.signature_url
                    ? <img src={profile.signature_url} alt="Contractor signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                    : <div style={{ height: 64 }} />
                  }
                </div>
                <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{profile?.signing_rep_name || companyName}</div>
                  <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>{companyName} · {createdDate}</div>
                </div>
              </div>

              {/* Client */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 8 }}>Client</div>
                <div style={{ height: 64 }}>
                  {trigger === 'sign' ? (
                    clientSignatureUrl ? (
                      <img src={clientSignatureUrl} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', height: '100%' }}>
                        <svg
                          ref={svgRef}
                          viewBox="0 0 600 200"
                          style={{
                            width: '100%', height: 64,
                            border: '1.5px dashed rgba(37,99,235,0.45)',
                            borderRadius: 8,
                            background: '#F4F7FE',
                            display: 'block',
                            cursor: 'crosshair',
                          }}
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
                            <path key={i} d={d} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          ))}
                          {currentPath && (
                            <path d={currentPath} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                          {isEmpty && !isDrawing && (
                            <text x="300" y="100" textAnchor="middle" dominantBaseline="middle" fill="#2563EB" fontSize="34" fontFamily="sans-serif" fontWeight="600">Tap here to sign</text>
                          )}
                        </svg>
                        {!isEmpty && (
                          <button
                            onClick={() => { setPaths([]); setCurrentPath(''); setIsDrawing(false) }}
                            style={{ background: 'none', border: 'none', fontSize: 10, color: INK_S, cursor: 'pointer', padding: '2px 0', fontFamily: F }}>
                            Clear
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div style={{ width: '100%', height: 64, border: '1.5px dashed rgba(37,99,235,0.45)', borderRadius: 8, background: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: BLUE }}>Awaiting signature</span>
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{estimate.client_name || '—'}</div>
                  <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>
                    {clientSignatureUrl
                      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
                      : ' '}
                  </div>
                </div>
              </div>
            </div>

            {/* Sheet 2 footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_S, marginTop: 22, paddingTop: 10, borderTop: `1px solid ${HAIR}` }}>
              <span>{companyName} · Installation Contract</span>
              <span>Page 2 of 2</span>
            </div>
          </div>

        </div>

        {/* ── STICKY CTA ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          padding: '14px 16px calc(12px + env(safe-area-inset-bottom))',
          border: `1px solid ${HAIR_S}`,
          borderBottom: 'none',
          borderRadius: '18px 18px 0 0',
          boxShadow: '0 -6px 20px rgba(15,23,42,0.08)',
          fontFamily: F,
        }}>
          {trigger === 'sign' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10 }}>
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, accentColor: BLUE, flexShrink: 0 }}
              />
              <label htmlFor="agree-terms" style={{ fontSize: 11, color: INK_M, lineHeight: 1.5 }}>
                I have read and agree to the <span style={{ color: BLUE, fontWeight: 600 }}>Terms &amp; Conditions</span> and authorize the work described in this contract.
              </label>
            </div>
          )}
          {flash && (
            <SuccessBanner message={flash.message} variant={flash.variant}
              mode="floating" onDismiss={() => setFlash(null)} />
          )}
          <button
            onClick={handleAction}
            disabled={ctaDisabled}
            style={{
              width: '100%', background: BLUE, color: '#fff', border: 'none',
              borderRadius: 12, padding: 15,
              font: `800 15px ${F}`,
              opacity: ctaDisabled ? 0.45 : 1,
              cursor: ctaDisabled ? 'not-allowed' : 'pointer',
            }}>
            {trigger === 'sign'
              ? (sending ? 'Signing…' : 'Sign Contract')
              : (sending ? 'Sending…' : 'Send to client →')}
          </button>
        </div>

      </div>
    </>
  )
}
