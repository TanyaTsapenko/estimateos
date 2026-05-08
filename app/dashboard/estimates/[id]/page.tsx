'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { Mail, Link2, PenLine, FileDown, Receipt, Trash2, ArrowLeft, Loader2 } from 'lucide-react'

interface Opening {
  id: string; type: string; qty: number; width: string
  width_in: number | null; height_in: number | null
  room: string | null; total_cost: number; install: string | null
}

const INSTALL_LABELS: Record<string, string> = {
  insert: 'Retrofit', retrofit: 'Retrofit', fullframe: 'Full Frame', stud_to_stud: 'Stud to Stud',
}
interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  client_phone: string | null; client_address: string | null; client_city: string | null
  client_province: string | null; scope_notes: string | null; status: string
  tier: string | null; subtotal: number; tax_rate: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  payment_method: string | null
  signed_at: string | null; client_signature_url: string | null; valid_until: string | null
  sent_method: string | null; created_at: string; user_id: string
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
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: ops }] = await Promise.all([
        supabase.from('estimates').select('*').eq('id', id).single(),
        supabase.from('estimate_openings').select('id, type, qty, width, width_in, height_in, room, total_cost, install').eq('estimate_id', id).order('sort_order'),
      ])
      setEstimate(est)
      setOpenings(ops || [])
      if (est?.user_id) {
        const { data: prof } = await supabase.from('profiles').select('contract_pdf_url').eq('id', est.user_id).single()
        setContractPdfUrl((prof as any)?.contract_pdf_url || null)
      }
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

  async function handleSendEmail(mode: 'estimate' | 'estimate_contract' | 'contract') {
    if (!estimate?.client_email) { showToast('⚠️ No client email on this estimate'); return }
    setSending(true); setShowEmailModal(false)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, type: 'send', sendMode: mode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      const sentMethod = mode === 'estimate' ? 'email_estimate' : mode === 'estimate_contract' ? 'email_estimate_contract' : 'email_contract'
      await supabase.from('estimates').update({ status: 'sent', sent_method: sentMethod }).eq('id', id)
      setEstimate(p => p ? { ...p, status: 'sent', sent_method: sentMethod } : p)
      showToast('📧 Sent to ' + estimate.client_email)
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

  // ── SHARED SUB-COMPONENTS ──────────────────

  const TotalCard = () => (
    <div style={{ background: '#F4F5F7', border: '1.5px solid #1A2744', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
        {estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'} Tier
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#2045B8' }}>{fmtCAD(estimate.total)}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}</div>
    </div>
  )

  const ClientCard = () => (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: estimate.payment_method ? 6 : 0 }}>
          <span style={{ color: 'var(--ash)' }}>Address</span>
          <span style={{ fontWeight: 500, color: 'var(--jet)', textAlign: 'right' }}>{estimate.client_address}{estimate.client_city ? `, ${estimate.client_city}` : ''}</span>
        </div>
      )}
      {estimate.payment_method && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--ash)' }}>Payment</span>
          <span style={{ fontWeight: 500, color: 'var(--jet)' }}>{estimate.payment_method}</span>
        </div>
      )}
    </div>
  )

  const OpeningsList = () => (
    <>
      {openings.map(op => (
        <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)' }}>
              {OPENING_TYPES[op.type]?.icon} {OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
            </div>
            {(op.width_in || op.height_in) && (
              <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{op.width_in}" × {op.height_in}"</div>
            )}
            {op.install && (
              <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{INSTALL_LABELS[op.install] || op.install}</div>
            )}
            {op.room && <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>{op.room}</div>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{fmtCAD(op.total_cost)}</div>
        </div>
      ))}
    </>
  )

  const PriceBreakdown = () => (
    <div className="sum-box" style={{ marginTop: 12 }}>
      <div className="sum-row"><span>Subtotal</span><span>{fmtCAD(estimate.subtotal)}</span></div>
      {estimate.discount_amount > 0 && (
        <div className="sum-row" style={{ color: '#16a34a' }}>
          <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
          <span>−{fmtCAD(estimate.discount_amount)}</span>
        </div>
      )}
      <div className="sum-row"><span>{taxLabel}</span><span>{fmtCAD(estimate.tax_amount)}</span></div>
      <div className="sum-total">
        <span className="sum-total-l">Total</span>
        <span className="sum-total-v">{fmtCAD(estimate.total)}</span>
      </div>
    </div>
  )

  const DepositBlock = () => depositInvoice ? (
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
  ) : null

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

      {/* ── DESKTOP STICKY ACTION BAR ── */}
      <div className="action-bar desktop-only">
        <button className="action-bar-btn" onClick={() => router.push('/dashboard/estimates')}>
          <ArrowLeft size={14} /> Estimates
        </button>
        <div className="action-bar-sep" />
        {estimate.client_email && estimate.status !== 'signed' && estimate.status !== 'declined' && (
          <button className="action-bar-btn filled" onClick={() => setShowEmailModal(true)} disabled={sending}>
            {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
            {sending ? 'Sending…' : 'Email client'}
          </button>
        )}
        {estimate.status === 'signed' && (
          <button className="action-bar-btn filled" onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}>
            <Receipt size={14} />
            {depositInvoice ? 'Final invoice' : 'Create invoice'}
          </button>
        )}
        <button className="action-bar-btn" onClick={copyLink}>
          <Link2 size={14} /> Copy link
        </button>
        {estimate.status !== 'signed' && (
          <button className="action-bar-btn" onClick={() => router.push(`/dashboard/estimates/${id}/sign`)}>
            <PenLine size={14} /> Sign in-person
          </button>
        )}
        <button className="action-bar-btn" onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')}>
          <FileDown size={14} /> PDF
        </button>
        <div className="action-bar-sep" />
        <button className="action-bar-btn danger" onClick={deleteEstimate}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* ── DESKTOP TWO-COL CONTENT ── */}
      <div className="dash-bg screen-enter desktop-only">
        <div className="est-detail-2col">
          {/* Left: client + estimate info */}
          <div>
            <TotalCard />

            <div className="sl">Client details</div>
            <ClientCard />

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

            <DepositBlock />
          </div>

          {/* Right: openings + pricing */}
          <div>
            <div className="sl">Openings ({openings.length})</div>
            <OpeningsList />
            <PriceBreakdown />
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="dash-bg screen-enter mobile-only">
        <TotalCard />

        <div className="sl">Client details</div>
        <ClientCard />

        <div className="sl">Openings ({openings.length})</div>
        <OpeningsList />

        <PriceBreakdown />

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

        <DepositBlock />

        <div className="sl">Actions</div>
        <div className="est-actions">
          {estimate.client_email && estimate.status !== 'signed' && estimate.status !== 'declined' && (
            <button className="est-act-primary" onClick={() => setShowEmailModal(true)} disabled={sending}>
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
              {sending ? 'Sending…' : 'Email client'}
            </button>
          )}
          {estimate.status === 'signed' && (
            <button className="est-act-primary" onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}>
              <Receipt size={16} />
              {depositInvoice
                ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)} remaining`
                : 'Create invoice'}
            </button>
          )}
          <div className="est-act-row">
            <button className="est-act-secondary" onClick={copyLink}>
              <Link2 size={15} /> Copy link
            </button>
            {estimate.status !== 'signed' && (
              <button className="est-act-secondary" onClick={() => router.push(`/dashboard/estimates/${id}/sign`)}>
                <PenLine size={15} /> Sign in-person
              </button>
            )}
            <button className="est-act-secondary" onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')}>
              <FileDown size={15} /> PDF
            </button>
          </div>
          <div className="est-act-divider" />
          <button className="est-act-delete" onClick={deleteEstimate}>
            <Trash2 size={14} /> Delete estimate
          </button>
        </div>

        <div style={{ height: 20 }} />
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowEmailModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--jet)' }}>Send to client</div>
              <button onClick={() => setShowEmailModal(false)}
                style={{ background: 'var(--surface)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: 'var(--ash)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ash)', marginBottom: 14 }}>Choose what to send to {estimate.client_email}:</div>
            <button style={{ width: '100%', background: 'rgba(59,108,255,.06)', border: '1.5px solid rgba(59,108,255,.2)', borderRadius: 12, padding: '13px 16px', marginBottom: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onClick={() => handleSendEmail('estimate')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2045B8', marginBottom: 3 }}>📋 Estimate only</div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>Send the estimate with pricing and tier selection</div>
            </button>
            <button style={{ width: '100%', background: contractPdfUrl ? 'rgba(59,108,255,.06)' : 'rgba(107,114,128,.04)', border: `1.5px solid ${contractPdfUrl ? 'rgba(59,108,255,.2)' : 'var(--border)'}`, borderRadius: 12, padding: '13px 16px', marginBottom: 8, cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.55 }}
              disabled={!contractPdfUrl}
              onClick={() => contractPdfUrl && handleSendEmail('estimate_contract')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: contractPdfUrl ? '#2045B8' : 'var(--ash)', marginBottom: 3 }}>📋 Estimate + Contract</div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>{contractPdfUrl ? 'Client reads contract first, then reviews and signs the estimate' : 'No contract uploaded — go to Settings → Contract to upload one'}</div>
            </button>
            <button style={{ width: '100%', background: contractPdfUrl ? 'rgba(59,108,255,.06)' : 'rgba(107,114,128,.04)', border: `1.5px solid ${contractPdfUrl ? 'rgba(59,108,255,.2)' : 'var(--border)'}`, borderRadius: 12, padding: '13px 16px', cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.55 }}
              disabled={!contractPdfUrl}
              onClick={() => contractPdfUrl && handleSendEmail('contract')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: contractPdfUrl ? '#2045B8' : 'var(--ash)', marginBottom: 3 }}>📄 Contract only</div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>{contractPdfUrl ? 'Send only the contract PDF for client signature' : 'No contract uploaded — go to Settings → Contract to upload one'}</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
