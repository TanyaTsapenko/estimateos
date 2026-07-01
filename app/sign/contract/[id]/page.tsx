'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'
import { getSubtypeLabel } from '@/lib/openingLabels'
import { substituteProvince } from '@/lib/provinces'
import { ApexScaleLogo } from '@/components/ApexScaleLogo'
import { Download } from 'lucide-react'

const NAVY    = '#0A1628'
const BLUE    = '#2563EB'
const BLUE_D  = '#1D4ED8'
const BLUE_BG = '#EEF3FF'
const GRAY_BG = '#F8FAFC'
const BORDER  = '#E2E8F0'
const MUTED   = '#64748B'
const FAINT   = '#94A3B8'
const F       = '"Inter", system-ui, sans-serif'

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
  client_address: string | null; subtotal: number; tax_amount: number; total: number
  discount_amount: number
}
interface Opening { id: string; type: string; qty: number; total_cost: number }
interface Profile {
  warranty_period: string | null; cancellation_policy: string | null
  deposit_percent: number | null; signature_url: string | null; contract_terms: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  customer_responsibilities: string | null; buyer_right_to_cancel: string | null
  damage_disclaimer: string | null; permits_responsibility: string | null; project_manager: string | null
  logo_url: string | null; phone: string | null; website: string | null
  city: string | null; province: string | null; address: string | null; postal: string | null
  contract_clauses: string | null
  deposit_timing: string | null
  deposit_required: boolean | null
  company_contact_email: string | null
  gst_hst_number: string | null
  licence: string | null
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 8, marginTop: 2 }}>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, border: `0.5px solid ${BORDER}`, marginBottom: 12, overflow: 'hidden',
}

function CardHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: '11px 14px', borderBottom: `0.5px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: NAVY }}>
      {title}
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
    const params = new URLSearchParams(window.location.search)
    if (params.get('print') === 'true') {
      setTimeout(() => window.print(), 1500)
    }
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
    return { x: ((e.clientX - rect.left) / rect.width) * 600, y: ((e.clientY - rect.top) / rect.height) * 200 }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract.id, signatureBase64, clientName: estimate?.client_name }),
      })
      const result = await res.json()
      if (!res.ok) { alert('Signing failed: ' + (result.error || 'Unknown error')); return }
      setClientSignatureUrl(result.signatureUrl)
      await Promise.allSettled([
        fetch('/api/send-contract-signed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: estimate?.client_email, clientName: estimate?.client_name,
            companyName: contract?.company_name || 'Your Contractor',
            companyPhone: contract?.company_phone || '', companyEmail: contract?.company_email || '',
            contractId: contractId, total: estimate ? estimate?.total || 0 : 0,
          }),
        }),
        fetch('/api/notify-contractor-signed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractorEmail: contract?.company_email || '', contractorName: contract?.company_name || '',
            clientName: estimate?.client_name || '', companyName: contract?.company_name || 'Your Company',
            total: estimate ? estimate?.total || 0 : 0, depositPercent: profile?.deposit_percent || 10, contractId: contractId,
          }),
        }),
        fetch('/api/create-deposit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    if (res.ok) setContract(prev => prev ? { ...prev, status: 'declined' } : prev)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: FAINT }}>Loading…</div>
  )
  if (!contract || !estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: FAINT }}>Contract not found.</div>
  )

  const depositPct      = profile?.deposit_percent ?? contract?.deposit_percent ?? 10
  const depositRequired = profile?.deposit_required !== false
  const depositAmt      = Math.round((estimate?.total || 0) * depositPct) / 100
  const balanceAmt      = (estimate?.total || 0) - depositAmt
  const contractorEmail = contract?.company_email
  const isEmpty         = paths.length === 0

  const clauses = (() => {
    try {
      const raw = profile?.contract_clauses
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return (parsed as any[]).filter(c => c.enabled).sort((a, b) => a.order - b.order)
    } catch { return [] }
  })()
  const payMethods: string[] = Array.isArray(profile?.payment_methods) ? profile!.payment_methods! : []
  const hasDetails = !!(profile?.warranty_period || profile?.completion_timeframe || payMethods.length > 0 || profile?.project_manager)

  // ── Shared contract body sections ───────────────────────────────────────────

  function ContractHeader({ conId, dateLabel }: { conId: string; dateLabel: string }) {
    return (
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '14px 16px', background: '#fff', minWidth: 0 }}>
          {profile?.logo_url && (
            <img src={profile.logo_url} crossOrigin="anonymous" alt="Logo"
              style={{ height: 28, maxWidth: 120, objectFit: 'contain', display: 'block', marginBottom: 6 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 2 }}>{contract?.company_name || '—'}</div>
          {(contract?.company_phone || profile?.phone) && <div style={{ fontSize: 11, color: MUTED }}>{contract?.company_phone || profile?.phone}</div>}
          {profile?.company_contact_email && <div style={{ fontSize: 11, color: MUTED }}>{profile.company_contact_email}</div>}
          {(profile?.city || profile?.province) && <div style={{ fontSize: 11, color: MUTED }}>{[profile?.city, profile?.province].filter(Boolean).join(', ')}</div>}
          {profile?.licence && <div style={{ fontSize: 11, color: MUTED }}>Lic# {profile.licence}</div>}
        </div>
        <div style={{ background: BLUE, padding: '14px 16px', textAlign: 'right', flexShrink: 0, minWidth: 148, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Installation Contract</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{conId}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{dateLabel}</div>
        </div>
      </div>
    )
  }

  function ContractFooter({ conId }: { conId: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderTop: `1px solid ${BORDER}`, marginTop: 24, fontSize: 11, color: FAINT, gap: 12 }}>
        <div>{[
          profile?.address ? [profile.address, profile.city, profile.province].filter(Boolean).join(', ') : null,
          profile?.gst_hst_number ? `GST/HST# ${profile.gst_hst_number}` : null,
          profile?.website && profile.website !== 'https://' ? profile.website.replace(/^https?:\/\//i, '') : null,
        ].filter(Boolean).join(' · ')}</div>
        <div style={{ flexShrink: 0 }}>{conId}</div>
      </div>
    )
  }

  function Parties() {
    if (!estimate) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: GRAY_BG, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 6 }}>Contractor</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{contract?.company_name || '—'}</div>
          {(contract?.company_phone || profile?.phone) && <div style={{ fontSize: 11, color: MUTED }}>{contract?.company_phone || profile?.phone}</div>}
          {contractorEmail && <div style={{ fontSize: 11, color: MUTED }}>{contractorEmail}</div>}
          {profile?.address && <div style={{ fontSize: 11, color: MUTED }}>{profile.address}</div>}
          {(profile?.city || profile?.province) && <div style={{ fontSize: 11, color: MUTED }}>{[profile.city, profile.province].filter(Boolean).join(', ')}</div>}
        </div>
        <div style={{ background: GRAY_BG, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 6 }}>Client</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{estimate.client_name || '—'}</div>
          {estimate.client_phone   && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_phone}</div>}
          {estimate.client_email   && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_email}</div>}
          {estimate.client_address && <div style={{ fontSize: 11, color: MUTED }}>{estimate.client_address}</div>}
        </div>
      </div>
    )
  }

  function ScopeSection() {
    if (!estimate) return null
    return (
      <div style={{ marginBottom: 14 }}>
        <SecLabel>Scope of Work</SecLabel>
        <div style={cardStyle}>
          <div style={{ padding: '10px 14px' }}>
            {openings.map((op, i) => (
              <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < openings.length - 1 ? `1px solid ${GRAY_BG}` : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                  {OPENING_TYPES[op.type]?.name || op.type}{(op as any).window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''} × {op.qty}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{fmtCAD(op.total_cost)}</span>
              </div>
            ))}
            {hasTrim(estimate as any) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Trim &amp; Finishing</div>
                {trimSummaryLines(estimate as any).map(line => (
                  <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                    <span style={{ color: MUTED }}>{line.label}</span>
                    <span style={{ fontWeight: 600, color: NAVY }}>{line.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `0.5px solid ${BORDER}` }}>
              <span style={{ fontSize: 13, color: MUTED }}>Subtotal</span>
              <span style={{ fontSize: 13, color: NAVY }}>{fmtCAD(estimate.subtotal)}</span>
            </div>
            {estimate.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `0.5px solid ${BORDER}` }}>
                <span style={{ fontSize: 13, color: MUTED }}>Discount</span>
                <span style={{ fontSize: 13, color: '#16a34a' }}>−{fmtCAD(estimate.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `0.5px solid ${BORDER}` }}>
              <span style={{ fontSize: 13, color: MUTED }}>Tax</span>
              <span style={{ fontSize: 13, color: NAVY }}>{fmtCAD(estimate.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: BLUE }}>{fmtCAD(estimate?.total || 0)}</span>
            </div>
            {depositRequired && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div style={{ background: BLUE_BG, borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: BLUE_D, marginBottom: 3 }}>
                    {profile?.deposit_timing === 'delivery' ? 'Deposit on delivery' : 'Deposit on signing'} ({depositPct}%)
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BLUE_D }}>{fmtCAD(depositAmt)}</div>
                </div>
                <div style={{ background: BLUE_BG, borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: BLUE_D, marginBottom: 3 }}>Balance on completion</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BLUE_D }}>{fmtCAD(balanceAmt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function TermsSection() {
    if (clauses.length === 0) return null
    return (
      <div style={{ marginBottom: 14 }}>
        <SecLabel>Terms &amp; Conditions</SecLabel>
        <div style={cardStyle}>
          <div style={{ padding: '12px 14px' }}>
            {clauses.map((clause: any) => (
              <div key={clause.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{clause.title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{substituteProvince(clause.content, profile?.province)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function DetailsSection() {
    if (!hasDetails) return null
    return (
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
          {(contract?.payment_method || payMethods.length > 0) && (
            <div style={{ background: GRAY_BG, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 5 }}>Payment Methods</div>
              <div style={{ fontSize: 12, color: MUTED }}>
                {contract?.payment_method || payMethods.join(', ')}
              </div>
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
    )
  }

  function SignaturesSection({ contractorSig, clientSig, contractorName, clientName, contractorDate, clientDate }: {
    contractorSig?: string | null; clientSig?: string | null
    contractorName?: string | null; clientName?: string | null
    contractorDate?: string; clientDate?: string
  }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <SecLabel>Signatures</SecLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Contractor</div>
            {contractorSig ? (
              <img src={contractorSig} crossOrigin="anonymous" style={{ height: 50, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : <div style={{ height: 50, marginBottom: 4 }} />}
            <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: NAVY }}>{contractorName || '—'}</div>
            {contractorDate && <div style={{ fontSize: 10, color: MUTED }}>{contractorDate}</div>}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Client</div>
            {clientSig ? (
              <img src={clientSig} crossOrigin="anonymous" style={{ height: 50, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : <div style={{ height: 50, marginBottom: 4 }} />}
            <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: NAVY }}>{clientName || '—'}</div>
            {clientDate && <div style={{ fontSize: 10, color: MUTED }}>{clientDate}</div>}
          </div>
        </div>
      </div>
    )
  }

  // ── Already signed — read-only view ──────────────────────────────────────────
  if (contract.status === 'signed' && !clientSignatureUrl && !showDeposit && !showSuccess) {
    const _conId   = 'CON-' + contract.id.slice(0, 6).toUpperCase()
    const _created = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
    const _signed  = contract.signed_at
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.signed_at))
      : '—'
    return (
      <div style={{ minHeight: isPdf ? 'auto' : '100vh', background: GRAY_BG, fontFamily: F }}>
        <style>{`
          @media print {
            @page { margin: 0 !important; size: A4; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0 !important; padding: 0 !important; min-height: auto !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <ContractHeader conId={_conId} dateLabel={`Signed: ${_signed}`} />

        <div style={{ padding: 16 }}>
          <Parties />
          <ScopeSection />
          <TermsSection />
          <DetailsSection />
          <SignaturesSection
            contractorSig={contract.contractor_signature_url}
            clientSig={(contract as any).client_signature_url}
            contractorName={contract.company_name}
            clientName={estimate.client_name}
            contractorDate={_created}
            clientDate={_signed}
          />

          {!isPdf && (
            <a
              href={`/api/contract-pdf-gen?contractId=${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: BLUE, color: '#fff', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 24, textDecoration: 'none' }}
            >
              <Download size={16} /> Download Contract
            </a>
          )}

          <ContractFooter conId={_conId} />
        </div>
      </div>
    )
  }

  const conDisplayId = 'CON-' + contract.id.slice(0, 6).toUpperCase()
  const createdDate  = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
  const signedDate   = clientSignatureUrl
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
    : null

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

      {/* ── CLIENT SUCCESS SCREEN (immediately after signing) ── */}
      {showDeposit && !showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: GRAY_BG, fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: NAVY, marginBottom: 8, textAlign: 'center', letterSpacing: '-0.01em' }}>You're all signed!</div>
            <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
              Thank you, <strong style={{ color: NAVY }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
            </div>
            <div style={{ width: '100%', background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 14 }}>
              {depositRequired && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 6 }}>Deposit Due</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: BLUE_D, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
                  <div style={{ fontSize: 12, color: FAINT, marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate?.total || 0)}</div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
                <span style={{ fontSize: 12, color: FAINT }}>Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />SIGNED
                </span>
              </div>
              {estimate.client_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: FAINT }}>Sent to</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{estimate.client_email}</span>
                </div>
              )}
            </div>
            <button style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: BLUE, cursor: 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 24 }}>
              Resend confirmation email →
            </button>
            <button onClick={() => setShowSuccess(true)}
              style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: FAINT, cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
              Done
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#CBD5E1' }}>
            Powered by ApexScale · useapexscale.com
          </div>
        </div>
      )}

      {/* ── CONTRACTOR SUCCESS SCREEN (after "Done") ── */}
      {showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 200, background: GRAY_BG, fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
            <ApexScaleLogo theme="light" size={26} />
            <span style={{ fontSize: 10, fontWeight: 700, color: BLUE, background: BLUE_BG, borderRadius: 6, padding: '4px 10px', letterSpacing: '0.06em' }}>{estimate.estimate_number}</span>
          </div>
          <div style={{ flex: 1, padding: '20px 16px 40px' }}>
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Contract Signed!</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Client will receive payment instructions by email</div>
            </div>
            {depositRequired && (
              <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 6 }}>Deposit Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
                <div style={{ fontSize: 12, color: FAINT }}>{depositPct}% of {fmtCAD(estimate?.total || 0)}</div>
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, marginBottom: 14 }}>What happens next</div>
              {([
                { icon: '✅', label: 'Contract signed',     status: 'Done',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '✅', label: 'Payment email sent',  status: 'Sent',    bg: '#F0FDF4', color: '#16A34A' },
                { icon: '⏳', label: 'Client pays deposit', status: 'Pending', bg: '#FFFBEB', color: '#D97706' },
              ] as { icon: string; label: string; status: string; bg: string; color: string }[]).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{step.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.color, background: step.bg, borderRadius: 20, padding: '3px 10px' }}>{step.status}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { window.location.href = '/dashboard' }}
              style={{ width: '100%', height: 52, background: NAVY, border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTRACT (pre-signing) ── */}
      <div id="contract-content" style={{ minHeight: isPdf ? 'auto' : '100vh', background: GRAY_BG, fontFamily: F }}>

        <ContractHeader conId={conDisplayId} dateLabel={createdDate} />

        <div style={{ padding: 16 }}>

          <Parties />
          <ScopeSection />
          <TermsSection />
          <DetailsSection />

          {/* SIGNATURES */}
          <div style={{ marginBottom: 14 }}>
            <SecLabel>Signatures</SecLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Contractor</div>
                {contract.contractor_signature_url ? (
                  <img src={contract.contractor_signature_url} crossOrigin="anonymous"
                    style={{ height: 50, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : <div style={{ height: 50, marginBottom: 4 }} />}
                <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
                <div style={{ fontSize: 11, color: NAVY }}>{contract?.company_name || '—'}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{createdDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: FAINT, marginBottom: 10 }}>Client</div>
                {clientSignatureUrl ? (
                  <img src={clientSignatureUrl} crossOrigin="anonymous"
                    style={{ height: 50, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="no-print">
                    {!isPdf && (
                      <>
                        <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', marginBottom: 4 }}>
                          <svg
                            ref={svgRef}
                            viewBox="0 0 600 200"
                            style={{ width: '100%', height: 120, border: `2px dashed ${BORDER}`, borderRadius: 12, background: '#fff', display: 'block', cursor: 'crosshair' }}
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
                            {paths.map((d, i) => <path key={i} d={d} stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
                            {currentPath && <path d={currentPath} stroke={NAVY} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                            {isEmpty && !isDrawing && <text x="300" y="105" textAnchor="middle" fill="#C0C8D0" fontSize="14" fontFamily="sans-serif">Sign here with your finger</text>}
                          </svg>
                        </div>
                        {!isEmpty && (
                          <button onClick={() => { setPaths([]); setCurrentPath(''); setIsDrawing(false) }}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: FAINT, cursor: 'pointer', padding: 0, fontFamily: F, marginBottom: 4 }}>
                            Clear
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div style={{ borderBottom: `1px solid ${NAVY}`, marginBottom: 5 }} />
                <div style={{ fontSize: 11, color: NAVY }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{signedDate || 'Date: ___________'}</div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          {!isPdf && (
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 40 }}>
              <div
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 12, border: agreedToTerms ? `1.5px solid ${BLUE}` : `1.5px solid ${BORDER}`, marginBottom: 4, cursor: 'pointer' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, background: agreedToTerms ? BLUE : '#fff', border: agreedToTerms ? 'none' : `1.5px solid ${BORDER}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {agreedToTerms && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2.5" /></svg>}
                </div>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  I have read and agree to the <span style={{ color: BLUE, fontWeight: 600 }}>Terms &amp; Conditions</span> and authorize the work described in this contract.
                </p>
              </div>
              <button
                onClick={handleSign}
                disabled={isEmpty || !agreedToTerms || signing}
                style={{ width: '100%', background: BLUE, border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: F, opacity: (isEmpty || !agreedToTerms || signing) ? 0.5 : 1, cursor: (isEmpty || !agreedToTerms) ? 'not-allowed' : 'pointer' }}>
                {signing ? 'Signing…' : 'I Agree — Sign Contract'}
              </button>
              <button onClick={handleDecline}
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 13, padding: 12, fontSize: 14, fontWeight: 600, color: '#DC2626', cursor: 'pointer', fontFamily: F }}>
                Decline
              </button>
            </div>
          )}

          <ContractFooter conId={conDisplayId} />

        </div>
      </div>
    </>
  )
}
