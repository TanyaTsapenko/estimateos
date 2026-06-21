'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { getSubtypeLabel } from '@/lib/openingLabels'
import { ArrowLeft } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

interface Opening { id: string; type: string; qty: number; total_cost: number; room: string | null }
interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  client_province: string | null; tier: string | null
  subtotal: number; tax_amount: number; total: number; valid_until: string | null
}
interface Profile { company_name: string | null; contract_terms: string | null }

export default function SignPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const [{ data: est }, { data: ops }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('id, type, qty, total_cost, room').eq('estimate_id', id).order('sort_order'),
        supabase.from('profiles').select('company_name, contract_terms').eq('id', sanitizedId).single(),
      ])
      setEstimate(est)
      setOpenings(ops || [])
      setProfile(prof)
    }
    load()
  }, [id])

  if (!estimate) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <AppTopBar onBack={() => router.push('/dashboard/estimates')} backLabel="Estimates" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94A3B8', fontSize: 13 }}>
        Loading…
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* Topbar */}
      <AppTopBar
        onBack={() => router.back()}
        backLabel="Back"
        right={<span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2563EB', background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 6, padding: '4px 10px' }}>
          CONTRACTOR VIEW
        </span>}
      />

      {/* Body */}
      <div className="card" style={{ paddingTop: 72, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Estimate summary */}
        <div className="sum-box" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)', marginBottom: 10 }}>
            {estimate.client_name} · {estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'} Package
          </div>
          {openings.map(op => (
            <div key={op.id} className="sum-row">
              <span>{OPENING_TYPES[op.type]?.name || op.type}{(op as any).window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''} × {op.qty}{op.room ? ` (${op.room})` : ''}</span>
              <span>{fmtCAD(op.total_cost)}</span>
            </div>
          ))}
          <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span></div>
          <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(estimate.tax_amount)}</span></div>
          <div className="sum-total">
            <span className="sum-total-l">Total</span>
            <span className="sum-total-v">{fmtCAD(estimate.total)}</span>
          </div>
        </div>

        {/* Contract terms preview */}
        <div className="contract-box">
          {profile?.contract_terms || `This estimate prepared by ${profile?.company_name || 'the contractor'} on ${today} is valid until ${estimate.valid_until || '30 days from date of issue'}.\n\nTotal price including applicable taxes: ${fmtCAD(estimate.total)}.\n\nPayment terms: 50% deposit upon signing, balance upon completion.`}
        </div>

        {/* Hand to client */}
        <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border-light)', marginTop: 8 }}>
          <button
            onClick={() => router.push(`/sign/${id}`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Hand to Client →
          </button>
        </div>
      </div>
    </div>
  )
}
