'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { fmtCAD } from '@/lib/pricing'
import { getEffectiveClauses } from '@/lib/contractClauses'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ContractDocument, type ContractOpening, type ContractClause } from '@/components/contract/ContractDocument'

interface Contract {
  id: string; estimate_id: string; profile_id: string; status: string
  contract_terms_snapshot: string | null; contractor_signature_url: string | null
  client_signature_url?: string | null
  company_name: string | null; company_email: string | null; company_phone: string | null
  rep_name: string | null
  signed_at: string | null; created_at: string
  payment_method?: string; deposit_percent?: number
}
interface Estimate {
  id: string; estimate_number: string; created_at: string
  client_name: string | null; client_email: string | null; client_phone: string | null
  client_address: string | null; client_city: string | null; client_province: string | null
  subtotal: number; tax_amount: number; total: number; discount_amount: number
}
interface Profile {
  warranty_period: string | null; deposit_percent: number | null; signature_url: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  project_manager: string | null; logo_url: string | null; phone: string | null
  city: string | null; province: string | null; address: string | null; postal: string | null
  contract_clauses: string | null; deposit_timing: string | null; deposit_required: boolean | null
  licence: string | null
}

const F      = '"Inter", system-ui, sans-serif'
const HAIR_S = 'rgba(15,23,42,0.14)'
const BLUE   = '#2563EB'
const BLUE_D = '#1D4ED8'
const INK    = '#0B1220'
const INK_M  = '#475467'
const INK_S  = '#94A0B4'

function getTotalPathLength(paths: string[]): number {
  let total = 0
  for (const d of paths) {
    const tokens = d.trim().split(/\s+/)
    let prevX = 0, prevY = 0, i = 0
    while (i < tokens.length) {
      if (tokens[i] === 'M') { prevX = parseFloat(tokens[i + 1]); prevY = parseFloat(tokens[i + 2]); i += 3 }
      else if (tokens[i] === 'L') {
        const x = parseFloat(tokens[i + 1]), y = parseFloat(tokens[i + 2])
        total += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
        prevX = x; prevY = y; i += 3
      } else { i++ }
    }
  }
  return total
}

