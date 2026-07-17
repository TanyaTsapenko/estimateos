'use client'
import { useEffect, useState, useRef } from 'react'
import { SuccessBanner } from '@/components/SuccessBanner'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { getEffectiveClauses } from '@/lib/contractClauses'
import { getCompanyName } from '@/lib/getCompanyName'
import AppTopBar from '@/components/AppTopBar'
import { ContractDocument, type ContractOpening, type ContractClause } from '@/components/contract/ContractDocument'

interface Profile {
  id: string
  first_name: string | null; last_name: string | null; team_owner_id: string | null
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

const F      = '"Inter", system-ui, sans-serif'
const BLUE   = '#2563EB'
const INK    = '#0B1220'
const INK_M  = '#475467'
const INK_S  = '#94A0B4'
const HAIR_S = 'rgba(15,23,42,0.14)'

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

export default function ContractPage() {
  const router       = useRouter()
  const { id }       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const trigger      = searchParams.get('trigger') || 'send'
  const urlPayment   = searchParams.get('payment_method')
  const urlDeposit   = searchParams.get('deposit_percent')
  const supabase     = createClient()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<ContractOpening[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>('Your Contractor')
  const [ownerSignatureUrl, setOwnerSignatureUrl] = useState<string | null>(null)
  const [repName, setRepName] = useState<string>('')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)

  const svgRef                                        = useRef<SVGSVGElement>(null)
  const [paths,              setPaths]              = useState<string[]>([])
  const [currentPath,        setCurrentPath]        = useState<string>('')
  const [isDrawing,          setIsDrawing]          = useState(false)
  const [agreedToTerms,      setAgreedToTerms]      = useState(false)
  const [showSuccess,        setShowSuccess]        = useState(false)
  const [showSignedDoc,      setShowSignedDoc]      = useState(false)
  const [clientSignatureUrl, setClientSignatureUrl] = useState<string | null>(null)
  const [flash,              setFlash]              = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [signingFailed,      setSigningFailed]      = useState(false)
  const [pendingContractId,  setPendingContractId]  = useState<string | null>(null)
  const [signedContractId,   setSignedContractId]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const myId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      const [{ data: est }, { data: ops, error: opsErr }, { data: myProf }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('*').eq('estimate_id', id).order('created_at', { ascending: true }),
        supabase.from('profiles').select('team_owner_id').eq('id', myId).single(),
      ])
      if (opsErr) console.error('[contract page] openings error:', opsErr)
      if (!est) { setLoading(false); return }

      const myRoot = myProf?.team_owner_id || myId
      const estOwnerId = est.user_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      if (estOwnerId !== myRoot) {
        const { data: estOwnerProf } = await supabase.from('profiles').select('team_owner_id').eq('id', estOwnerId).single()
        const estRoot = estOwnerProf?.team_owner_id || estOwnerId
        if (estRoot !== myRoot) { setLoading(false); return }
      }

