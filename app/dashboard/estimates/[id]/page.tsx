'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { Mail, FileDown, FileText, Receipt, Trash2, ArrowLeft, Loader2, Check, Copy, FileSignature, Clock } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import WindowDiagram from '@/components/WindowDiagram'

interface Opening {
  id: string; type: string; qty: number; width: string | null
  width_in: number | null; height_in: number | null; room: string | null
  total_cost: number; install: string | null
  shape: string | null; colour: string | null; glass: string | null
  frame: string | null; floor: string | null
  material: string | null; hardware_colour: string | null; grid_pattern: string | null
  brand: string | null; notes: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  glass_type: string | null; core_type: string | null; handle_type: string | null
}

const INSTALL_LABELS: Record<string, string> = {
  insert: 'Retrofit', retrofit: 'Retrofit', fullframe: 'Full Frame', stud_to_stud: 'Stud to Stud',
}

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  client_phone: string | null; client_address: string | null; client_city: string | null
  postal_code: string | null; client_province: string | null; scope_notes: string | null; status: string
  tier: string | null; subtotal: number; tax_rate: number; tax_amount: number; total: number
  discount_type: string | null; discount_value: number | null; discount_amount: number
  payment_method: string | null
  signed_at: string | null; client_signature_url: string | null; valid_until: string | null
  sent_method: string | null; created_at: string; user_id: string; opened_at: string | null
  viewed_at: string | null; additional_charges: {label: string; amount: number}[] | null
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#6b7280', sent: '#2563eb', opened: '#d97706', signed: '#16a34a', declined: '#dc2626', invoiced: '#9333ea', paid: '#059669',
}
const STATUS_BG: Record<string, string> = {
  draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', opened: 'rgba(217,119,6,.1)',
  signed: 'rgba(22,163,74,.1)', declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)', paid: 'rgba(5,150,105,.1)',
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
  const [contract,       setContract]       = useState<{ id: string; status: string } | null>(null)
  const [profile,        setProfile]        = useState<{ id: string; contract_terms: string | null; company_name: string | null; pricing_mode: string | null; email: string | null; phone: string | null; signature_url: string | null } | null>(null)
  const [loading,             setLoading]             = useState(true)
  const [sending,             setSending]             = useState(false)
  const [showEmailModal,      setShowEmailModal]      = useState(false)
  const [deleteOpen,          setDeleteOpen]          = useState(false)
  const [showDuplicateModal,  setShowDuplicateModal]  = useState(false)
  const [duplicating,         setDuplicating]         = useState(false)
  const [toast,               setToast]               = useState('')
  const [dupToast,            setDupToast]            = useState<{ num: string; id: string } | null>(null)
  const [customLabels,        setCustomLabels]        = useState<Record<string, string>>({})
  const [enlargedDiagram,     setEnlargedDiagram]     = useState<{ type: string; widthIn?: number; heightIn?: number } | null>(null)

  useEffect(() => {
    async function load() {
      // Resolve current user and role before loading estimate
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      // Ownership-scoped query: filter by user_id (estimates table has no team_owner_id column)
      const estQuery = supabase.from('estimates').select('*').eq('id', id).eq('user_id', sanitizedId)

      const [{ data: est, error: estErr }, { data: ops }] = await Promise.all([
        estQuery.maybeSingle(),
        supabase.from('estimate_openings').select('id, type, qty, width, width_in, height_in, room, total_cost, install, shape, colour, glass, frame, floor, material, hardware_colour, grid_pattern, brand, notes, has_screen, tilt_clean, opening_direction, panels_count, bay_angle, transom_panes, sidelight_left, sidelight_right, transom_above, glass_type, core_type, handle_type').eq('estimate_id', id).order('sort_order'),
      ])

      if (estErr) console.error('[estimate-detail] query error:', estErr.message)

      if (!est) {
        if (!estErr) router.push('/dashboard/estimates')
        setLoading(false)
        return
      }

      setEstimate(est)
      setOpenings(ops || [])
      const customTypes = (ops || []).map((o: any) => o.type).filter((t: string) => t?.startsWith('custom_'))
      if (customTypes.length > 0) {
        const { data: plRows } = await supabase
          .from('price_lists')
          .select('opening_type, custom_label')
          .in('opening_type', customTypes)
        const labels: Record<string, string> = {}
        plRows?.forEach((r: any) => { if (r.custom_label) labels[r.opening_type] = r.custom_label })
        setCustomLabels(labels)
      }
      if (est?.user_id) {
        const { data: prof } = await supabase.from('profiles').select('id, contract_terms, company_name, pricing_mode, email, phone, signature_url').eq('id', est.user_id).single()
        setProfile(prof)
      }
      if (est?.status === 'signed' || est?.status === 'invoiced' || est?.status === 'paid') {
        const [{ data: dep }, { data: con }] = await Promise.all([
          supabase.from('invoices').select('id, amount, status').eq('estimate_id', id).eq('invoice_type', 'deposit').maybeSingle(),
          supabase.from('contracts').select('id, status').eq('estimate_id', id).eq('status', 'signed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        setDepositInvoice(dep)
        setContract(con)
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
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    setDuplicating(true)
    setShowDuplicateModal(false)

    const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', sanitizedId)
    const num = `EST-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: newEst } = await supabase.from('estimates').insert({
      user_id: sanitizedId,
      estimate_number: num,
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      client_phone: estimate.client_phone,
      client_address: estimate.client_address,
      client_city: estimate.client_city,
      postal_code: estimate.postal_code,
      client_province: estimate.client_province,
      tier: estimate.tier,
      status: 'draft',
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      total: estimate.total,
      scope_notes: estimate.scope_notes,
      discount_type: estimate.discount_type,
      discount_value: estimate.discount_value,
      discount_amount: estimate.discount_amount,
      payment_method: estimate.payment_method,
      valid_until: estimate.valid_until,
      additional_charges: estimate.additional_charges,
    }).select().single()

    if (newEst) {
      const { data: ops } = await supabase.from('estimate_openings')
        .select('*').eq('estimate_id', estimate.id)
      if (ops?.length) {
        await supabase.from('estimate_openings').insert(
          ops.map(o => ({ ...o, id: undefined, estimate_id: newEst.id }))
        )
      }
      setDupToast({ num, id: newEst.id })
      setTimeout(() => setDupToast(null), 5000)
    }
    setDuplicating(false)
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
      <div className="page-hd" style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10 }}>
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
      <div className="page-hd" style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px', position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10 }}>
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
  const isInvoiced    = estimate.status === 'invoiced' || estimate.status === 'paid'
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

  const SHAPE_LABELS:   Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
  const COLOUR_LABELS:  Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
  const GLASS_LABELS:   Record<string, string> = { clear: 'Clear', lowe: 'Low-E', frosted: 'Frosted', tinted: 'Tinted', tempered: 'Tempered' }
  const FRAME_LABELS:   Record<string, string> = { none: 'Good condition', repair: 'Needs repair', rotted: 'Rotted frame' }
  const FLOOR_LABELS:   Record<string, string> = { first: 'Ground floor', second: '2nd floor', third: '3rd floor' }
  const INSTALL_LABELS2: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
  const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }
  const HARDWARE_LABELS: Record<string, string> = { white: 'White hardware', black: 'Black hardware', chrome: 'Chrome hardware', brass: 'Brass hardware', bronze: 'Bronze hardware' }
  const GRID_LABELS: Record<string, string> = { none: 'No grid', colonial: 'Colonial grid', prairie: 'Prairie grid', diamond: 'Diamond grid', custom: 'Custom grid' }
  const DIRECTION_LABELS: Record<string, string> = { left: 'Opens left', right: 'Opens right', both: 'Opens both sides' }
  const GLASS_TYPE_LABELS: Record<string, string> = { full: 'Full glass', half: 'Half glass' }
  const CORE_LABELS: Record<string, string> = { hollow: 'Hollow core', solid: 'Solid core' }
  const HANDLE_LABELS: Record<string, string> = { casement_lever: 'Casement lever', tilt_latch: 'Tilt latch', lift_rail: 'Lift rail', push_bar: 'Push bar', lever: 'Lever handle', knob: 'Knob', pull_bar: 'Pull bar', passage_set: 'Passage set', deadbolt_lever: 'Deadbolt + lever', dummy: 'Dummy handle' }

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
      <div className="page-hd" style={{
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
            {profile?.pricing_mode === 'gbb' && estimate.tier && estimate.tier !== 'single' && <div style={SL}>{tierLabel} Tier</div>}
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#2563EB', lineHeight: 1, marginBottom: 6 }}>
              {fmtCAD(estimate.total)}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
              inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}
            </div>
            {estimate.viewed_at && (
              <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                Viewed · {new Date(estimate.viewed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · {new Date(estimate.viewed_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            )}

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
            {openings.map((op) => (
              <div key={op.id} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden', marginBottom: 10 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderBottom: '0.5px solid #E5E7EB' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>
                    {customLabels[op.type] || OPENING_TYPES[op.type]?.name || op.type} × {op.qty}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', fontFamily: 'monospace' }}>{fmtCAD(op.total_cost)}</div>
                </div>
                {/* Body: diagram + specs */}
                <div style={{ display: 'flex' }}>
                  {/* Diagram */}
                  <div
                    onClick={() => setEnlargedDiagram({ type: op.type, widthIn: op.width_in || undefined, heightIn: op.height_in || undefined })}
                    style={{ width: 140, borderRight: '0.5px solid #F1F5F9', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flexShrink: 0, cursor: 'zoom-in' }}
                  >
                    <WindowDiagram type={op.type} widthIn={op.width_in || undefined} heightIn={op.height_in || undefined} size={110} />
                  </div>
                  {/* Specs */}
                  <div style={{ flex: 1, padding: '10px 12px' }}>
                    {/* Grid specs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px 12px', marginBottom: 8 }}>
                      {op.colour && op.colour !== 'white' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Colour</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{COLOUR_LABELS[op.colour] || op.colour}</span></div>}
                      {op.glass && op.glass !== 'clear' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Glass</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{GLASS_LABELS[op.glass] || op.glass}</span></div>}
                      {op.install && op.install !== 'retrofit' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Install</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{INSTALL_LABELS2[op.install] || op.install}</span></div>}
                      {op.frame && op.frame !== 'none' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Frame</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{FRAME_LABELS[op.frame] || op.frame}</span></div>}
                      {op.floor && op.floor !== 'first' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Floor</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{FLOOR_LABELS[op.floor] || op.floor}</span></div>}
                      {op.shape && op.shape !== 'rect' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Shape</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{SHAPE_LABELS[op.shape] || op.shape}</span></div>}
                      {op.material && op.material !== 'vinyl' && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Material</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{MATERIAL_LABELS[op.material] || op.material}</span></div>}
                      {op.brand && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Brand</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{op.brand}</span></div>}
                      {op.width_in && op.height_in && <div style={{ display: 'flex', gap: 5 }}><span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50 }}>Size</span><span style={{ fontSize: 11, fontWeight: 600, color: '#0A1628' }}>{op.width_in}" × {op.height_in}"</span></div>}
                    </div>
                    {/* Type-specific pills */}
                    {(() => {
                      const pills: React.ReactNode[] = []
                      if (op.has_screen) pills.push(<span key="screen" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>Screen ✓</span>)
                      if (op.tilt_clean) pills.push(<span key="tilt" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>Tilt-in ✓</span>)
                      if (op.opening_direction) pills.push(<span key="dir" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{DIRECTION_LABELS[op.opening_direction]}</span>)
                      if (op.panels_count) pills.push(<span key="panels" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{op.panels_count} panels</span>)
                      if (op.bay_angle) pills.push(<span key="angle" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{op.bay_angle}°</span>)
                      if (op.transom_panes) pills.push(<span key="tpanes" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{op.transom_panes} panes</span>)
                      if (op.sidelight_left) pills.push(<span key="sll" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>← SL {op.sidelight_left}"</span>)
                      if (op.sidelight_right) pills.push(<span key="slr" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>→ SL {op.sidelight_right}"</span>)
                      if (op.transom_above) pills.push(<span key="ta" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>Transom above</span>)
                      if (op.glass_type) pills.push(<span key="gt" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{GLASS_TYPE_LABELS[op.glass_type]}</span>)
                      if (op.core_type) pills.push(<span key="ct" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{CORE_LABELS[op.core_type]}</span>)
                      if (op.handle_type) pills.push(<span key="handle" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{HANDLE_LABELS[op.handle_type] || op.handle_type}</span>)
                      if (op.grid_pattern && op.grid_pattern !== 'none') pills.push(<span key="grid" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{GRID_LABELS[op.grid_pattern]}</span>)
                      if (op.hardware_colour && op.hardware_colour !== 'white') pills.push(<span key="hw" style={{ background: '#EFF4FF', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#2563EB', border: '0.5px solid #BFDBFE' }}>{HARDWARE_LABELS[op.hardware_colour]}</span>)
                      if (op.room) pills.push(<span key="room" style={{ background: '#F0FDF4', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#16A34A', border: '0.5px solid #BBF7D0' }}>{op.room}</span>)
                      if (op.notes) pills.push(<span key="notes" style={{ background: '#FFF7ED', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#C2410C', border: '0.5px solid #FED7AA' }}>📝 {op.notes}</span>)
                      if (pills.length === 0) return null
                      return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '0.5px solid #F1F5F9', paddingTop: 8 }}>{pills}</div>
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {estimate.scope_notes && (
              <>
                <div style={{ height: 1, background: '#EEF0F4', margin: '16px 0' }} />
                <div style={SL}>Scope of Work</div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>{estimate.scope_notes}</div>
              </>
            )}

            {estimate.additional_charges?.filter(c => c.label).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{c.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{fmtCAD(c.amount)}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0' }}>

            {/* Signed / invoiced — amber when deposit pending, green otherwise */}
            {(isSigned || isInvoiced) && (() => {
              const depositPending = depositInvoice?.status === 'pending'
              return (
              <div style={{ background: depositPending ? '#fff' : '#0F8A6B', borderRadius: 16, padding: 20, border: depositPending ? '0.5px solid #E2E8F0' : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: depositPending ? '0.1em' : '.12em', textTransform: 'uppercase', color: depositPending ? '#94A3B8' : 'rgba(255,255,255,.6)', marginBottom: 6 }}>
                  {estimate.status === 'paid' ? 'PAID' : isInvoiced ? 'INVOICED' : 'ACCEPTED'}{signedDate ? ` · ${signedDate}` : ''}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: depositPending ? '#0A1628' : '#fff', marginBottom: 16 }}>
                  {estimate.client_name || 'Client'} accepted this estimate
                </div>
                {depositPending ? (
                  <button onClick={() => router.push('/dashboard/invoices')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '12px 16px', background: '#EEF3FF', color: '#2563EB', border: '1.5px solid #BFDBFE', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Clock size={14} color="#2563EB" />
                    Deposit pending — {fmtCAD(depositInvoice!.amount)}
                  </button>
                ) : (
                  <button onClick={() => router.push(`/dashboard/estimates/${id}/invoice`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0F8A6B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Receipt size={14} />
                    {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
                  </button>
                )}
              </div>
              )
            })()}

            {/* Step cards — only when not signed/invoiced */}
            {!isSigned && !isInvoiced && !isDeclined && (
              <>
                {/* ── STEP 1: Send to client ── */}
                <div style={{ background: '#fff', border: '1.5px solid #BFDBFE', borderRadius: 16, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', lineHeight: 1.2 }}>Send to client</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Share estimate for review</div>
                    </div>
                  </div>
                  <button
                    onClick={canEmail ? () => setShowEmailModal(true) : () => showToast('⚠️ No client email on this estimate')}
                    disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '11px 0', background: '#fff', color: '#0A1628', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.7 : 1 }}>
                    {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                    {sending ? 'Sending…' : 'Email'}
                  </button>
                </div>

                {/* ── STEP 2: Close the deal ── */}
                <div style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%)', borderRadius: 16, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Close the deal</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Sign contract with client</div>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/dashboard/estimates/${id}/payment-setup?trigger=sign`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0A0E1A', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Sign on the spot
                  </button>
                  <button onClick={() => router.push(`/dashboard/estimates/${id}/payment-setup?trigger=send`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Send contract
                  </button>
                </div>
              </>
            )}

            {/* ── MORE ACTIONS ── */}
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                MORE ACTIONS
              </div>
              {[
                { icon: <FileDown       size={15} color="#64748B" />, label: 'Download Estimate PDF',          onClick: () => router.push(`/dashboard/pdf-viewer?url=${encodeURIComponent(`/api/estimate-pdf?id=${id}`)}&label=${encodeURIComponent('Estimate PDF')}`),    danger: false, show: true },
                { icon: <FileSignature  size={15} color="#64748B" />, label: 'View signed contract',   onClick: () => router.push(`/sign/contract/${contract!.id}`),           danger: false, show: !!contract },
                { icon: <Copy          size={15} color="#64748B" />, label: 'Duplicate estimate',     onClick: () => setShowDuplicateModal(true),                             danger: false, show: true },
                { icon: <Trash2        size={15} color="#DC2626" />, label: 'Delete estimate',         onClick: () => setDeleteOpen(true),                                    danger: true,  show: true },
              ].filter(item => item.show).map((item, i, arr) => (
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

      {/* ── DUPLICATE SUCCESS TOAST ── */}
      {dupToast && (
        <div style={{
          position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))', left: '50%',
          transform: 'translateX(-50%)', zIndex: 1100,
          background: '#0A1628', color: '#fff', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        }}>
          <span>Duplicate created — <span style={{ fontFamily: 'ui-monospace, monospace', color: '#93C5FD' }}>{dupToast.num}</span></span>
          <button
            onClick={() => router.push(`/dashboard/estimates/${dupToast.id}`)}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Open →
          </button>
        </div>
      )}

      {/* ── DUPLICATE MODAL ── */}
      {showDuplicateModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Copy size={22} color="#2563EB" strokeWidth={1.7} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', textAlign: 'center', marginBottom: 8 }}>
              Duplicate estimate?
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.55, marginBottom: 24 }}>
              A copy will be created as a new Draft estimate. You can edit it before sending.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDuplicateModal(false)}
                style={{ flex: 1, height: 48, borderRadius: 12, background: '#fff', border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={duplicateEstimate}
                disabled={duplicating}
                style={{ flex: 1, height: 48, borderRadius: 12, background: '#3B6CFF', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', opacity: duplicating ? 0.7 : 1 }}>
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {enlargedDiagram && (
        <div onClick={() => setEnlargedDiagram(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
            <WindowDiagram type={enlargedDiagram.type} widthIn={enlargedDiagram.widthIn} heightIn={enlargedDiagram.heightIn} size={240} />
            <button onClick={() => setEnlargedDiagram(null)} style={{ padding: '10px 28px', background: '#F1F5F9', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
