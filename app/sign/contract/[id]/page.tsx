'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'
import { getSubtypeLabel, getColourLabel, getGlassLabel, getInteriorColourLabel } from '@/lib/openingLabels'
import { substituteProvince } from '@/lib/provinces'
import { getEffectiveClauses } from '@/lib/contractClauses'
import { OpeningDrawing } from '@/components/estimate-builder-v2/opening-drawing'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'
import { Download } from 'lucide-react'

interface Contract {
  id: string; estimate_id: string; profile_id: string; status: string
  contract_terms_snapshot: string | null; contractor_signature_url: string | null
  company_name: string | null; company_email: string | null; company_phone: string | null
  signed_at: string | null; created_at: string
  payment_method?: string; deposit_percent?: number
}
interface Estimate {
  id: string; estimate_number: string; created_at: string
  client_name: string | null; client_email: string | null; client_phone: string | null
  client_address: string | null; client_city: string | null; client_province: string | null
  subtotal: number; tax_amount: number; total: number; discount_amount: number
}
interface Opening {
  id: string; type: string; qty: number; total_cost: number
  window_subtype?: string | null
  width_in?: number | null; height_in?: number | null
  colour?: string | null; colour_name?: string | null; custom_colour_label?: string | null
  glass?: string | null; glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null
  shape?: string | null; has_screen?: boolean | null
  grid_pattern?: string | null; glass_type?: string | null; opening_direction?: string | null
  transom_panes?: string | null; sidelight_left?: number | null; sidelight_right?: number | null
  transom_above?: boolean | null; bay_angle?: string | null
  sections?: { type: string; width: number }[] | null
  open_mode?: string | null; center_window_type?: string | null; side_unit?: string | null; panel_type?: string | null
  install?: string | null; material?: string | null; room?: string | null
  interior_colour?: string | null; interior_colour_name?: string | null
  interior_colour_palette_id?: string | null; colour_palette_id?: string | null
}
interface Profile {
  warranty_period: string | null; deposit_percent: number | null; signature_url: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  project_manager: string | null; logo_url: string | null; phone: string | null
  city: string | null; province: string | null; address: string | null; postal: string | null
  contract_clauses: string | null; deposit_timing: string | null; deposit_required: boolean | null
  licence: string | null
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

export default function SignContractPage() {
  const params = useParams()
  const contractId = Array.isArray(params?.id) ? params.id[0] : params?.id as string
  const searchParams = useSearchParams()
  const isPdf = searchParams.get('pdf') === 'true'

  const svgRef = useRef<SVGSVGElement>(null)

  const [contract,           setContract]           = useState<Contract | null>(null)
  const [estimate,           setEstimate]           = useState<Estimate | null>(null)
  const [openings,           setOpenings]           = useState<Opening[]>([])
  const [profile,            setProfile]            = useState<Profile | null>(null)
  const [loading,            setLoading]            = useState(true)
  const [signing,            setSigning]            = useState(false)
  const [paths,              setPaths]              = useState<string[]>([])
  const [currentPath,        setCurrentPath]        = useState<string>('')
  const [isDrawing,          setIsDrawing]          = useState(false)
  const [agreedToTerms,      setAgreedToTerms]      = useState(false)
  const [showDeposit,        setShowDeposit]        = useState(false)
  const [showSuccess,        setShowSuccess]        = useState(false)
  const [clientSignatureUrl, setClientSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('print') === 'true') setTimeout(() => window.print(), 1500)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = '@media print { head { display: none; } }'
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!contract) return
    const num = estimate?.estimate_number || contract.id.slice(0, 8)
    const client = estimate?.client_name || 'Client'
    document.title = `Contract-${num}-${client}`
  }, [contract, estimate])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/contract/${contractId}`)
      if (!res.ok) { setLoading(false); return }
      const { contract: con, estimate: est, openings: ops, profile: prof } = await res.json()
      setContract(con)
      if (est) setEstimate(est)
      setOpenings(ops || [])
      if (prof) setProfile(prof as Profile)
      setLoading(false)
    }
    load()
  }, [contractId])

  function getPoint(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 600,
      y: ((e.clientY - rect.top) / rect.height) * 200,
    }
  }

  async function handleSign() {
    if (signing) return
    if (paths.length === 0) { alert('Please sign before submitting'); return }
    if (!contract) return
    setSigning(true)
    try {
      const svgElement = svgRef.current
      if (!svgElement) return

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
        alert('Could not render signature. Please try again.')
        return
      }

      const res = await fetch('/api/sign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract.id, signatureBase64, clientName: estimate?.client_name }),
      })
      const result = await res.json()
      if (!res.ok) { alert('Signing failed: ' + (result.error || 'Unknown error')); return }

      setClientSignatureUrl(result.signatureUrl)

      await Promise.allSettled([
        fetch('/api/send-contract-signed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: estimate?.client_email,
            clientName: estimate?.client_name,
            companyName: contract?.company_name || 'Your Contractor',
            companyPhone: contract?.company_phone || '',
            companyEmail: contract?.company_email || '',
            contractId,
            total: estimate?.total || 0,
          }),
        }),
        fetch('/api/notify-contractor-signed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractorEmail: contract?.company_email || '',
            contractorName: contract?.company_name || '',
            clientName: estimate?.client_name || '',
            companyName: contract?.company_name || 'Your Company',
            total: estimate?.total || 0,
            depositPercent: profile?.deposit_percent ?? contract?.deposit_percent ?? 10,
            contractId,
          }),
        }),
        fetch('/api/create-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateId: contract.estimate_id }),
        }),
      ])

      setShowDeposit(true)
    } finally {
      setSigning(false)
    }
  }

  async function handleDecline() {
    if (!confirm('Are you sure you want to decline this contract?')) return
    const res = await fetch(`/api/public/contract/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    if (res.ok) setContract(prev => prev ? { ...prev, status: 'declined' } : prev)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: INK_S }}>
      Loading…
    </div>
  )
  if (!contract || !estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: INK_S }}>
      Contract not found.
    </div>
  )

  const depositPct      = profile?.deposit_percent ?? contract?.deposit_percent ?? 10
  const depositRequired = profile?.deposit_required !== false
  const depositAmt      = estimate.total * (depositPct / 100)
  const balanceAmt      = estimate.total - depositAmt
  const companyName     = contract.company_name || 'Your Company'
  const conId           = 'CON-' + contract.id.slice(0, 6).toUpperCase()
  const createdDate     = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
  const signedDate      = contract.signed_at
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.signed_at))
    : '—'
  const taxRate         = estimate.subtotal > 0 ? Math.round(estimate.tax_amount / estimate.subtotal * 100) : 0
  const taxLabel        = estimate.tax_amount > 0 ? (taxRate > 0 ? `Tax (${taxRate}%)` : 'Tax') : null
  const enabledClauses  = getEffectiveClauses(profile?.contract_clauses).filter(c => c.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const paymentValue    = contract?.payment_method || (profile?.payment_methods && profile.payment_methods.length > 0 ? profile.payment_methods.join(', ') : null)

  const detCards: { label: string; value: string }[] = []
  if (profile?.warranty_period)      detCards.push({ label: 'Warranty period',      value: profile.warranty_period })
  if (profile?.completion_timeframe) detCards.push({ label: 'Completion timeframe', value: profile.completion_timeframe })
  if (paymentValue)                  detCards.push({ label: 'Accepted payment',      value: paymentValue })
  if (profile?.project_manager)      detCards.push({ label: 'Project manager',       value: profile.project_manager })

  const isSignedView = contract.status === 'signed' && !clientSignatureUrl
  const isEmpty = paths.length === 0

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0 !important; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0 !important; padding: 0 !important; min-height: auto !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── CLIENT POST-SIGN OVERLAY ── */}
      {showDeposit && !showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', marginBottom: 8, textAlign: 'center', letterSpacing: '-0.01em' }}>You're all signed!</div>
            <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
              Thank you, <strong style={{ color: '#0A1628' }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
            </div>
            <div style={{ width: '100%', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 14 }}>
              {depositRequired && <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1D4ED8', marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
              </>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />SIGNED
                </span>
              </div>
              {estimate.client_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Sent to</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{estimate.client_email}</span>
                </div>
              )}
            </div>
            <button style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: BLUE, cursor: 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 24 }}>
              Resend confirmation email →
            </button>
            <button onClick={() => setShowSuccess(true)}
              style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
              Done
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#CBD5E1' }}>
            Powered by ApexScale · useapexscale.com
          </div>
        </div>
      )}

      {/* ── CONTRACTOR POST-SIGN OVERLAY ── */}
      {showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
            <ApexScaleLogo theme="light" size={26} />
            <span style={{ fontSize: 10, fontWeight: 700, color: BLUE, background: '#EFF6FF', borderRadius: 6, padding: '4px 10px', letterSpacing: '0.06em' }}>{estimate.estimate_number}</span>
          </div>
          <div style={{ flex: 1, padding: '20px 16px 40px' }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Contract Signed!</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>Client will receive payment instructions by email</div>
            </div>
            {depositRequired && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 14 }}>What happens next</div>
              {([
                { icon: '✅', label: 'Contract signed',     status: 'Done',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '✅', label: 'Payment email sent',  status: 'Sent',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '⏳', label: 'Client pays deposit', status: 'Pending', bg: '#FFFBEB', color: '#D97706' },
              ] as { icon: string; label: string; status: string; bg: string; color: string }[]).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F1F3F7' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{step.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.color, background: step.bg, borderRadius: 20, padding: '3px 10px' }}>{step.status}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              style={{ width: '100%', height: 52, background: '#0A1628', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN DOCUMENT ── */}
      <div style={{ minHeight: isPdf ? 'auto' : '100vh', background: '#E9ECF2', fontFamily: F }}>
        <div style={{ padding: `12px 10px ${isSignedView || isPdf ? '24px' : '140px'}`, maxWidth: 390, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* ═══ SHEET 1 — SCOPE ═══ */}
          <div style={sheetStyle}>

            {/* Doc header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 15, borderBottom: `2px solid ${BLUE}`, marginBottom: 16 }}>
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
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: BLUE }}>Installation Contract</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>{conId}</div>
                <div style={{ fontSize: 10.5, color: INK_S, marginTop: 2 }}>{createdDate}</div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 5 }}>Company</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{companyName}</div>
                <div style={{ fontSize: 10.5, color: INK_M, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
                  {(contract.company_phone || profile?.phone) && <div>{contract.company_phone || profile?.phone}</div>}
                  {contract.company_email && <div>{contract.company_email}</div>}
                  {profile?.address && <div>{profile.address}</div>}
                  {(profile?.city || profile?.province) && <div>{[profile.city, profile.province].filter(Boolean).join(', ')}</div>}
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
              const name = `${OPENING_TYPES[resolvedType]?.name || V2_TYPE_LABELS[op.type] || op.type}${op.window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''}`
              const extCol      = op.colour && op.colour !== 'white' ? getColourLabel(op) : null
              const intCol      = getInteriorColourLabel(op)
              const glass       = getGlassLabel(op)
              const installLbl  = (op.install  && op.install  !== 'retrofit') ? (INSTALL_LABELS[op.install]   || op.install)  : null
              const materialLbl = (op.material && op.material !== 'vinyl')    ? (MATERIAL_LABELS[op.material] || op.material) : null

              const isCombo = op.type === 'combination' || op.type === 'window_combo'
              return (
                <div key={op.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < openings.length - 1 ? `1px solid ${HAIR}` : 'none' }}>
                  <div style={{ width: isCombo ? 160 : 74, flexShrink: 0, paddingTop: 2 }}>
                    <OpeningDrawing op={{ ...op, colour: null }} hideComboLabels={isCombo} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
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
            {depositRequired && (
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
            )}

            {/* Detail cards */}
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
                  {contract.contractor_signature_url
                    ? <img src={contract.contractor_signature_url} alt="Contractor signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                    : <div style={{ height: 64 }} />
                  }
                </div>
                <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{companyName}</div>
                  <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>{companyName} · {createdDate}</div>
                </div>
              </div>

              {/* Client */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 8 }}>Client</div>
                <div style={{ height: 64 }}>
                  {isSignedView ? (
                    (contract as any).client_signature_url
                      ? <img src={(contract as any).client_signature_url} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                      : <div style={{ height: 64 }} />
                  ) : clientSignatureUrl ? (
                    <img src={clientSignatureUrl} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                  ) : !isPdf ? (
                    <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', height: '100%' }}>
                      <svg
                        ref={svgRef}
                        viewBox="0 0 600 200"
                        style={{ width: '100%', height: 64, border: '1.5px dashed rgba(37,99,235,0.45)', borderRadius: 8, background: '#F4F7FE', display: 'block', cursor: 'crosshair' }}
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
                  ) : (
                    <div style={{ width: '100%', height: 64, border: '1.5px dashed rgba(37,99,235,0.45)', borderRadius: 8, background: '#F4F7FE' }} />
                  )}
                </div>
                <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{estimate.client_name || '—'}</div>
                  <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>
                    {isSignedView
                      ? signedDate
                      : clientSignatureUrl
                        ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
                        : ' '}
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

          {/* Download PDF — signed view only */}
          {isSignedView && !isPdf && (
            <a
              href={`/api/contract-pdf-gen?contractId=${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: BLUE, color: '#fff', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 24, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              <Download size={16} /> Download Contract
            </a>
          )}
        </div>

        {/* Sticky CTA — pending view only */}
        {!isSignedView && !isPdf && (
          <div className="no-print" style={{
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
            <button
              onClick={handleSign}
              disabled={isEmpty || !agreedToTerms || signing}
              style={{
                width: '100%', background: BLUE, color: '#fff', border: 'none',
                borderRadius: 12, padding: 15,
                font: `800 15px ${F}`,
                opacity: (isEmpty || !agreedToTerms || signing) ? 0.45 : 1,
                cursor: (isEmpty || !agreedToTerms || signing) ? 'not-allowed' : 'pointer',
                marginBottom: 8,
              }}>
              {signing ? 'Signing…' : 'Sign Contract'}
            </button>
            <button onClick={handleDecline}
              style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer', fontFamily: F }}>
              Decline
            </button>
          </div>
        )}
      </div>
    </>
  )
}
