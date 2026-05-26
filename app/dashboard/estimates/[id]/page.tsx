'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { Mail, MessageSquare, FileDown, FileText, Receipt, Trash2, ArrowLeft, Loader2, Check, Copy } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'

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
  client_province: string | null; status: string
  tier: string | null; subtotal: number; tax_rate: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  payment_method: string | null
  signed_at: string | null; client_signature_url: string | null; valid_until: string | null
  sent_method: string | null; created_at: string; user_id: string; opened_at: string | null
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#6b7280', sent: '#2563eb', opened: '#d97706', signed: '#16a34a', declined: '#dc2626', invoiced: '#9333ea',
}
const STATUS_BG: Record<string, string> = {
  draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', opened: 'rgba(217,119,6,.1)',
  signed: 'rgba(22,163,74,.1)', declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)',
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
  const [profile,        setProfile]        = useState<{ id: string; contract_terms: string | null; company_name: string | null; pricing_mode: string | null; email: string | null; phone: string | null; signature_url: string | null } | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [sending,        setSending]        = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [deleteOpen,     setDeleteOpen]     = useState(false)
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
        const { data: prof } = await supabase.from('profiles').select('id, contract_terms, company_name, pricing_mode, email, phone, signature_url').eq('id', est.user_id).single()
        setProfile(prof)
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

  async function handleSendEmail() {
    if (!estimate?.client_email) { showToast('⚠️ No client email on this estimate'); return }
    setSending(true); setShowEmailModal(false)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, type: 'send', sendMode: 'estimate' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      await supabase.from('estimates').update({ status: 'sent', sent_method: 'email_estimate' }).eq('id', id)
      setEstimate(p => p ? { ...p, status: 'sent', sent_method: 'email_estimate' } : p)
      showToast('📧 Sent to ' + (json.sentTo || estimate.client_email))
    } catch (e: any) {
      showToast('⚠️ ' + e.message)
    }
    setSending(false)
  }

  async function deleteEstimate() {
    await supabase.from('estimates').delete().eq('id', id)
    router.push('/dashboard/estimates')
  }

  async function duplicateEstimate() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !estimate) return

    const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const num = `EST-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: newEst } = await supabase.from('estimates').insert({
      user_id: user.id,
      estimate_number: num,
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      client_phone: estimate.client_phone,
      client_address: estimate.client_address,
      client_province: estimate.client_province,
      tier: estimate.tier,
      status: 'draft',
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      total: estimate.total,
    }).select().single()

    if (newEst) {
      const { data: openings } = await supabase.from('estimate_openings')
        .select('*').eq('estimate_id', estimate.id)
      if (openings?.length) {
        await supabase.from('estimate_openings').insert(
          openings.map(o => ({ ...o, id: undefined, estimate_id: newEst.id }))
        )
      }
      router.push(`/dashboard/estimates/${newEst.id}`)
    }
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

  async function handleSignOnSpot() {
    if (!estimate || !profile) return
    setLoading(true)
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          estimate_id: id,
          profile_id: profile.id,
          status: 'signing',
          contract_terms_snapshot: profile.contract_terms,
          contractor_signature_url: profile.signature_url,
          company_name: profile.company_name || '',
          company_email: profile.email || '',
          company_phone: profile.phone || '',
        })
        .select()
        .single()

      if (error || !contract) {
        alert('Error: ' + error?.message)
        return
      }

      router.push(`/sign/contract/${contract.id}`)
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── LOADING ──────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10 }}>
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
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10 }}>
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
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.signed_at))
    : null

  const clientRows = [
    estimate.client_email   && { label: 'Email',   value: estimate.client_email },
    estimate.client_phone   && { label: 'Phone',   value: estimate.client_phone },
    estimate.client_address && { label: 'Address', value: `${estimate.client_address}${estimate.client_city ? `, ${estimate.client_city}` : ''}` },
    estimate.payment_method && { label: 'Payment', value: estimate.payment_method },
  ].filter(Boolean) as { label: string; value: string }[]

  // ── MAIN RENDER ──────────────────────────────────────
  return (
    <>
    <ConfirmModal
      open={deleteOpen}
      icon="trash"
      title="Delete estimate?"
      body={`${estimate.estimate_number} will be permanently deleted. This cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={() => { setDeleteOpen(false); deleteEstimate() }}
      onCancel={() => setDeleteOpen(false)}
    />
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EEF0F4',
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 20,
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
          {estimate.status === 'draft' && (
            <button
              onClick={() => router.push(`/dashboard/estimates/new?edit=${id}`)}
              style={{ border: '1px solid #2045B8', color: '#2045B8', borderRadius: 8, padding: '4px 12px', fontSize: 13, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Edit
            </button>
          )}
          {estimate.opened_at && estimate.status === 'sent' && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
              color: STATUS_COLOR['opened'], background: STATUS_BG['opened'],
              borderRadius: 6, padding: '4px 10px',
            }}>
              OPENED
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
            color: STATUS_COLOR[estimate.status] || '#64748B',
            background: STATUS_BG[estimate.status] || 'rgba(100,116,139,.1)',
            borderRadius: 6, padding: '4px 10px',
          }}>
            {estimate.status === 'signed' ? 'ACCEPTED' : estimate.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="est-detail-body" style={{ padding: '24px 28px 100px' }}>
        <div className="est-3col">

          {/* ── LEFT COLUMN: tier + client in one card ── */}
          <div style={{ ...CARD, padding: 20, marginBottom: 16 }}>
            {/* Tier */}
            {profile?.pricing_mode === 'gbb' && <div style={SL}>{tierLabel} Tier</div>}
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
                  {isInvoiced ? 'INVOICED' : 'ACCEPTED'}{signedDate ? ` · ${signedDate}` : ''}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                  {estimate.client_name || 'Client'} accepted this estimate
                </div>
                <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0F8A6B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Receipt size={14} />
                  {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
                </button>
              </div>
            ) : (
              <>
                {/* БЛОК 1 — Send estimate */}
                <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 16, padding: 20, marginBottom: 12, marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>
                    SEND ESTIMATE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 14 }}>
                    Share with {estimate.client_name || 'client'} for review
                  </div>
                  {canEmail && (
                    <button onClick={() => setShowEmailModal(true)} disabled={sending}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0A1628', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: sending ? 0.7 : 1 }}>
                      {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                      {sending ? 'Sending…' : 'Email client'}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => {
                      if (!estimate.client_phone) { showToast('No phone number on file'); return }
                      window.open(`sms:${estimate.client_phone}?body=Hi ${estimate.client_name}, here's your estimate from ${profile?.company_name || 'us'}: ${window.location.origin}/sign/${estimate.id}`)
                    }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '9px 0', background: '#F5F6F8', color: '#0A1628', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <MessageSquare size={13} /> Text client
                    </button>
                    <button onClick={() => window.open(`/api/pdf?id=${id}`, '_blank')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '9px 0', background: '#F5F6F8', color: '#0A1628', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <FileDown size={13} /> Download PDF
                    </button>
                  </div>
                </div>

                {/* БЛОК 2 — Create contract */}
                <div style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%)', borderRadius: 16, padding: 20, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    READY TO CLOSE?
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
                    Create &amp; sign contract
                  </div>
                  <button onClick={handleSignOnSpot}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0A0E1A', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Sign on the spot
                  </button>
                  <button onClick={() => router.push(`/dashboard/estimates/${id}/contract`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Send to client
                  </button>
                </div>
              </>
            )}

            {/* More actions card */}
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                MORE ACTIONS
              </div>
              {[
                { icon: <Copy size={15} color="#64748B" />, label: 'Duplicate estimate', onClick: duplicateEstimate, danger: false },
                { icon: <Trash2 size={15} color="#DC2626" />, label: 'Delete estimate', onClick: () => setDeleteOpen(true), danger: true },
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

      {/* ── TOAST ── */}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowEmailModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: 320, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </div>
            {/* Title */}
            <div style={{ fontSize: 17, fontWeight: 600, color: '#0B1220', marginBottom: 8 }}>Send estimate</div>
            {/* Description */}
            <div style={{ fontSize: 13, color: '#8A94A6', marginBottom: 4 }}>
              Sending {estimate.estimate_number} to
            </div>
            <div style={{ fontSize: 13, color: '#2563EB', fontWeight: 500, marginBottom: profile?.contract_terms ? 8 : 20 }}>
              {estimate.client_email}
            </div>
            {profile?.contract_terms && profile.contract_terms !== 'тут компанія щось напише' && (
              <div style={{ fontSize: 12, color: '#B3BAC6', marginBottom: 20, lineHeight: 1.5 }}>
                Terms &amp; conditions included for client review.
              </div>
            )}
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEmailModal(false)}
                style={{ flex: 1, background: '#fff', color: '#475467', border: '1px solid #e5e7eb', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleSendEmail} disabled={sending}
                style={{ flex: 1.6, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
