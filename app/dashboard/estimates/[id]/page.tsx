'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { Mail, Link2, PenLine, FileDown, Receipt, Trash2, ArrowLeft, Loader2, Check, Copy } from 'lucide-react'

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

const STATUS_COLOR: Record<string, string> = {
  draft: '#6b7280', sent: '#2563eb', signed: '#16a34a', declined: '#dc2626', invoiced: '#9333ea',
}
const STATUS_BG: Record<string, string> = {
  draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(22,163,74,.1)',
  declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)',
}

const SL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
  textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10,
}
const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
}

export default function EstimateDetailPage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate,       setEstimate]       = useState<Estimate | null>(null)
  const [openings,       setOpenings]       = useState<Opening[]>([])
  const [depositInvoice, setDepositInvoice] = useState<{ id: string; amount: number; status: string } | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [sending,        setSending]        = useState(false)
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [toast,          setToast]          = useState('')

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

  // ── LOADING ──────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard/estimates')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Estimates
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94A3B8', fontSize: 13 }}>
        Loading…
      </div>
    </div>
  )

  // ── NOT FOUND ────────────────────────────────────────
  if (!estimate) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard/estimates')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Estimates
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>Estimate not found</div>
        <button onClick={() => router.push('/dashboard/estimates')}
          style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>
          ← Back to Estimates
        </button>
      </div>
    </div>
  )

  const [, taxLabel]  = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const isSigned      = estimate.status === 'signed'
  const isInvoiced    = estimate.status === 'invoiced'
  const isDeclined    = estimate.status === 'declined'
  const canEmail      = !!estimate.client_email && !isSigned && !isInvoiced && !isDeclined
  const tierLabel     = estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'
  const signedDate    = estimate.signed_at
    ? new Date(estimate.signed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const clientRows = [
    estimate.client_email   && { label: 'Email',   value: estimate.client_email },
    estimate.client_phone   && { label: 'Phone',   value: estimate.client_phone },
    estimate.client_address && { label: 'Address', value: `${estimate.client_address}${estimate.client_city ? `, ${estimate.client_city}` : ''}` },
    estimate.payment_method && { label: 'Payment', value: estimate.payment_method },
  ].filter(Boolean) as { label: string; value: string }[]

  // ── MAIN RENDER ──────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EEF0F4',
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <button onClick={() => router.push('/dashboard/estimates')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Estimates
          </button>
          <div style={{ width: 1, height: 18, background: '#EEF0F4', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
            {estimate.estimate_number}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {estimate.client_name || 'Client'}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
          color: STATUS_COLOR[estimate.status] || '#64748B',
          background: STATUS_BG[estimate.status] || 'rgba(100,116,139,.1)',
          borderRadius: 6, padding: '4px 10px', flexShrink: 0, marginLeft: 16,
        }}>
          {estimate.status.toUpperCase()}
        </span>
      </div>

      {/* ── BODY ── */}
      <div className="est-detail-body" style={{ padding: '24px 28px 100px' }}>
        <div className="est-3col">

          {/* ── LEFT COLUMN: tier + client in one card ── */}
          <div style={{ ...CARD, padding: 20 }}>
            {/* Tier */}
            <div style={SL}>{tierLabel} Tier</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#2563EB', lineHeight: 1, marginBottom: 6 }}>
              {fmtCAD(estimate.total)}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
              inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#EEF0F4', marginBottom: 16 }} />

            {/* Client details */}
            {clientRows.length > 0 && (
              <>
                <div style={SL}>Client Details</div>
                {clientRows.map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, fontSize: 13, padding: '7px 0', borderBottom: i < clientRows.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
                    <span style={{ color: '#94A3B8', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: '#0A1628', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </>
            )}

            {/* Deposit (if any) */}
            {depositInvoice && (
              <>
                <div style={{ height: 1, background: '#EEF0F4', margin: '16px 0' }} />
                <div style={SL}>Deposit Invoice</div>
                {[
                  { label: 'Deposit amount',    value: fmtCAD(depositInvoice.amount),                   color: '#F59E0B' },
                  { label: 'Remaining balance', value: fmtCAD(estimate.total - depositInvoice.amount),   color: '#0A1628' },
                  { label: 'Status',            value: depositInvoice.status,                            color: depositInvoice.status === 'paid' ? '#16a34a' : '#2563EB' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
                    <span style={{ color: '#94A3B8' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color, textTransform: 'capitalize' }}>{row.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── MIDDLE COLUMN: openings + price in one card ── */}
          <div style={{ ...CARD, padding: 20 }}>
            {/* Openings */}
            <div style={SL}>Openings ({openings.length})</div>
            {openings.map((op, i) => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #EEF0F4' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>
                    {OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                    {(op.width_in && op.height_in) && <span>{op.width_in}" × {op.height_in}"</span>}
                    {op.install && <span>{INSTALL_LABELS[op.install] || op.install}</span>}
                    {op.room && <span>{op.room}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
              </div>
            ))}

            {/* Scope notes */}
            {estimate.scope_notes && (
              <>
                <div style={{ height: 1, background: '#EEF0F4', margin: '16px 0' }} />
                <div style={SL}>Scope of Work</div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>{estimate.scope_notes}</div>
              </>
            )}

            {/* Divider before price */}
            <div style={{ height: 1, background: '#EEF0F4', margin: '16px 0' }} />

            {/* Price breakdown */}
            {[
              { label: 'Subtotal', value: fmtCAD(estimate.subtotal), color: '#64748B', bold: false },
              ...(estimate.discount_amount > 0 ? [{
                label: `Discount${estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}`,
                value: `−${fmtCAD(estimate.discount_amount)}`, color: '#16a34a', bold: false,
              }] : []),
              { label: taxLabel, value: fmtCAD(estimate.tax_amount), color: '#64748B', bold: false },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', color: row.color }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '2px solid #0A1628', marginTop: 10, paddingTop: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', letterSpacing: '-.02em' }}>{fmtCAD(estimate.total)}</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>

            {/* Status action card */}
            {(isSigned || isInvoiced) ? (
              <div style={{ background: '#0F8A6B', borderRadius: 16, padding: 20, marginBottom: 12, marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 6 }}>
                  {isInvoiced ? 'INVOICED' : 'SIGNED'}{signedDate ? ` · ${signedDate}` : ''}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                  {estimate.client_name || 'Client'} signed this estimate
                </div>
                <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0F8A6B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Receipt size={14} />
                  {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
                </button>
              </div>
            ) : (
              <div style={{ background: '#2563EB', borderRadius: 16, padding: 20, marginBottom: 12, marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>
                  READY TO SEND
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                  Send estimate to {estimate.client_name || 'client'}
                </div>
                {canEmail && (
                  <button onClick={() => setShowEmailModal(true)} disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#2563EB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: sending ? 0.7 : 1 }}>
                    {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                    {sending ? 'Sending…' : 'Email client'}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copyLink}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '9px 0', background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Link2 size={13} /> Copy link
                  </button>
                  <button onClick={() => router.push(`/dashboard/estimates/${id}/sign`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '9px 0', background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <PenLine size={13} /> Sign now
                  </button>
                </div>
              </div>
            )}

            {/* More actions card */}
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                MORE ACTIONS
              </div>
              {[
                { icon: <FileDown size={15} color="#64748B" />, label: 'Download PDF', onClick: () => window.open(`/api/pdf?id=${id}`, '_blank'), danger: false },
                { icon: <Copy size={15} color="#64748B" />, label: 'Duplicate estimate', onClick: () => showToast('Coming soon'), danger: false },
                { icon: <Trash2 size={15} color="#DC2626" />, label: 'Delete estimate', onClick: deleteEstimate, danger: true },
              ].map((item, i, arr) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: i < arr.length - 1 ? '1px solid #EEF0F4' : 'none', fontSize: 13, fontWeight: 500, color: item.danger ? '#DC2626' : '#0A1628', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR ── */}
      <div className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #EEF0F4',
        padding: '12px 16px 28px', zIndex: 20,
      }}>
        {(isSigned || isInvoiced) ? (
          <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '13px 0', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Receipt size={15} /> {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
          </button>
        ) : (
          <button onClick={() => canEmail ? setShowEmailModal(true) : copyLink()} disabled={sending}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '13px 0', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}>
            {sending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : canEmail ? <Mail size={15} /> : <Link2 size={15} />}
            {sending ? 'Sending…' : canEmail ? 'Email client' : 'Copy link'}
          </button>
        )}
      </div>

      {/* ── TOAST ── */}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowEmailModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, margin: '0 20px' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Send to client</div>
              <button onClick={() => setShowEmailModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Sending to {estimate.client_email}</div>

            {/* Option 1: Estimate only — always available */}
            <button
              style={{ width: '100%', background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onClick={() => handleSendEmail('estimate')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', marginBottom: 3 }}>Estimate only</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Send the estimate with pricing and tier selection</div>
            </button>

            {/* Option 2: Estimate + Contract */}
            <button
              disabled={!contractPdfUrl}
              style={{ width: '100%', background: contractPdfUrl ? '#F8FAFF' : '#F5F6F8', border: `1px solid ${contractPdfUrl ? '#BFDBFE' : '#EEF0F4'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.5 }}
              onClick={() => contractPdfUrl && handleSendEmail('estimate_contract')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: contractPdfUrl ? '#1E40AF' : '#94A3B8', marginBottom: 3 }}>Estimate + Contract</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{contractPdfUrl ? 'Client reads contract first, then reviews and signs the estimate' : 'No contract uploaded — go to Settings → Contract'}</div>
            </button>

            {/* Option 3: Contract only */}
            <button
              disabled={!contractPdfUrl}
              style={{ width: '100%', background: contractPdfUrl ? '#F8FAFF' : '#F5F6F8', border: `1px solid ${contractPdfUrl ? '#BFDBFE' : '#EEF0F4'}`, borderRadius: 10, padding: '12px 14px', cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.5 }}
              onClick={() => contractPdfUrl && handleSendEmail('contract')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: contractPdfUrl ? '#1E40AF' : '#94A3B8', marginBottom: 3 }}>Contract only</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{contractPdfUrl ? 'Send only the contract PDF for client signature' : 'No contract uploaded — go to Settings → Contract'}</div>
            </button>

          </div>
        </div>
      )}
    </div>
  )
}
