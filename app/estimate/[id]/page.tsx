'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_province: string | null
  status: string; tier: string | null; subtotal: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  scope_notes: string | null; valid_until: string | null
}
interface Opening { id: string; type: string; qty: number; total_cost: number; room: string | null }
interface Profile {
  company_name: string | null; city: string | null; province: string | null
  logo_url: string | null; contract_terms: string | null
}

export default function ClientEstimatePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [docStatus, setDocStatus] = useState<'loading' | 'signed' | 'declined' | 'active'>('loading')

  useEffect(() => {
    async function load() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
      if (!est) return
      setEstimate(est)
      if (est.status === 'signed') setDocStatus('signed')
      else if (est.status === 'declined') setDocStatus('declined')
      else setDocStatus('active')

      const [{ data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimate_openings').select('id, type, qty, total_cost, room').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, city, province, logo_url, contract_terms').eq('id', (est as any).user_id).single(),
      ])
      setOpenings(ops || [])
      setProfile(prof)
    }
    load()
  }, [id])

  const fontFamily = '"Inter", system-ui, -apple-system, sans-serif'

  if (docStatus === 'loading' || !estimate) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily }}>
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
    </div>
  )

  if (docStatus === 'signed') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Already signed</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        {estimate.estimate_number} has already been signed. Contact {profile?.company_name || 'the contractor'} if you have questions.
      </div>
    </div>
  )

  if (docStatus === 'declined') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6F8', fontFamily, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>Estimate declined</div>
      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
        Feel free to reach out to {profile?.company_name || 'us'} if you change your mind.
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const tierLabel = estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : null
  const hasNotes = !!estimate.scope_notes
  const hasTerms = !!profile?.contract_terms

  return (
    <div style={{ background: '#F5F6F8', minHeight: '100vh', fontFamily }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

          {/* Company info */}
          <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #EEF0F4' }}>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={profile.company_name || ''} style={{ height: 40, maxWidth: 160, objectFit: 'contain', marginBottom: 12, display: 'block' }} />
            )}
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628' }}>{profile?.company_name || 'Contractor'}</div>
            {(profile?.city || profile?.province) && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                {[profile?.city, profile?.province].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Estimate number + client */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEF0F4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>Estimate</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>{estimate.estimate_number}</div>
              {estimate.client_name && (
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginTop: 6 }}>{estimate.client_name}</div>
              )}
              {tierLabel && (
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{tierLabel} Package</div>
              )}
            </div>
            {estimate.valid_until && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 3 }}>Valid until</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{estimate.valid_until}</div>
              </div>
            )}
          </div>

          {/* Line items */}
          {openings.length > 0 && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEF0F4' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12 }}>
                Items ({openings.length})
              </div>
              {openings.map((op, idx) => (
                <div key={op.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '10px 0', borderBottom: idx < openings.length - 1 ? '1px solid #EEF0F4' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>
                      {OPENING_TYPES[op.type]?.name || op.type}
                      {op.qty > 1 && <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}> × {op.qty}</span>}
                    </div>
                    {op.room && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{op.room}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', flexShrink: 0 }}>
                    {fmtCAD(op.total_cost)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={{ padding: '16px 24px', borderBottom: hasNotes || hasTerms ? '1px solid #EEF0F4' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 8 }}>
              <span>Subtotal</span>
              <span>{fmtCAD(estimate.subtotal)}</span>
            </div>
            {estimate.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                <span>−{fmtCAD(estimate.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              <span>{taxLabel}</span>
              <span>{fmtCAD(estimate.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #EEF0F4', paddingTop: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', letterSpacing: '-.02em' }}>{fmtCAD(estimate.total)}</span>
            </div>
          </div>

          {/* Scope notes */}
          {hasNotes && (
            <div style={{ padding: '16px 24px', borderBottom: hasTerms ? '1px solid #EEF0F4' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.scope_notes}</div>
            </div>
          )}

          {/* Terms & Conditions */}
          {hasTerms && (
            <div style={{ padding: '16px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Terms &amp; Conditions</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile!.contract_terms}</div>
            </div>
          )}

        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#94A3B8' }}>
          Powered by EstimateOS
        </div>
      </div>
    </div>
  )
}