      setEstimate(est)
      setOpenings(ops || [])
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, company_name, phone, email, address, city, province, postal, website, licence, signature_url, contract_terms, logo_url, deposit_percent, warranty_period, warranty_summary, completion_timeframe, payment_methods, project_manager, contract_clauses, gst_hst_number, signing_rep_name, signing_rep_title, first_name, last_name, team_owner_id')
        .eq('id', estOwnerId)
        .single()
      if (prof) setProfile(prof as Profile)
      setRepName([prof?.first_name, prof?.last_name].filter(Boolean).join(' '))
      if (prof?.team_owner_id) {
        const ownerSanitized = prof.team_owner_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
        const { data: ownerProf } = await supabase.from('profiles').select('signature_url').eq('id', ownerSanitized).single()
        if (ownerProf?.signature_url) setOwnerSignatureUrl(ownerProf.signature_url)
      }
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
      if (!hasValidSig) { showFlash('Please sign using your finger or stylus'); return }
      if (!agreedToTerms) { showFlash('Please agree to the terms before signing'); return }
    }

    setSending(true)
    setSigningFailed(false)
    try {
      let contractId = pendingContractId

      if (!contractId) {
        const estimateUpdate: Record<string, unknown> = {}
        if (urlPayment) estimateUpdate.payment_method  = urlPayment
        if (urlDeposit) estimateUpdate.deposit_percent = parseFloat(urlDeposit!)
        if (Object.keys(estimateUpdate).length > 0) {
          await supabase.from('estimates').update(estimateUpdate).eq('id', id)
        }

        const contractStatus = trigger === 'sign' ? 'signing' : 'sent'
        const { data: newContract, error } = await supabase
          .from('contracts')
          .insert({
            estimate_id: id,
            profile_id: profile?.id,
            status: contractStatus,
            contract_terms_snapshot: profile?.contract_terms,
            contractor_signature_url: profile?.signature_url || ownerSignatureUrl || null,
            rep_name: repName || null,
            company_name: resolvedCompanyName,
            company_email: profile?.email || '',
            company_phone: profile?.phone || '',
            ...(urlDeposit ? { deposit_percent: parseFloat(urlDeposit) } : {}),
            ...(urlPayment ? { payment_method: urlPayment } : {}),
          })
          .select()
          .single()

        if (error || !newContract) {
          showFlash('Error creating contract: ' + (error?.message || 'Unknown error'))
          return
        }

        contractId = newContract.id
        if (trigger === 'sign') setPendingContractId(contractId)
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

        let signRes: Response
        try {
          signRes = await fetch('/api/sign-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractId, signatureBase64, clientName: estimate?.client_name, agreedToTerms }),
          })
        } catch {
          setSigningFailed(true)
          return
        }
        const result = await signRes.json()
        if (!signRes.ok) {
          setSigningFailed(false)
          showFlash('Signing failed: ' + (result.error || 'Unknown error'))
          return
        }

        setPendingContractId(null)
        setSigningFailed(false)
        setClientSignatureUrl(result.signatureUrl)
        setSignedContractId(contractId)

        await fetch('/api/create-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimateId: id }),
        })

        setShowSuccess(true)
        return
      }

      if (!estimate?.client_email) { showFlash('No client email on this estimate'); return }
      const sendRes = await fetch('/api/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          estimateId: id,
          clientEmail: estimate.client_email,
          clientName: estimate.client_name,
          companyName: resolvedCompanyName,
        }),
      })
      const sendResult = await sendRes.json()
      if (!sendRes.ok) {
        showFlash('Failed to send: ' + (sendResult.error || 'Unknown error'))
        return
      }
      showFlash('Contract sent to ' + estimate.client_email, 'success')
      setTimeout(() => router.push(`/dashboard/estimates/${id}`), 1600)
    } catch (e: any) {
      showFlash('Error: ' + (e?.message || JSON.stringify(e)))
    } finally {
      setSending(false)
    }
  }

  const contractDisplayId = 'CON-' + estimate.id.slice(0, 6).toUpperCase()
  const createdDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.created_at))
  const depositPct  = urlDeposit ? parseFloat(urlDeposit) : (profile?.deposit_percent ?? 30)
  const isEmpty     = paths.length === 0
  const hasValidSig = getTotalPathLength(paths) >= 50
  const taxRate     = estimate.subtotal > 0 ? Math.round(estimate.tax_amount / estimate.subtotal * 100) : 0
  const taxLabel    = estimate.tax_amount > 0 ? (taxRate > 0 ? `Tax (${taxRate}%)` : 'Tax') : null

  const enabledClauses: ContractClause[] = getEffectiveClauses(profile?.contract_clauses)
    .filter((c: any) => c.enabled !== false)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

  const paymentValue = urlPayment || (profile?.payment_methods && profile.payment_methods.length > 0 ? profile.payment_methods.join(', ') : null)

  const detCards: { label: string; value: string }[] = []
  if (profile?.warranty_period)      detCards.push({ label: 'Warranty period',      value: profile.warranty_period })
  if (profile?.completion_timeframe) detCards.push({ label: 'Completion timeframe', value: profile.completion_timeframe })
  if (paymentValue)                  detCards.push({ label: 'Accepted payment',      value: paymentValue })
  if (profile?.project_manager)      detCards.push({ label: 'Project manager',       value: profile.project_manager })

  const ctaDisabled = trigger === 'sign' ? (!hasValidSig || !agreedToTerms || sending) : sending

  // Client signature slot — varies by trigger state
  const todayFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
  const clientSignatureSlot = trigger === 'sign' ? (
    clientSignatureUrl ? (
      <img src={clientSignatureUrl} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
    ) : (
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
    )
  ) : (
    <div style={{ width: '100%', height: 64, border: '1.5px dashed rgba(37,99,235,0.45)', borderRadius: 8, background: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: BLUE }}>Awaiting signature</span>
    </div>
  )

  const companyCityProvince = [profile?.city, profile?.province].filter(Boolean).join(', ') || null
  const clientCityProvince  = [estimate.client_city, estimate.client_province].filter(Boolean).join(', ') || null

  return (
    <>
      {/* ── SUCCESS OVERLAY ── */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', fontFamily: F, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginBottom: 10, textAlign: 'center' }}>You&apos;re all signed!</div>
          <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, textAlign: 'center', maxWidth: 300, marginBottom: 28 }}>
            Thank you, <strong style={{ color: INK }}>{estimate.client_name}</strong>. Payment instructions have been sent to your email.
          </div>
          <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 6 }}>Deposit Due</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{fmtCAD(estimate.total * (depositPct / 100))}</div>
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
          <button
            onClick={() => setShowSignedDoc(true)}
            style={{ width: '100%', maxWidth: 360, background: BLUE, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', font: `700 15px ${F}`, cursor: 'pointer', marginBottom: 12 }}>
            View signed contract →
          </button>
          <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: INK_S, cursor: 'pointer', fontFamily: F, padding: '10px 24px' }}>
            Done
          </button>
        </div>
      )}

      {/* ── SIGNED DOC VIEW ── */}
      {showSignedDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#E9ECF2', fontFamily: F, display: 'flex', flexDirection: 'column' }}>
          <AppTopBar onBack={() => setShowSignedDoc(false)} backLabel="Back" title="Signed Contract" />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ContractDocument
              companyName={resolvedCompanyName}
              contractDisplayId={contractDisplayId}
              createdDate={createdDate}
              logoUrl={profile?.logo_url ?? null}
              companyPhone={profile?.phone ?? null}
              companyEmail={profile?.email ?? null}
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
              depositRequired={true}
              detCards={detCards}
              enabledClauses={enabledClauses}
              province={profile?.province ?? null}
              contractorSigUrl={profile?.signature_url || ownerSignatureUrl || null}
              repName={repName}
              clientSignatureSlot={
                <img src={clientSignatureUrl!} alt="Client signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
              }
              clientSigDate={todayFmt}
              downloadHref={signedContractId ? `/api/contract-pdf-gen?contractId=${signedContractId}` : undefined}
              bottomPadding={24}
            />
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{ minHeight: '100vh', background: '#E9ECF2', fontFamily: F, display: 'flex', flexDirection: 'column' }}>
        <AppTopBar onBack={() => router.back()} backLabel="Back" title="Contract" />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ContractDocument
            companyName={resolvedCompanyName}
            contractDisplayId={contractDisplayId}
            createdDate={createdDate}
            logoUrl={profile?.logo_url ?? null}
            companyPhone={profile?.phone ?? null}
            companyEmail={profile?.email ?? null}
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
            depositRequired={true}
            detCards={detCards}
            enabledClauses={enabledClauses}
            province={profile?.province ?? null}
            contractorSigUrl={profile?.signature_url || ownerSignatureUrl || null}
            repName={repName}
            clientSignatureSlot={clientSignatureSlot}
            clientSigDate={clientSignatureUrl ? todayFmt : ' '}
            bottomPadding={140}
          />
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
          {signingFailed && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#92400E', textAlign: 'center' as const }}>
              Connection lost — your signature is preserved. Tap below to retry.
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
              ? (sending ? 'Signing…' : signingFailed ? 'Retry signing →' : 'Sign Contract')
              : (sending ? 'Sending…' : 'Send to client →')}
          </button>
        </div>
      </div>
    </>
  )
}
