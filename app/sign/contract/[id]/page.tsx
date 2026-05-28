'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'

interface Contract {
  id: string; estimate_id: string; profile_id: string; status: string
  contract_terms_snapshot: string | null; contractor_signature_url: string | null
  company_name: string | null; company_email: string | null; company_phone: string | null
  signed_at: string | null; created_at: string
}
interface Estimate {
  id: string; estimate_number: string; created_at: string
  client_name: string | null; client_email: string | null; client_phone: string | null
  client_address: string | null; subtotal: number; tax_amount: number; total: number
  discount_amount: number
}
interface Opening { id: string; type: string; qty: number; total_cost: number }
interface Profile {
  warranty_period: string | null; payment_terms: string | null; cancellation_policy: string | null
  deposit_percent: number | null; signature_url: string | null; contract_terms: string | null
  completion_timeframe: string | null; payment_methods: string[] | null
  customer_responsibilities: string | null; buyer_right_to_cancel: string | null
  damage_disclaimer: string | null; permits_responsibility: string | null; project_manager: string | null
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
  const [depositPaid,        setDepositPaid]        = useState<string | null>(null)
  const [showSuccess,        setShowSuccess]        = useState(false)
  const [clientSignatureUrl, setClientSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: con } = await supabase.from('contracts').select('*').eq('id', contractId).single()
      if (!con) { setLoading(false); return }
      setContract(con)

      const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', con.estimate_id).single(),
        supabase.from('estimate_openings').select('id, type, qty, total_cost').eq('estimate_id', con.estimate_id).order('sort_order'),
        supabase.from('profiles').select('deposit_percent, signature_url, warranty_period, payment_terms, cancellation_policy, contract_terms, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager').eq('id', con.profile_id).single(),
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

