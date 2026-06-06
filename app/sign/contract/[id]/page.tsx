'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
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
  city: string | null; province: string | null; address: string | null; postal_code: string | null
  contract_clauses: string | null
  deposit_timing: string | null
}

const F = '"Inter", system-ui, sans-serif'

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

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8', marginBottom: 12, overflow: 'hidden',
}

function CardHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0', fontSize: 12, fontWeight: 700, color: '#0A0E1A' }}>
      {title}
    </div>
  )
}

export default function SignContractPage() {
  const params = useParams()
  const contractId = Array.isArray(params?.id) ? params.id[0] : params?.id as string
  const supabase = createClient()
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
      const { data: con } = await supabase.from('contracts').select('*').eq('id', contractId).single()
      if (!con) { setLoading(false); return }
      setContract(con)

      const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', con.estimate_id).single(),
        supabase.from('estimate_openings').select('id, type, qty, total_cost').eq('estimate_id', con.estimate_id).order('sort_order'),
        supabase.from('profiles').select('deposit_percent, signature_url, warranty_period, cancellation_policy, contract_terms, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager, logo_url, phone, website, city, province, address, postal_code, contract_clauses, deposit_timing').eq('id', con.profile_id).single(),
      ])
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

  // ── Sign ────────────────────────────────────────────────────────────────────
  async function handleSign() {
    if (paths.length === 0) { alert('Please sign before submitting'); return }
    if (!contract) return
    setSigning(true)

    const svgElement = svgRef.current
    if (!svgElement) { setSigning(false); return }

    // Render SVG paths to a canvas PNG
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const offscreen = document.createElement('canvas')
    offscreen.width = 600
    offscreen.height = 200
    const ctx = offscreen.getContext('2d')

    let signatureBase64: string
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          ctx?.drawImage(img, 0, 0)
          resolve()
        }
        img.onerror = reject
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
      })
      signatureBase64 = offscreen.toDataURL('image/png')
    } catch {
      setSigning(false)
      alert('Could not render signature. Please try again.')
      return
    }

    // Upload + save via server route (uses service key to bypass RLS)
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
      setSigning(false)
      alert('Signing failed: ' + (result.error || 'Unknown error'))
      return
    }

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
          contractId: contractId,
          total: estimate?.total,
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
          depositPercent: profile?.deposit_percent || 10,
          contractId: contractId,
        }),
      }),
      fetch('/api/deposit-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: contract.estimate_id }),
      }),
    ])

    setSigning(false)
    setShowDeposit(true)
  }

  async function handleDecline() {
    if (!confirm('Are you sure you want to decline this contract?')) return
    await supabase.from('contracts').update({ status: 'declined' }).eq('id', contractId)
    setContract(prev => prev ? { ...prev, status: 'declined' } : prev)
  }

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: '#94A3B8' }}>
      Loading…
    </div>
  )
  if (!contract || !estimate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: '#94A3B8' }}>
      Contract not found.
    </div>
  )

  const depositPct = contract?.deposit_percent ?? profile?.deposit_percent ?? 30
  const depositAmt = Math.round((estimate?.total || 0) * depositPct / 100)
  const balanceAmt = (estimate?.total || 0) - depositAmt
  const contractorEmail = contract?.company_email

  // Already signed — read-only view
  if (contract.status === 'signed' && !clientSignatureUrl && !showDeposit && !showSuccess) {
    const _conId = 'CON-' + contract.id.slice(0, 6).toUpperCase()
    const _created = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
    const _signed = contract.signed_at
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.signed_at))
      : '—'
    return (
      <div style={{ minHeight: isPdf ? 'auto' : '100vh', background: '#F5F6F8', fontFamily: F }}>
        <style>{`
          @media print {
            @page {
              margin: 0 !important;
              size: A4;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Contract bar */}
        <div style={{ background: '#0A1628', padding: isPdf ? '12px 16px' : '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} crossOrigin="anonymous" style={{ maxHeight: 80, maxWidth: 200, display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{contract.company_name || '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Signed Contract · {_conId}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{_signed}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{profile?.province ? profile.province + ', Canada' : 'Canada'}</div>
          </div>
        </div>

        <div style={{ padding: 16, marginTop: isPdf ? 0 : undefined }}>

          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{contract.company_name || '—'}</div>
              <div style={{ lineHeight: 1.6 }}>
                {(contract.company_phone || profile?.phone) && <div style={{ fontSize: 13, color: '#6B7280' }}>{contract.company_phone || profile?.phone}</div>}
                {contractorEmail && <div style={{ fontSize: 13, color: '#6B7280' }}>{contractorEmail}</div>}
                {profile?.address && <div style={{ fontSize: 13, color: '#6B7280' }}>{profile.address}</div>}
                {(profile?.city || profile?.province) && <div style={{ fontSize: 13, color: '#6B7280' }}>{[profile.city, profile.province].filter(Boolean).join(', ')}</div>}
                {profile?.website && profile.website !== 'https://' && <a href={profile.website} style={{ fontSize: 13, color: '#2563EB' }}>{profile.website.replace('https://','').replace('http://','')}</a>}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{estimate.client_name || '—'}</div>
              <div style={{ lineHeight: 1.6 }}>
                {estimate.client_phone && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_phone}</div>}
                {estimate.client_email && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_email}</div>}
                {estimate.client_address && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_address}</div>}
                {(estimate as any).client_city && <div style={{ fontSize: 13, color: '#6B7280' }}>{[(estimate as any).client_city, (estimate as any).client_province, (estimate as any).client_postal].filter(Boolean).join(', ')}</div>}
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div style={cardStyle}>
            <CardHeader title="Scope of Work" />
            <div style={{ padding: '12px 16px' }}>
              {openings.map((op, i) => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < openings.length - 1 ? '1px solid #F4F4F2' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{OPENING_TYPES[op.type]?.name || op.type} × {op.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{fmtCAD(op.total_cost)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#F0F0F0', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                  <span>Discount</span><span>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 10 }}>
                <span>Tax</span><span>{fmtCAD(estimate.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0E1A' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(estimate.total)}</span>
              </div>
              <div style={{ marginTop: 12, borderTop: '1px solid #F0F0F0', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4F4F2' }}>
                  <span style={{ fontSize: 13, color: '#8892b0' }}>{profile?.deposit_timing === 'delivery' ? 'Deposit on delivery' : 'Deposit on signing'} ({depositPct}%)</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2045B8' }}>{fmtCAD(depositAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: '#8892b0' }}>Balance on completion</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{fmtCAD(balanceAmt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {(() => {
            const clauses: any[] = profile?.contract_clauses ? (() => { try { return JSON.parse(profile.contract_clauses) } catch { return [] } })() : []
            const enabledClauses = clauses.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
            if (enabledClauses.length === 0) return null
            return (
              <div style={cardStyle}>
                <CardHeader title="Terms & Conditions" />
                <div style={{ padding: '14px 16px' }}>
                  {enabledClauses.map((clause: any) => (
                    <CheckRow key={clause.id} text={`${clause.title}: ${clause.content}`} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Contract Details */}
          {(() => {
            const hasDetails = profile?.warranty_period || profile?.completion_timeframe || (profile?.payment_methods && profile.payment_methods.length > 0) || profile?.project_manager
            if (!hasDetails) return null
            return (
              <div style={cardStyle}>
                <CardHeader title="Contract Details" />
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
                  {(contract?.payment_method || (profile?.payment_methods && profile.payment_methods.length > 0)) && (
                    <div style={{ marginBottom: profile?.project_manager ? 12 : 0, paddingBottom: profile?.project_manager ? 12 : 0, borderBottom: profile?.project_manager ? '1px solid #F4F4F2' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 6 }}>Accepted Payment Methods</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {contract?.payment_method
                          ? <span style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{contract.payment_method}</span>
                          : profile!.payment_methods!.map((m: string) => (
                              <span key={m} style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>
                            ))
                        }
                      </div>
                    </div>
                  )}
                  {profile?.project_manager && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Project Manager</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A', margin: 0 }}>{profile.project_manager}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Signatures */}
          <div style={cardStyle}>
            <CardHeader title="Signatures" />
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
                {contract.contractor_signature_url ? (
                  <img src={contract.contractor_signature_url} crossOrigin="anonymous" style={{ height: 60, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div style={{ height: 60, marginBottom: 4 }} />
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{contract.company_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{_created}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
                {(contract as any).client_signature_url ? (
                  <img src={(contract as any).client_signature_url} crossOrigin="anonymous" style={{ height: 60, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div style={{ height: 60, marginBottom: 4 }} />
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{_signed}</div>
              </div>
            </div>
          </div>

          {/* Download button */}
          {!isPdf && (
            <a
              href={`/api/contract-pdf-gen?contractId=${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: '#2563EB', color: '#fff', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 24, textDecoration: 'none' }}
            >
              <Download size={16} /> Download Contract
            </a>
          )}

        </div>
      </div>
    )
  }

  const isEmpty = paths.length === 0
  const conDisplayId = 'CON-' + contract.id.slice(0, 6).toUpperCase()
  const createdDate  = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
  const signedDate   = clientSignatureUrl
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
    : null

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
            size: A4;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── SCREEN 1: Client-facing (immediately after signing) ── */}
      {showDeposit && !showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px 24px' }}>

            {/* Green check circle — simple */}
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>

            <div style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', marginBottom: 8, textAlign: 'center', letterSpacing: '-0.01em' }}>You're all signed!</div>
            <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
              Thank you, <strong style={{ color: '#0A1628' }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
            </div>

            {/* Combined card */}
            <div style={{ width: '100%', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D4ED8', marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>{depositPct}% of {fmtCAD(estimate.total)}</div>

              <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estimate.client_email ? 10 : 0 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                  SIGNED
                </span>
              </div>

              {estimate.client_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Sent to</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{estimate.client_email}</span>
                </div>
              )}
            </div>

            {/* Resend link */}
            <button style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: F, padding: '4px 0', marginBottom: 24 }}>
              Resend confirmation email →
            </button>

            {/* Done button */}
            <button
              onClick={() => setShowSuccess(true)}
              style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
              Done
            </button>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#CBD5E1' }}>
            Powered by ApexScale · useapexscale.com
          </div>
        </div>
      )}

      {/* ── SCREEN 2: Contractor-facing (after "Done") ── */}
      {showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F5F6F8', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Topbar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
            <ApexScaleLogo theme="light" size={26} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', borderRadius: 6, padding: '4px 10px', letterSpacing: '0.06em' }}>{estimate.estimate_number}</span>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '20px 16px 40px' }}>

            {/* Success card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Contract Signed!</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>Client will receive payment instructions by email</div>
            </div>

            {/* Deposit card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>Deposit Due</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginBottom: 4 }}>{fmtCAD(depositAmt)}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{depositPct}% of {fmtCAD(estimate.total)}</div>
            </div>

            {/* What happens next */}
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

            {/* Back to dashboard */}
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              style={{ width: '100%', height: 52, background: '#0A1628', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTRACT (always in DOM — prints cleanly) ── */}
      <div id="contract-content" style={{ minHeight: isPdf ? 'auto' : '100vh', background: '#F5F6F8', fontFamily: F }}>

        {/* CONTRACT BAR */}
        <div className="contract-bar" style={{ background: '#0A1628', padding: isPdf ? '12px 16px' : '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} crossOrigin="anonymous" style={{ maxHeight: 80, maxWidth: 200, display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{contract.company_name || '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Signed Contract · {conDisplayId}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{createdDate}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{profile?.province ? profile.province + ', Canada' : 'Canada'}</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 16, marginTop: isPdf ? 0 : undefined }}>


          {/* PARTIES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{contract?.company_name || '—'}</div>
              <div style={{ lineHeight: 1.6 }}>
                {(contract?.company_phone || profile?.phone) && <div style={{ fontSize: 13, color: '#6B7280' }}>{contract?.company_phone || profile?.phone}</div>}
                {contractorEmail && <div style={{ fontSize: 13, color: '#6B7280' }}>{contractorEmail}</div>}
                {profile?.address && <div style={{ fontSize: 13, color: '#6B7280' }}>{profile.address}</div>}
                {(profile?.city || profile?.province) && <div style={{ fontSize: 13, color: '#6B7280' }}>{[profile.city, profile.province].filter(Boolean).join(', ')}</div>}
                {profile?.website && profile.website !== 'https://' && <a href={profile.website} style={{ fontSize: 13, color: '#2563EB' }}>{profile.website.replace('https://','').replace('http://','')}</a>}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{estimate.client_name || '—'}</div>
              <div style={{ lineHeight: 1.6 }}>
                {estimate.client_phone && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_phone}</div>}
                {estimate.client_email && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_email}</div>}
                {estimate.client_address && <div style={{ fontSize: 13, color: '#6B7280' }}>{estimate.client_address}</div>}
                {(estimate as any).client_city && <div style={{ fontSize: 13, color: '#6B7280' }}>{[(estimate as any).client_city, (estimate as any).client_province, (estimate as any).client_postal].filter(Boolean).join(', ')}</div>}
              </div>
            </div>
          </div>

          {/* SCOPE */}
          <div style={cardStyle}>
            <CardHeader title="Scope of Work" />
            <div style={{ padding: '12px 16px' }}>
              {openings.map((op, i) => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < openings.length - 1 ? '1px solid #F4F4F2' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{OPENING_TYPES[op.type]?.name || op.type} × {op.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{fmtCAD(op.total_cost)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#F0F0F0', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                  <span>Discount</span><span>−{fmtCAD(estimate.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8892b0', marginBottom: 10 }}>
                <span>Tax</span><span>{fmtCAD(estimate.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0E1A' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(estimate.total)}</span>
              </div>
              <div style={{ marginTop: 12, borderTop: '1px solid #F0F0F0', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4F4F2' }}>
                  <span style={{ fontSize: 13, color: '#8892b0' }}>{profile?.deposit_timing === 'delivery' ? 'Deposit on delivery' : 'Deposit on signing'} ({depositPct}%)</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2045B8' }}>{fmtCAD(depositAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: '#8892b0' }}>Balance on completion</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{fmtCAD(balanceAmt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TERMS */}
          {(() => {
            const clauses: any[] = profile?.contract_clauses ? (() => { try { return JSON.parse(profile.contract_clauses) } catch { return [] } })() : []
            const enabledClauses = clauses.filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
            if (enabledClauses.length === 0) return null
            return (
              <div style={cardStyle}>
                <CardHeader title="Terms & Conditions" />
                <div style={{ padding: '14px 16px' }}>
                  {enabledClauses.map((clause: any) => (
                    <CheckRow key={clause.id} text={`${clause.title}: ${clause.content}`} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* CONTRACT DETAILS */}
          {(() => {
            const hasDetails = profile?.completion_timeframe || (profile?.payment_methods && profile.payment_methods.length > 0) || profile?.project_manager
            if (!hasDetails) return null
            return (
              <div style={cardStyle}>
                <CardHeader title="Contract Details" />
                <div style={{ padding: '12px 16px' }}>
                  {profile?.completion_timeframe && (
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Completion Timeframe</div>
                      <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.completion_timeframe}</p>
                    </div>
                  )}
                  {(contract?.payment_method || (profile?.payment_methods && profile.payment_methods.length > 0)) && (
                    <div style={{ marginBottom: profile?.project_manager ? 12 : 0, paddingBottom: profile?.project_manager ? 12 : 0, borderBottom: profile?.project_manager ? '1px solid #F4F4F2' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 6 }}>Accepted Payment Methods</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {contract?.payment_method
                          ? <span style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{contract.payment_method}</span>
                          : profile!.payment_methods!.map((m: string) => (
                              <span key={m} style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>
                            ))
                        }
                      </div>
                    </div>
                  )}
                  {profile?.project_manager && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Project Manager</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A', margin: 0 }}>{profile.project_manager}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* PAYMENT DETAILS */}
          <div style={cardStyle}>
            <CardHeader title="Payment Details" />
            <div style={{ padding: '12px 16px' }}>
              {(contract?.payment_method || (profile?.payment_methods && profile.payment_methods.length > 0)) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F4F2' }}>
                  <span style={{ fontSize: 13, color: '#8892b0' }}>Payment method</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>
                    {contract?.payment_method || profile?.payment_methods?.[0] || '—'}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F4F2' }}>
                <span style={{ fontSize: 13, color: '#8892b0' }}>Deposit on signing ({depositPct}%)</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2045B8' }}>{fmtCAD(depositAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: '#8892b0' }}>Balance on completion</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{fmtCAD(balanceAmt)}</span>
              </div>
            </div>
          </div>

          {/* SIGNATURES */}
          <div style={cardStyle}>
            <CardHeader title="Signatures" />
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Contractor */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
                {contract.contractor_signature_url ? (
                  <img
                    src={contract.contractor_signature_url}
                    crossOrigin="anonymous"
                    style={{ height: 60, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div style={{ height: 60, marginBottom: 4 }} />
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{contract?.company_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{createdDate}</div>
              </div>

              {/* Client */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Client</div>
                {clientSignatureUrl ? (
                  <img
                    src={clientSignatureUrl}
                    crossOrigin="anonymous"
                    style={{ height: 60, objectFit: 'contain', maxWidth: '100%', display: 'block', marginBottom: 4 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="no-print">
                    {!isPdf && (
                      <>
                        <div style={{ position: 'relative', touchAction: 'none', userSelect: 'none', marginBottom: 4 }}>
                          <svg
                            ref={svgRef}
                            viewBox="0 0 600 200"
                            style={{ width: '100%', height: 120, border: '2px dashed #E0E0E0', borderRadius: 12, background: '#fff', display: 'block', cursor: 'crosshair' }}
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId)
                              const p = getPoint(e)
                              setCurrentPath(`M ${p.x} ${p.y}`)
                              setIsDrawing(true)
                              setPaths(prev => prev.length === 0 ? prev : prev)
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
                            {paths.length === 0 && !isDrawing && (
                              <text x="300" y="105" textAnchor="middle" fill="#C0C8D0" fontSize="14" fontFamily="sans-serif">Sign here with your finger</text>
                            )}
                          </svg>
                        </div>
                        {!isEmpty && (
                          <button
                            onClick={() => { setPaths([]); setCurrentPath(''); setIsDrawing(false) }}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: '#8892b0', cursor: 'pointer', padding: 0, fontFamily: F, marginBottom: 4 }}>
                            Clear
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{signedDate || 'Date: ___________'}</div>
              </div>
            </div>
          </div>

          {/* ACTIONS — hidden on print and in pdf mode */}
          {!isPdf && <div className="no-print" style={{ padding: '8px 0 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              onClick={() => setAgreedToTerms(!agreedToTerms)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 12, border: agreedToTerms ? '1.5px solid #2045B8' : '1.5px solid #E8E8E8', marginBottom: 4, cursor: 'pointer' }}
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
              onClick={handleSign}
              disabled={isEmpty || !agreedToTerms || signing}
              style={{ width: '100%', background: '#2045B8', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: F, opacity: (isEmpty || !agreedToTerms || signing) ? 0.5 : 1, cursor: (isEmpty || !agreedToTerms) ? 'not-allowed' : 'pointer' }}
            >
              {signing ? 'Signing…' : 'I Agree — Sign Contract'}
            </button>
            <button onClick={handleDecline}
              style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 13, padding: 12, fontSize: 14, fontWeight: 600, color: '#DC2626', cursor: 'pointer', fontFamily: F }}>
              Decline
            </button>
          </div>}

        </div>
      </div>
    </>
  )
}