export default function SignContractPage() {
  const params     = useParams()
  const contractId = Array.isArray(params?.id) ? params.id[0] : params?.id as string
  const searchParams = useSearchParams()
  const isPdf      = searchParams.get('pdf') === 'true'

  const svgRef = useRef<SVGSVGElement>(null)

  const [contract,           setContract]           = useState<Contract | null>(null)
  const [estimate,           setEstimate]           = useState<Estimate | null>(null)
  const [openings,           setOpenings]           = useState<ContractOpening[]>([])
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
  const [isAnon,             setIsAnon]             = useState<boolean | null>(null)
  const [showClientConfirm,  setShowClientConfirm]  = useState(false)
  const [signingFailed,      setSigningFailed]      = useState(false)
  const [depositWarning,     setDepositWarning]     = useState(false)
  const [declineError,       setDeclineError]       = useState(false)
  const [resendingEmail,     setResendingEmail]     = useState(false)
  const [resendEmailMsg,     setResendEmailMsg]     = useState<'sent' | 'error' | null>(null)

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
    const num    = estimate?.estimate_number || contract.id.slice(0, 8)
    const client = estimate?.client_name || 'Client'
    document.title = `Contract-${num}-${client}`
  }, [contract, estimate])

  useEffect(() => {
    createClient().auth.getUser()
      .then(({ data }: any) => setIsAnon(!data?.user))
      .catch(() => setIsAnon(true))
  }, [])

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
    if (!hasValidSig) { alert('Please sign using your finger or stylus'); return }
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

      let signRes: Response
      try {
        signRes = await fetch('/api/sign-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: contract.id, signatureBase64, clientName: estimate?.client_name, agreedToTerms }),
        })
      } catch {
        setSigningFailed(true)
        return
      }
      const result = await signRes.json()
      if (!signRes.ok) {
        setSigningFailed(false)
        alert('Signing failed: ' + (result.error || 'Unknown error'))
        return
      }
      setSigningFailed(false)
      setClientSignatureUrl(result.signatureUrl as string)

      // sign-contract route fires notify + send-contract-signed server-side; only deposit needed here
      const depositRes = await fetch('/api/create-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: contract.estimate_id }),
      })
      if (!depositRes.ok) {
        console.error('[sign-contract] deposit invoice creation failed for estimate', contract.estimate_id)
        setDepositWarning(true)
      }

      if (isAnon !== false) {
        setShowClientConfirm(true)
      } else {
        setShowDeposit(true)
      }
    } finally {
      setSigning(false)
    }
  }

  async function handleResendEmail() {
    if (resendingEmail) return
    setResendingEmail(true)
    setResendEmailMsg(null)
    try {
      const res = await fetch('/api/sign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, resend: true }),
      })
      setResendEmailMsg(res.ok ? 'sent' : 'error')
    } catch {
      setResendEmailMsg('error')
    } finally {
      setResendingEmail(false)
    }
  }

  async function handleDecline() {
    if (!confirm('Are you sure you want to decline this contract?')) return
    setDeclineError(false)
    const res = await fetch(`/api/public/contract/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    if (res.ok) {
      setContract(prev => prev ? { ...prev, status: 'declined' } : prev)
    } else {
      setDeclineError(true)
    }
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
  const enabledClauses: ContractClause[] = getEffectiveClauses(profile?.contract_clauses)
    .filter((c: any) => c.enabled !== false)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  const hasFinalMeasurementsClause = enabledClauses.some(c => c.id === 'final_measurements')
  const paymentValue    = contract?.payment_method || (profile?.payment_methods && profile.payment_methods.length > 0 ? profile.payment_methods.join(', ') : null)

  const detCards: { label: string; value: string }[] = []
  if (profile?.warranty_period)      detCards.push({ label: 'Warranty period',      value: profile.warranty_period })
  if (profile?.completion_timeframe) detCards.push({ label: 'Completion timeframe', value: profile.completion_timeframe })
  if (paymentValue)                  detCards.push({ label: 'Accepted payment',      value: paymentValue })
  if (profile?.project_manager)      detCards.push({ label: 'Project manager',       value: profile.project_manager })

  const isSignedView = contract.status === 'signed' && !clientSignatureUrl
  const isEmpty      = paths.length === 0
  const hasValidSig  = getTotalPathLength(paths) >= 50
  const todayFmt     = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  const companyCityProvince = [profile?.city, profile?.province].filter(Boolean).join(', ') || null
  const clientCityProvince  = [estimate.client_city, estimate.client_province].filter(Boolean).join(', ') || null

  // Client signature slot
  const clientSignatureSlot = isSignedView ? (
    contract.client_signature_url
      ? <img src={contract.client_signature_url} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
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
  )

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

      {/* ── ANONYMOUS CLIENT POST-SIGN CONFIRMATION ── */}
      {showClientConfirm && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
            <ApexScaleLogo theme="light" size={26} />
          </div>
          <div style={{ flex: 1, padding: '36px 16px 24px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(22,163,74,0.10)', border: '1.5px solid rgba(22,163,74,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginBottom: 10, letterSpacing: '-0.01em' }}>Your contract is signed</div>
              <div style={{ fontSize: 14, color: '#475467', lineHeight: 1.65, maxWidth: 320, margin: '0 auto' }}>
                Thank you, <strong style={{ color: INK }}>{estimate.client_name}</strong>! A copy of the signed contract and payment instructions are on their way to your email.
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 2 }}>Contract</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{conId}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 12px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: '0.06em' }}>SIGNED</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>Project total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{fmtCAD(estimate.total)}</span>
              </div>
              {depositRequired && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>Deposit due ({depositPct}%)</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: BLUE }}>{fmtCAD(depositAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>Balance on completion</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{fmtCAD(balanceAmt)}</span>
                </div>
              </>}
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 14 }}>What happens next</div>
              {([
                estimate.client_email ? `Check your email (${estimate.client_email})` : 'Check your email for confirmation',
                depositRequired ? `Pay your deposit of ${fmtCAD(depositAmt)}` : 'Review your signed contract',
                hasFinalMeasurementsClause
                  ? 'We\'ll contact you to schedule final measurements within 10 days of receiving the deposit'
                  : 'We\'ll be in touch to schedule next steps',
              ] as string[]).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 13, color: INK, lineHeight: 1.55, flex: 1 }}>{step}</span>
                </div>
              ))}
            </div>
            <a
              href={`/api/contract-pdf-gen?contractId=${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 16, boxSizing: 'border-box' as const }}
            >
              <Download size={16} /> Download signed contract (PDF)
            </a>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginBottom: 24 }}>
              Questions about your order?{' '}
              <strong style={{ color: INK }}>{companyName}</strong>
              {(contract.company_phone || profile?.phone) && (
                <>{' · '}<a href={`tel:${(contract.company_phone || profile?.phone)!.replace(/\s/g, '')}`} style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>{contract.company_phone || profile?.phone}</a></>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#CBD5E1' }}>
            Powered by ApexScale · useapexscale.com
          </div>
        </div>
      )}

      {/* ── AUTHENTICATED REP POST-SIGN OVERLAY ── */}
      {showDeposit && !showSuccess && isAnon === false && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: INK, marginBottom: 8, textAlign: 'center', letterSpacing: '-0.01em' }}>You&apos;re all signed!</div>
            <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
              Thank you, <strong style={{ color: INK }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
            </div>
            <div style={{ width: '100%', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 14 }}>
              {depositRequired && <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: BLUE_D, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{estimate.client_email}</span>
                </div>
              )}
            </div>
            {resendEmailMsg === 'sent' && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#16A34A', textAlign: 'center' as const }}>
                Confirmation email resent ✓
              </div>
            )}
            {resendEmailMsg === 'error' && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#DC2626', textAlign: 'center' as const }}>
                Failed to resend — please try again.
              </div>
            )}
            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: resendingEmail ? INK_S : BLUE, cursor: resendingEmail ? 'not-allowed' : 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 24 }}
            >
              {resendingEmail ? 'Sending…' : 'Resend confirmation email →'}
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
              <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginBottom: 6 }}>Contract Signed!</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>Client will receive payment instructions by email</div>
            </div>
            {depositWarning && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400E' }}>
                Deposit invoice could not be created automatically — please send it manually from the Invoices tab.
              </div>
            )}
            {depositRequired && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 14 }}>What happens next</div>
              {([
                { icon: '✅', label: 'Contract signed',     status: 'Done',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '✅', label: 'Payment email sent',  status: 'Sent',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '⏳', label: 'Client pays deposit', status: 'Pending', bg: '#FFFBEB', color: '#D97706' },
              ] as { icon: string; label: string; status: string; bg: string; color: string }[]).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F1F3F7' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{step.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.color, background: step.bg, borderRadius: 20, padding: '3px 10px' }}>{step.status}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              style={{ width: '100%', height: 52, background: INK, border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN DOCUMENT ── */}
      <div style={{ minHeight: isPdf ? 'auto' : '100vh', background: '#E9ECF2', fontFamily: F }}>
        <ContractDocument
          companyName={companyName}
          contractDisplayId={conId}
          createdDate={createdDate}
          logoUrl={profile?.logo_url ?? null}
          companyPhone={contract.company_phone || profile?.phone || null}
          companyEmail={contract.company_email || null}
          companyAddress={profile?.address ?? null}
          companyCityProvince={companyCityProvince}
          clientName={estimate.client_name}
          clientPhone={estimate.client_phone}
          clientEmail={estimate.client_email}
          clientAddress={estimate.client_address}
          clientCityProvince={clientCityProvince}
          openings={openings}
          subtotal={estimate.subtotal}
          taxAmount={estimate.tax_amount}
          taxLabel={taxLabel}
          total={estimate.total}
          discountAmount={estimate.discount_amount}
          depositPct={depositPct}
          depositRequired={depositRequired}
          detCards={detCards}
          enabledClauses={enabledClauses}
          province={profile?.province ?? null}
          contractorSigUrl={contract.contractor_signature_url}
          repName={contract.rep_name || ''}
          clientSignatureSlot={clientSignatureSlot}
          clientSigDate={isSignedView ? signedDate : clientSignatureUrl ? todayFmt : ' '}
          downloadHref={isSignedView && !isPdf ? `/api/contract-pdf-gen?contractId=${contract.id}` : undefined}
          bottomPadding={isSignedView || isPdf ? 24 : 140}
        />

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
            {signingFailed && (
              <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#92400E', textAlign: 'center' as const }}>
                Connection lost — your signature is preserved. Tap below to retry.
              </div>
            )}
            <button
              onClick={handleSign}
              disabled={!hasValidSig || !agreedToTerms || signing || isAnon === null}
              style={{
                width: '100%', background: BLUE, color: '#fff', border: 'none',
                borderRadius: 12, padding: 15,
                font: `800 15px ${F}`,
                opacity: (!hasValidSig || !agreedToTerms || signing) ? 0.45 : 1,
                cursor: (!hasValidSig || !agreedToTerms || signing) ? 'not-allowed' : 'pointer',
                marginBottom: 8,
              }}>
              {signing ? 'Signing…' : signingFailed ? 'Retry signing →' : 'Sign Contract'}
            </button>
            {declineError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', marginBottom: 6, fontSize: 12, color: '#DC2626', textAlign: 'center' as const }}>
                Decline failed — please try again.
              </div>
            )}
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