  // Already signed (from DB, not current session)
  if (contract.status === 'signed' && !clientSignatureUrl && !showDeposit && !showSuccess) return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0E1A', marginBottom: 6 }}>Already signed</div>
      <div style={{ fontSize: 14, color: '#8892b0', textAlign: 'center' }}>This contract has already been signed.</div>
    </div>
  )

  const isEmpty = paths.length === 0
  const depositPct = profile?.deposit_percent || 10
  const depositAmt = Math.round((estimate?.total || 0) * depositPct / 100)
  const conDisplayId = 'CON-' + contract.id.slice(0, 6).toUpperCase()
  const createdDate  = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(contract.created_at))
  const signedDate   = clientSignatureUrl
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
    : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
          .contract-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #contract-content {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          * { max-width: 100% !important; box-sizing: border-box !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      {/* ── SUCCESS overlay (fixed, hidden on print) ── */}
      {showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', fontFamily: F, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* HERO */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(160deg, #0A0E1A 0%, #1A2744 60%, #0f1f3d 100%)',
            padding: 'max(64px, calc(env(safe-area-inset-top) + 48px)) 24px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}>
            {/* Radial glow */}
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Check — outer ring → inner circle → icon */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(22,163,74,0.15)', border: '1.5px solid rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 24px rgba(22,163,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10, position: 'relative', zIndex: 1 }}>ALL DONE</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10, position: 'relative', zIndex: 1 }}>Contract Signed!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 280, position: 'relative', zIndex: 1 }}>
              A copy has been sent to <span style={{ color: 'rgba(255,255,255,0.8)' }}>{estimate.client_email || estimate.client_name || 'the client'}</span>
            </div>
          </div>

          {/* DETAILS CARD */}
          <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {([
              { label: 'Contract', value: conDisplayId,                      color: '#1A1A1A' },
              { label: 'Client',   value: estimate.client_name || '—',       color: '#1A1A1A' },
              { label: 'Amount',   value: fmtCAD(estimate.total),             color: '#3B6CFF' },
              { label: 'Status',   value: '✓ Signed',                        color: '#16A34A' },
            ] as { label: string; value: string; color: string }[]).map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ACTIONS */}
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => window.print()}
              style={{ width: '100%', background: '#3B6CFF', border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
              Save as PDF
            </button>
            <button onClick={() => { window.location.href = '/dashboard' }}
              style={{ width: '100%', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 600, color: '#1A1A1A', cursor: 'pointer', fontFamily: F }}>
              Back to dashboard
            </button>
          </div>

        </div>
      )}

      {/* ── DEPOSIT overlay (fixed, hidden on print) ── */}
      {showDeposit && !showSuccess && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#F4F4F2', fontFamily: F, overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%)', padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
            <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Contract Signed!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Collect deposit to confirm the job</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>DEPOSIT DUE</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2045B8', marginBottom: 4 }}>CA${depositAmt.toLocaleString('en-CA')}</div>
              <div style={{ fontSize: 12, color: '#8892b0' }}>{depositPct}% of CA${(estimate?.total || 0).toLocaleString('en-CA')}</div>
            </div>
            {depositPaid !== null ? (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8', padding: 20, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0E1A' }}>
                    {depositPaid === 'etransfer' ? 'e-Transfer details sent' : depositPaid === 'card' ? 'Payment link sent' : 'Cash/Cheque recorded'}
                  </span>
                </div>
                <button onClick={() => setShowSuccess(true)}
                  style={{ width: '100%', background: '#2045B8', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
                  Done →
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setDepositPaid('etransfer')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 14, padding: 16, width: '100%', marginBottom: 10, cursor: 'pointer', fontFamily: F, textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, background: '#EEF2FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><line x1="3" y1="12" x2="21" y2="12"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0E1A', marginBottom: 2 }}>Interac e-Transfer</div>
                    <div style={{ fontSize: 12, color: '#8892b0' }}>Send to: {contract?.company_email || contract?.company_name || 'your contractor'}</div>
                  </div>
                  <span style={{ fontSize: 18, color: '#CBD5E1' }}>›</span>
                </button>
                <button onClick={() => setDepositPaid('card')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 14, padding: 16, width: '100%', marginBottom: 10, cursor: 'pointer', fontFamily: F, textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, background: '#EEF2FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2045B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0E1A', marginBottom: 2 }}>Credit Card / Apple Pay</div>
                    <div style={{ fontSize: 12, color: '#8892b0' }}>Tap to pay online</div>
                  </div>
                  <span style={{ fontSize: 18, color: '#CBD5E1' }}>›</span>
                </button>
                <button onClick={() => setDepositPaid('cash')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 14, padding: 16, width: '100%', marginBottom: 20, cursor: 'pointer', fontFamily: F, textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, background: '#F0F0EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0E1A', marginBottom: 2 }}>Cash or Cheque</div>
                    <div style={{ fontSize: 12, color: '#8892b0' }}>Mark as received manually</div>
                  </div>
                  <span style={{ fontSize: 18, color: '#CBD5E1' }}>›</span>
                </button>
                <button onClick={() => setShowSuccess(true)}
                  style={{ display: 'block', width: '100%', background: 'none', border: 'none', fontSize: 13, color: '#8892b0', cursor: 'pointer', fontFamily: F, textAlign: 'center', padding: '8px 0' }}>
                  Skip for now →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTRACT (always in DOM — prints cleanly) ── */}
      <div id="contract-content" style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F }}>

        {/* HEADER */}
        <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0A0E1A', letterSpacing: '-0.02em' }}>
            Apex<span style={{ color: '#2045B8' }}>Scale</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2045B8', background: '#EEF2FF', borderRadius: 6, padding: '4px 10px', letterSpacing: '0.06em' }}>
            {conDisplayId}
          </span>
        </div>

        {/* CONTRACT BAR */}
        <div className="contract-bar" style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%)', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>CONTRACT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{conDisplayId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>DATE</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{createdDate}</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 16 }}>


          {/* SUMMARY */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#8892b0', marginBottom: 4 }}>From: <strong style={{ color: '#0A0E1A' }}>{contract?.company_name || '—'}</strong></div>
            <div style={{ fontSize: 13, color: '#8892b0', marginBottom: 16 }}>To: <strong style={{ color: '#0A0E1A' }}>{estimate.client_name || '—'}</strong></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(estimate.total)}</div>
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
            </div>
          </div>

          {/* TERMS */}
          <div style={cardStyle}>
            <CardHeader title="Terms & Conditions" />
            <div style={{ padding: '14px 16px' }}>
              {contract.contract_terms_snapshot && (
                <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.65, margin: '0 0 14px' }}>
                  {contract.contract_terms_snapshot}
                </p>
              )}
              <CheckRow text={`Warranty: All materials and labour are warranted for ${profile?.warranty_period || '1 year'} from installation date.`} />
              <CheckRow text={`Payment: ${profile?.payment_terms || 'Upon completion'}`} />
              <CheckRow text={`Cancellation: ${profile?.cancellation_policy || 'Either party may cancel with 72 hours written notice prior to the scheduled start date.'}`} />
              <CheckRow text="Access: Client agrees to provide reasonable access to the property on scheduled installation day." />
            </div>
          </div>

          {/* ADDITIONAL CLAUSES */}
          {(profile?.completion_timeframe || (profile?.payment_methods && profile.payment_methods.length > 0) || profile?.customer_responsibilities || profile?.buyer_right_to_cancel || profile?.damage_disclaimer || profile?.permits_responsibility || profile?.project_manager) && (
            <div style={cardStyle}>
              <CardHeader title="Contract Details" />
              <div style={{ padding: '12px 16px' }}>
                {profile?.completion_timeframe && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Completion Timeframe</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.completion_timeframe}</p>
                  </div>
                )}
                {profile?.payment_methods && profile.payment_methods.length > 0 && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 6 }}>Accepted Payment Methods</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.payment_methods.map((m: string) => (
                        <span key={m} style={{ background: '#EEF2FF', color: '#2045B8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile?.customer_responsibilities && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Customer Responsibilities</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.customer_responsibilities}</p>
                  </div>
                )}
                {profile?.buyer_right_to_cancel && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Buyer's Right to Cancel</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.buyer_right_to_cancel}</p>
                  </div>
                )}
                {profile?.damage_disclaimer && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Damage Disclaimer</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.damage_disclaimer}</p>
                  </div>
                )}
                {profile?.permits_responsibility && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F4F4F2' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 4 }}>Permits Responsibility</div>
                    <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.6, margin: 0 }}>{profile.permits_responsibility}</p>
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
          )}

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
                  </div>
                )}
                <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#8892b0' }}>{estimate.client_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{signedDate || 'Date: ___________'}</div>
              </div>
            </div>
          </div>

          {/* ACTIONS — hidden on print */}
          <div className="no-print" style={{ padding: '8px 0 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          </div>

        </div>
      </div>
    </>
  )
}
