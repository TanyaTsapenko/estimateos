'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'

interface Opening {
  id: string; type: string; qty: number; width: string; room: string | null; total_cost: number
}
interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  client_phone: string | null; client_address: string | null; client_city: string | null
  client_province: string | null; scope_notes: string | null; status: string
  tier: string | null; subtotal: number; tax_rate: number; tax_amount: number; total: number
  signed_at: string | null; client_signature_url: string | null; valid_until: string | null
  sent_method: string | null; created_at: string
}

const statusColor: Record<string, string> = {
  draft: '#6b7280', sent: '#2563eb', signed: '#16a34a', declined: '#dc2626', invoiced: '#9333ea',
}
const statusBg: Record<string, string> = {
  draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(22,163,74,.1)',
  declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)',
}

export default function EstimateDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [depositInvoice, setDepositInvoice] = useState<{ id: string; amount: number; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: ops }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('id, type, qty, width, room, total_cost').eq('estimate_id', id).order('sort_order'),
      ])
      setEstimate(est)
      setOpenings(ops || [])
      if (est?.status === 'signed' || est?.status === 'invoiced') {
        const { data: dep } = await supabase.from('invoices')
          .select('id, amount, status').eq('estimate_id', id).eq('invoice_type', 'deposit').single()
        setDepositInvoice(dep)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function sendByEmail() {
    if (!estimate?.client_email) { showToast('⚠️ No client email on this estimate'); return }
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, type: 'send' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      await supabase.from('estimates').update({ status: 'sent', sent_method: 'email' }).eq('id', id)
      setEstimate(p => p ? { ...p, status: 'sent', sent_method: 'email' } : p)
      showToast('📧 Estimate sent to ' + estimate.client_email)
    } catch (e: any) {
      showToast('⚠️ ' + e.message)
    }
    setSending(false)
  }

  async function deleteEstimate() {
    if (!confirm('Delete this estimate?')) return
    await supabase.from('estimates').delete().eq('id', id)
    router.push('/dashboard/estimates')
  }

  async function copyLink() {
    const link = `${window.location.origin}/estimate/${id}`
    navigator.clipboard.writeText(link)
    if (estimate?.status === 'draft') {
      await supabase.from('estimates').update({ status: 'sent', sent_method: 'link' }).eq('id', id)
      setEstimate(p => p ? { ...p, status: 'sent', sent_method: 'link' } : p)
    }
    showToast('📋 Client link copied!')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div></div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ color: 'var(--ash)', fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  )

  if (!estimate) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div></div>
      <div className="card" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)' }}>Estimate not found</div>
        <button className="btn-next" style={{ maxWidth: 200, marginTop: 20 }} onClick={() => router.push('/dashboard/estimates')}>← Back</button>
      </div>
    </div>
  )

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/estimates')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <span className="badge" style={{ color: statusColor[estimate.status], background: statusBg[estimate.status], padding: '4px 10px', borderRadius: 10, fontSize: 10 }}>
            {estimate.status.toUpperCase()}
          </span>
        </div>
        <div className="h-title">
          <div className="h-eye">{estimate.estimate_number}</div>
          <div className="h-big">{estimate.client_name || 'Client'}</div>
          <div className="h-sub">
            {estimate.client_city && `${estimate.client_city} · `}
            Created {new Date(estimate.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {/* Total card */}
        <div style={{ background: 'linear-gradient(135deg,#0A0E1A,#1A2744)', borderRadius: 16, padding: 16, marginBottom: 12, color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .5, marginBottom: 6 }}>
            {estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'} Tier
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#3B6CFF' }}>{fmtCAD(estimate.total)}</div>
          <div style={{ fontSize: 11, opacity: .5, marginTop: 3 }}>inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}</div>
        </div>

        {/* Client info */}
        <div className="sl">Client details</div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid var(--border-light)' }}>
          {estimate.client_email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--ash)' }}>Email</span>
              <span style={{ fontWeight: 500, color: 'var(--jet)' }}>{estimate.client_email}</span>
            </div>
          )}
          {estimate.client_phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--ash)' }}>Phone</span>
              <span style={{ fontWeight: 500, color: 'var(--jet)' }}>{estimate.client_phone}</span>
            </div>
          )}
          {estimate.client_address && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ash)' }}>Address</span>
              <span style={{ fontWeight: 500, color: 'var(--jet)', textAlign: 'right' }}>{estimate.client_address}{estimate.client_city ? `, ${estimate.client_city}` : ''}</span>
            </div>
          )}
        </div>

        {/* Openings */}
        <div className="sl">Openings ({openings.length})</div>
        {openings.map(op => (
          <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)' }}>
                {OPENING_TYPES[op.type]?.icon} {OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
              </div>
              {op.room && <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{op.room}</div>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{fmtCAD(op.total_cost)}</div>
          </div>
        ))}

        {/* Price breakdown */}
        <div className="sum-box" style={{ marginTop: 12 }}>
          <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span></div>
          <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(estimate.tax_amount)}</span></div>
          <div className="sum-total">
            <span className="sum-total-l">Total</span>
            <span className="sum-total-v">{fmtCAD(estimate.total)}</span>
          </div>
        </div>

        {estimate.scope_notes && (
          <>
            <div className="sl">Scope of work</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 12 }}>{estimate.scope_notes}</div>
          </>
        )}

        {estimate.status === 'signed' && estimate.signed_at && (
          <div className="success-msg">
            ✅ Signed on {new Date(estimate.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        {/* Deposit invoice summary */}
        {depositInvoice && (
          <div style={{ background: 'rgba(59,108,255,.06)', border: '1.5px solid rgba(59,108,255,.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2045B8', marginBottom: 8 }}>Deposit Invoice</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--ash)' }}>Deposit amount</span>
              <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{fmtCAD(depositInvoice.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--ash)' }}>Remaining balance</span>
              <span style={{ fontWeight: 700, color: 'var(--jet)' }}>{fmtCAD(estimate.total - depositInvoice.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ash)' }}>Deposit status</span>
              <span style={{ fontWeight: 700, color: depositInvoice.status === 'paid' ? '#16a34a' : '#2563eb', textTransform: 'capitalize' }}>{depositInvoice.status}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="sl">Actions</div>
        {estimate.client_email && estimate.status !== 'signed' && estimate.status !== 'declined' && (
          <button className="send-btn" onClick={sendByEmail} disabled={sending}>
            <span>📧</span>
            <span>{sending ? 'Sending…' : `Email estimate to ${estimate.client_email}`}</span>
          </button>
        )}
        <button className="send-btn" onClick={copyLink}>
          <span>🔗</span>
          <span>Copy client link (view &amp; sign)</span>
        </button>
        {estimate.status !== 'signed' && (
          <button className="send-btn" onClick={() => router.push(`/dashboard/estimates/${id}/sign`)}>
            <span>✍️</span>
            <span>Sign in-person (hand phone to client)</span>
          </button>
        )}
        {estimate.status === 'signed' && (
          <button className="send-btn" onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}>
            <span>🧾</span>
            <span>
              {depositInvoice
                ? `Create final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)} remaining`
                : 'Create invoice from this estimate'}
            </span>
          </button>
        )}
        <button className="send-btn" onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')}>
          <span>📄</span>
          <span>Download PDF</span>
        </button>
        <button onClick={deleteEstimate}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '10px 0', cursor: 'pointer', marginTop: 4 }}>
          Delete estimate
        </button>

        <div style={{ height: 20 }} />
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
