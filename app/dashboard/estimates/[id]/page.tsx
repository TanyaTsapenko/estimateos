'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { Mail, Link2, PenLine, FileDown, Receipt, Trash2, ArrowLeft, Loader2, Check } from 'lucide-react'

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

// ── CARD SHELL ──────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10 }}>
      {children}
    </div>
  )
}

// ── ACTION BUTTON STYLES ─────────────────────────────
const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  width: '100%', padding: '11px 0',
  background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  flex: 1, padding: '9px 0',
  background: 'transparent', color: '#0A1628',
  border: '1.5px solid #E2E5EA', borderRadius: 10,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const btnGhost: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '9px 12px',
  background: 'transparent', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 500, color: '#0A1628', cursor: 'pointer', fontFamily: 'inherit',
  textAlign: 'left',
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

  // ── LOADING ─────────────────────────────────────────
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

  const [, taxLabel] = TAX_RATES[estimate.client_province || 'AB'] || [0, 'Tax']
  const isSigned   = estimate.status === 'signed' || estimate.status === 'invoiced'
  const isDeclined = estimate.status === 'declined'
  const canEmail   = !!estimate.client_email && !isSigned && !isDeclined
  const signedDate = estimate.signed_at
    ? new Date(estimate.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // ── SUB-COMPONENTS ──────────────────────────────────

  const TierCard = () => (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <CardLabel>{estimate.tier ? estimate.tier.charAt(0).toUpperCase() + estimate.tier.slice(1) : 'Better'} Tier</CardLabel>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#2563EB', lineHeight: 1, marginBottom: 6 }}>
        {fmtCAD(estimate.total)}
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8' }}>
        inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}
      </div>
    </Card>
  )

  const ClientCard = () => (
    <Card style={{ padding: '16px 20px', marginBottom: 12 }}>
      <CardLabel>Client Details</CardLabel>
      {[
        estimate.client_email   && { label: 'Email',   value: estimate.client_email },
        estimate.client_phone   && { label: 'Phone',   value: estimate.client_phone },
        estimate.client_address && { label: 'Address', value: `${estimate.client_address}${estimate.client_city ? `, ${estimate.client_city}` : ''}` },
        estimate.payment_method && { label: 'Payment', value: estimate.payment_method },
      ].filter(Boolean).map((row: any, i, arr) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, fontSize: 12, padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
          <span style={{ color: '#64748B', flexShrink: 0 }}>{row.label}</span>
          <span style={{ fontWeight: 600, color: '#0A1628', textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}
    </Card>
  )

  const OpeningsCard = () => (
    <Card style={{ padding: '16px 20px', marginBottom: 12 }}>
      <CardLabel>Openings ({openings.length})</CardLabel>
      {openings.map((op, i) => (
        <div key={op.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < openings.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>
              {OPENING_TYPES[op.type]?.icon} {OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
            </div>
            {(op.width_in || op.height_in) && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{op.width_in}" × {op.height_in}"</div>
            )}
            {op.install && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{INSTALL_LABELS[op.install] || op.install}</div>
            )}
            {op.room && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{op.room}</div>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
        </div>
      ))}
    </Card>
  )

  const PriceBreakdownCard = () => (
    <Card style={{ padding: '16px 20px', marginBottom: 12 }}>
      <CardLabel>Price Breakdown</CardLabel>
      {[
        { label: 'Subtotal', value: fmtCAD(estimate.subtotal), color: '#0A1628' },
        estimate.discount_amount > 0 && {
          label: `Discount${estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}`,
          value: `−${fmtCAD(estimate.discount_amount)}`, color: '#16a34a',
        },
        { label: taxLabel, value: fmtCAD(estimate.tax_amount), color: '#0A1628' },
      ].filter(Boolean).map((row: any) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #EEF0F4', color: row.color }}>
          <span>{row.label}</span>
          <span style={{ fontWeight: 600 }}>{row.value}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, marginTop: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>Total</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>{fmtCAD(estimate.total)}</span>
      </div>
    </Card>
  )

  const DepositCard = () => depositInvoice ? (
    <Card style={{ padding: '16px 20px', marginBottom: 12, background: 'rgba(37,99,235,.03)', boxShadow: '0 0 0 1.5px rgba(37,99,235,.15)' }}>
      <CardLabel>Deposit Invoice</CardLabel>
      {[
        { label: 'Deposit amount',    value: fmtCAD(depositInvoice.amount),                             color: '#F59E0B' },
        { label: 'Remaining balance', value: fmtCAD(estimate.total - depositInvoice.amount),             color: '#0A1628' },
        { label: 'Deposit status',    value: depositInvoice.status,                                      color: depositInvoice.status === 'paid' ? '#16a34a' : '#2563EB' },
      ].map((row, i, arr) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEF0F4' : 'none' }}>
          <span style={{ color: '#64748B' }}>{row.label}</span>
          <span style={{ fontWeight: 700, color: row.color, textTransform: 'capitalize' }}>{row.value}</span>
        </div>
      ))}
    </Card>
  ) : null

  // ── STATUS ACTION CARD (right column) ───────────────

  const StatusActionCard = () => isSigned ? (
    <Card style={{ padding: 20, marginBottom: 12, background: 'rgba(22,163,74,.04)', boxShadow: '0 0 0 1.5px rgba(22,163,74,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#16a34a' }}>
          SIGNED
        </div>
      </div>
      {signedDate && (
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Signed on {signedDate}</div>
      )}
      <button
        onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
        style={{ ...btnPrimary, background: '#16a34a' }}>
        <Receipt size={14} />
        {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
      </button>
    </Card>
  ) : (
    <Card style={{ padding: 20, marginBottom: 12, background: 'rgba(37,99,235,.04)', boxShadow: '0 0 0 1.5px rgba(37,99,235,.15)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2563EB', marginBottom: 4 }}>
        READY TO SEND
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
        Send to client for review and signature
      </div>
      {canEmail && (
        <button onClick={() => setShowEmailModal(true)} disabled={sending} style={{ ...btnPrimary, marginBottom: 8 }}>
          {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
          {sending ? 'Sending…' : 'Email client'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copyLink} style={btnOutline}>
          <Link2 size={13} /> Copy link
        </button>
        <button onClick={() => router.push(`/dashboard/estimates/${id}/sign`)} style={btnOutline}>
          <PenLine size={13} /> Sign now
        </button>
      </div>
    </Card>
  )

  const MoreActionsCard = () => (
    <Card style={{ padding: '12px 8px' }}>
      <div style={{ padding: '0 12px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
        MORE ACTIONS
      </div>
      <button onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')} style={btnGhost}>
        <FileDown size={15} color="#64748B" /> Download PDF
      </button>
      {!isSigned && (
        <button onClick={() => router.push(`/dashboard/estimates/${id}/sign`)} style={btnGhost}>
          <PenLine size={15} color="#64748B" /> Sign in-person
        </button>
      )}
      <div style={{ height: 1, background: '#EEF0F4', margin: '6px 12px' }} />
      <button onClick={deleteEstimate} style={{ ...btnGhost, color: '#DC2626' }}>
        <Trash2 size={15} color="#DC2626" /> Delete estimate
      </button>
    </Card>
  )

  // ── MAIN RENDER ─────────────────────────────────────
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

      {/* ── ACTION BAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EEF0F4',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {isSigned ? (
          <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <Receipt size={13} /> {depositInvoice ? 'Final invoice' : 'Create invoice'}
          </button>
        ) : canEmail ? (
          <button onClick={() => setShowEmailModal(true)} disabled={sending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: sending ? 0.6 : 1 }}>
            {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />}
            {sending ? 'Sending…' : 'Email client'}
          </button>
        ) : null}
        <button onClick={copyLink}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', color: '#0A1628', border: '1px solid #EEF0F4', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <Link2 size={13} /> Copy link
        </button>
        <button onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', color: '#0A1628', border: '1px solid #EEF0F4', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <FileDown size={13} /> PDF
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={deleteEstimate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#DC2626', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '24px 28px 80px' }}>
        <div className="est-3col">

          {/* ── LEFT COLUMN ── */}
          <div>
            <TierCard />
            <ClientCard />
            {isSigned && signedDate && (
              <div style={{ background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.18)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                <Check size={14} strokeWidth={2.5} /> Signed on {signedDate}
              </div>
            )}
            <DepositCard />
          </div>

          {/* ── MIDDLE COLUMN ── */}
          <div>
            <OpeningsCard />
            {estimate.scope_notes && (
              <Card style={{ padding: '16px 20px', marginBottom: 12 }}>
                <CardLabel>Scope of Work</CardLabel>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>{estimate.scope_notes}</div>
              </Card>
            )}
            <PriceBreakdownCard />
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>
            <StatusActionCard />
            <MoreActionsCard />
          </div>

        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR ── */}
      <div className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #EEF0F4',
        padding: '12px 16px 28px', zIndex: 20,
      }}>
        {isSigned ? (
          <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)} style={btnPrimary}>
            <Receipt size={15} /> {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
          </button>
        ) : (
          <button onClick={() => canEmail ? setShowEmailModal(true) : copyLink()} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1 }} disabled={sending}>
            {sending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : canEmail ? <Mail size={15} /> : <Link2 size={15} />}
            {sending ? 'Sending…' : canEmail ? 'Email client' : 'Copy link'}
          </button>
        )}
      </div>

      {/* ── TOAST ── */}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowEmailModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628' }}>Send to client</div>
              <button onClick={() => setShowEmailModal(false)}
                style={{ background: '#F8FAFC', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Choose what to send to {estimate.client_email}:</div>
            <button style={{ width: '100%', background: 'rgba(37,99,235,.06)', border: '1.5px solid rgba(37,99,235,.2)', borderRadius: 12, padding: '13px 16px', marginBottom: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onClick={() => handleSendEmail('estimate')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', marginBottom: 3 }}>📋 Estimate only</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Send the estimate with pricing and tier selection</div>
            </button>
            <button style={{ width: '100%', background: contractPdfUrl ? 'rgba(37,99,235,.06)' : 'rgba(107,114,128,.04)', border: `1.5px solid ${contractPdfUrl ? 'rgba(37,99,235,.2)' : '#EEF0F4'}`, borderRadius: 12, padding: '13px 16px', marginBottom: 8, cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.55 }}
              disabled={!contractPdfUrl}
              onClick={() => contractPdfUrl && handleSendEmail('estimate_contract')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: contractPdfUrl ? '#2563EB' : '#64748B', marginBottom: 3 }}>📋 Estimate + Contract</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{contractPdfUrl ? 'Client reads contract first, then reviews and signs the estimate' : 'No contract uploaded — go to Settings → Contract to upload one'}</div>
            </button>
            <button style={{ width: '100%', background: contractPdfUrl ? 'rgba(37,99,235,.06)' : 'rgba(107,114,128,.04)', border: `1.5px solid ${contractPdfUrl ? 'rgba(37,99,235,.2)' : '#EEF0F4'}`, borderRadius: 12, padding: '13px 16px', cursor: contractPdfUrl ? 'pointer' : 'not-allowed', textAlign: 'left', fontFamily: 'inherit', opacity: contractPdfUrl ? 1 : 0.55 }}
              disabled={!contractPdfUrl}
              onClick={() => contractPdfUrl && handleSendEmail('contract')}>
              <div style={{ fontSize: 13, fontWeight: 700, color: contractPdfUrl ? '#2563EB' : '#64748B', marginBottom: 3 }}>📄 Contract only</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{contractPdfUrl ? 'Send only the contract PDF for client signature' : 'No contract uploaded — go to Settings → Contract to upload one'}</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
