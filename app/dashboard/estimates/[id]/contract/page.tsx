'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'

interface Opening {
  id: string; type: string; qty: number; total_cost: number
  width?: number; height_in?: string; colour?: string; glass?: string
}
interface Profile {
  id: string
  company_name: string | null; phone: string | null; email: string | null
  address: string | null; city: string | null; postal_code: string | null; website: string | null
  licence_number: string | null
  contract_terms: string | null; deposit_percent: number | null
  signature_url: string | null; logo_url: string | null
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
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const supabase = createClient()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)

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
      const { data: { session } } = await supabase.auth.getSession()
      const sessionUserId = session?.user?.id
      console.log('[contract page] sessionUserId:', sessionUserId)
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('id, company_name, phone, email, address, city, postal_code, website, licence_number, signature_url, contract_terms, logo_url, deposit_percent')
        .eq('id', sessionUserId)
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

  async function handleSend() {
    if (!estimate?.client_email) { alert('No client email on this estimate'); return }
    setSending(true)
    console.log('[handleSend] profile:', profile)
    console.log('[handleSend] profile?.id:', profile?.id)
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[handleSend] session user:', session?.user?.id)
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          estimate_id: id,
          profile_id: profile?.id,
          status: 'sent',
          contract_terms_snapshot: profile?.contract_terms,
          contractor_signature_url: profile?.signature_url,
          company_name: profile?.company_name || '',
          company_email: profile?.email || '',
          company_phone: profile?.phone || '',
        })
        .select()
        .single()

      if (error || !contract) {
        alert('Error creating contract: ' + error?.message)
        return
      }

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

  const contractId = 'CON-' + estimate.id.slice(0, 6).toUpperCase()
  const createdDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.created_at))
  const depositAmt = profile?.deposit_percent
    ? estimate.total * (profile.deposit_percent / 100)
    : 0

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #E8E8E8', marginBottom: 12, overflow: 'hidden',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: F, display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}>
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
      <div style={{ padding: '16px 16px 120px', flex: 1, paddingBottom: 160 }}>

        {/* PARTIES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {/* Contractor */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #E8E8E8' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892b0', marginBottom: 8 }}>Contractor</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0E1A', marginBottom: 4 }}>{profile?.company_name || '—'}</div>
            <div style={{ fontSize: 11, color: '#8892b0', lineHeight: 1.6 }}>
              {profile?.phone && <div>{profile.phone}</div>}
              {profile?.city && <div>{profile.city}</div>}
            </div>
            {profile?.licence_number && (
              <div style={{ marginTop: 8 }}>
                <span style={{ background: '#EEF2FF', color: '#2045B8', fontSize: 9, borderRadius: 6, padding: '2px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  LIC #{profile.licence_number}
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
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < openings.length - 1 ? '1px solid #F4F4F2' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A' }}>{name} × {op.qty}</div>
                    {(op.colour || op.glass) && (
                      <div style={{ fontSize: 11, color: '#8892b0', marginTop: 2 }}>
                        {[op.colour, op.glass].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0E1A', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
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
              <div style={{ background: '#EEF2FF', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: '#2045B8', fontWeight: 600 }}>
                  Deposit due upon signing ({profile.deposit_percent}%)
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2045B8' }}>{fmtCAD(depositAmt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* TERMS & CONDITIONS */}
        <div style={cardStyle}>
          <CardHeader icon={<DocumentIcon />} title="Terms & Conditions" />
          <div style={{ padding: '14px 16px' }}>
            {profile?.contract_terms && (
              <p style={{ fontSize: 12, color: '#353A3E', lineHeight: 1.65, marginBottom: 14, margin: '0 0 14px' }}>
                {profile.contract_terms}
              </p>
            )}
            <CheckRow text={`Warranty: All materials and labour are warranted for ${profile?.warranty_period || '1 year'} from installation date.`} />
            <CheckRow text={`Payment: ${profile?.payment_terms || 'Upon completion'}`} />
            <CheckRow text={`Cancellation: ${profile?.cancellation_policy || 'Either party may cancel with 72 hours written notice prior to the scheduled start date.'}`} />
            <CheckRow text="Access: Client agrees to provide reasonable access to the property on scheduled installation day." />
          </div>
        </div>

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
              <div style={{ height: 60, border: '1.5px dashed #E0E0E0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#C0C8D0' }}>Awaiting signature</span>
              </div>
              <div style={{ borderBottom: '1.5px solid #0A0E1A', marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: '#8892b0' }}>{estimate.client_name || '—'}</div>
              <div style={{ fontSize: 11, color: '#8892b0' }}>Date: ___________</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 0 40px', display: 'flex', gap: 10 }}>
          <button onClick={handleSend} disabled={sending}
            style={{ flex: 1, background: '#2045B8', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: sending ? 0.7 : 1 }}>
            {sending ? 'Sending…' : 'Send to client →'}
          </button>
          <button onClick={() => alert('Coming in next update')}
            style={{ width: 52, height: 52, background: '#fff', border: '1px solid #E8E8E8', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#353A3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </button>
        </div>

      </div>

    </div>
  )
}
