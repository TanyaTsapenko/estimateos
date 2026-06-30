'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, fmtCAD } from '@/lib/pricing'
import { V2_TYPE_LABELS, type CombinationSection } from '@/lib/v2/openingTypes'
import { trimSummaryLines, hasTrim } from '@/lib/v2/trimUtils'
import { getSubtypeLabel } from '@/lib/openingLabels'
import { getColourLabel, getShapeLabel, getGlassLabel, getInteriorColourLabel } from '@/lib/openingLabels'
import { Mail, FileDown, FileText, Receipt, Trash2, ArrowLeft, Loader2, Check, Copy, FileSignature, Clock, Tablet } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'
import ConfirmModal from '@/components/ConfirmModal'
import { CasementDrawing, SliderDrawing, HopperDrawing } from '@/components/estimate-builder-v2/casement-slider-hopper-drawing'
import { AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing } from '@/components/estimate-builder-v2/awning-hung-tiltturn-drawing'
import { EntryDoorDrawing, DoubleEntryDrawing } from '@/components/estimate-builder-v2/entry-door-drawing'
import { FrenchDoorDrawing, GardenDoorDrawing } from '@/components/estimate-builder-v2/french-garden-drawing'
import { PatioDoorDrawing } from '@/components/estimate-builder-v2/patio-door-drawing'
import { StormDoorDrawing, InteriorDoorDrawing } from '@/components/estimate-builder-v2/storm-interior-drawing'
import { ShapeOutlineDrawing } from '@/components/estimate-builder-v2/shape-outline-drawing'
import { BayDrawing, BowDrawing } from '@/components/estimate-builder-v2/bay-bow-drawing'
import { CombinationDrawing } from '@/components/estimate-builder-v2/section-builder'
interface Opening {
  id: string; type: string; qty: number; width: string | null
  width_in: number | null; height_in: number | null; room: string | null
  total_cost: number; install: string | null
  shape: string | null; colour: string | null; glass: string | null
  frame: string | null; floor: string | null
  material: string | null; grid_pattern: string | null
  brand: string | null; notes: string | null
  has_screen: boolean | null; tilt_clean: boolean | null; opening_direction: string | null
  panels_count: string | null; bay_angle: string | null; transom_panes: string | null
  sidelight_left: number | null; sidelight_right: number | null; transom_above: boolean | null
  glass_type: string | null; core_type: string | null
  custom_shape_label: string | null; custom_colour_label: string | null
  colour_palette_id: string | null; colour_name: string | null
  interior_photo_url: string | null; exterior_photo_url: string | null
  photo_3_url: string | null; photo_4_url: string | null
  glass_kind: string | null; low_e: boolean | null; tempered: boolean | null
  interior_colour_palette_id: string | null; interior_colour_name: string | null; interior_colour: string | null
  pane: string | null; egress_required: boolean | null; window_subtype: string | null
  sections?: { type: string; width: number }[] | null
}

const INSTALL_LABELS: Record<string, string> = {
  insert: 'Retrofit', retrofit: 'Retrofit', fullframe: 'Full Frame', stud_to_stud: 'Stud to Stud',
}

interface Estimate {
  id: string; estimate_number: string; client_name: string | null; client_email: string | null
  client_phone: string | null; client_address: string | null; client_city: string | null
  postal_code: string | null; client_province: string | null; scope_notes: string | null; status: string
  job_site_same_as_client: boolean | null; job_site_address: string | null; job_site_city: string | null
  job_site_province: string | null; job_site_postal_code: string | null
  subtotal: number; tax_rate: number; tax_amount: number; total: number
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

// ── v2 drawing dispatcher ─────────────────────────────────────────
const OLD_TO_V2_TYPE: Record<string, string> = {
  window_dh: 'doubleHung', window_sh: 'singleHung', window_cas: 'casement',
  window_sl: 'slider', window_fix: 'picture', window_awn: 'awning',
  window_hopper: 'hopper', window_tilt: 'tiltTurn', window_trans: 'transom',
  window_arch: 'special', window_bay: 'bay', window_bow: 'bow',
  window_combo: 'combination', window_egr: 'picture',
  door_entry: 'entry', door_double: 'doubleEntry', door_french: 'french',
  door_garden: 'garden', door_patio: 'patio', door_storm: 'storm', door_int: 'interior',
}
const OLD_SHAPE_TO_V2: Record<string, string> = {
  rect: 'Rectangle', rectangle: 'Rectangle', arch: 'Arch',
  halfarch: 'Half arch', halfround: 'Half round', circle: 'Circle',
  octagon: 'Octagon', triangle: 'Triangle', pentagon: 'Pentagon',
  gothic: 'Gothic', eyebrow: 'Eyebrow',
}

function OpeningDrawing({ op }: { op: Opening }) {
  const typeId = OLD_TO_V2_TYPE[op.type] ?? op.type
  const wIn    = op.width_in  ?? undefined
  const hIn    = op.height_in ?? undefined
  const shape  = (op.shape ? OLD_SHAPE_TO_V2[op.shape] : undefined) ?? op.shape ?? undefined
const sl     = op.sidelight_left && op.sidelight_right ? 'Both'
               : op.sidelight_left  ? 'Left'
               : op.sidelight_right ? 'Right'
               : undefined

  switch (typeId) {
    case 'casement':
      return <CasementDrawing sub={op.window_subtype ?? ''} shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'slider':
      return <SliderDrawing sub={op.window_subtype ?? ''} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'endVent':
      return <SliderDrawing sub={(op.window_subtype ?? '').toLowerCase().includes('double') ? 'doubleendvent' : 'endvent'} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'hopper':
      return <HopperDrawing widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'awning':
      return <AwningDrawing sub={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'singleHung':
      return <SingleHungDrawing shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'doubleHung':
      return <DoubleHungDrawing widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'tiltTurn':
      return <TiltTurnDrawing sub={op.window_subtype ?? ''} openDir={op.opening_direction ?? undefined} openMode={(op as any).open_mode ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'bay':
      return <BayDrawing sub={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} bayAngle={op.bay_angle ?? undefined} centerWindowType={(op as any).center_window_type ?? undefined} sideUnit={(op as any).side_unit ?? undefined} />
    case 'bow':
      return <BowDrawing sub={op.window_subtype ?? ''} widthIn={wIn} heightIn={hIn} uid={op.id} panelType={(op as any).panel_type ?? undefined} sideUnit={(op as any).side_unit ?? undefined} />
    case 'combination':
      return <CombinationDrawing sections={(op.sections ?? []) as CombinationSection[]} heightIn={hIn} />
    case 'transom':
      return <ShapeOutlineDrawing shape={shape} transomPanes={op.transom_panes ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'special':
      return <ShapeOutlineDrawing shape={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'entry':
      return <EntryDoorDrawing sub={op.window_subtype ?? ''} doorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} />
    case 'doubleEntry':
      return <DoubleEntryDrawing sub={op.window_subtype ?? ''} doubleDoorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} />
    case 'french':
      return <FrenchDoorDrawing sub={op.window_subtype ?? 'Double french'} doorSwing={op.opening_direction ?? undefined} glassSize={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} />
    case 'garden':
      return <GardenDoorDrawing doorSwing={op.opening_direction ?? undefined} sidelights={sl} transomAbove={op.transom_above ? 'Rect' : undefined} widthIn={wIn} heightIn={hIn} />
    case 'patio':
      return <PatioDoorDrawing sub={op.window_subtype ?? '2 Panel'} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'storm':
      return <StormDoorDrawing sub={op.window_subtype ?? 'Full glass'} hingeSide={op.opening_direction ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} />
    case 'interior':
      return <InteriorDoorDrawing sub={op.window_subtype ?? 'Single'} doorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} />
    default:
      return <ShapeOutlineDrawing shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} />
  }
}

export default function EstimateDetailPage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate,       setEstimate]       = useState<Estimate | null>(null)
  const [openings,       setOpenings]       = useState<Opening[]>([])
  const [depositInvoice, setDepositInvoice] = useState<{ id: string; amount: number; status: string } | null>(null)
  const [contract,       setContract]       = useState<{ id: string; status: string } | null>(null)
  const [profile,        setProfile]        = useState<{ id: string; contract_terms: string | null; company_name: string | null; email: string | null; phone: string | null; signature_url: string | null } | null>(null)
  const [loading,             setLoading]             = useState(true)
  const [sending,             setSending]             = useState(false)
  const [showEmailModal,      setShowEmailModal]      = useState(false)
  const [sendEmail,           setSendEmail]           = useState('')
  const [editingEmail,        setEditingEmail]        = useState(false)
  const [deleteOpen,          setDeleteOpen]          = useState(false)
  const [showDuplicateModal,  setShowDuplicateModal]  = useState(false)
  const [duplicating,         setDuplicating]         = useState(false)
  const [toast,               setToast]               = useState('')
  const [dupToast,            setDupToast]            = useState<{ num: string; id: string } | null>(null)
  const [customLabels,        setCustomLabels]        = useState<Record<string, string>>({})
  const [enlargedOpening,     setEnlargedOpening]     = useState<Opening | null>(null)

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
        supabase.from('estimate_openings').select('id, type, qty, width, width_in, height_in, room, total_cost, install, shape, colour, glass, frame, floor, material, grid_pattern, brand, notes, has_screen, tilt_clean, opening_direction, panels_count, bay_angle, transom_panes, sidelight_left, sidelight_right, transom_above, glass_type, core_type, custom_shape_label, custom_colour_label, colour_palette_id, colour_name, interior_photo_url, exterior_photo_url, photo_3_url, photo_4_url, glass_kind, low_e, tempered, interior_colour_palette_id, interior_colour_name, interior_colour, pane, egress_required, window_subtype, sections').eq('estimate_id', id).order('sort_order'),
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
        const { data: prof } = await supabase.from('profiles').select('id, contract_terms, company_name, email, phone, signature_url').eq('id', est.user_id).single()
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

  function openSendModal() {
    setSendEmail(estimate?.client_email || '')
    setEditingEmail(false)
    setShowEmailModal(true)
  }

  async function handleSendEmail() {
    const email = sendEmail.trim() || estimate?.client_email
    if (!email) { showToast('⚠️ No client email on this estimate'); return }
    setSending(true); setShowEmailModal(false)
    try {
      // If email was changed in the modal, persist it first
      if (email !== estimate?.client_email) {
        await supabase.from('estimates').update({ client_email: email }).eq('id', id)
        setEstimate(p => p ? { ...p, client_email: email } : p)
      }
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: id, type: 'send', sendMode: 'estimate' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      await supabase.from('estimates').update({ status: 'sent', sent_method: 'email_estimate' }).eq('id', id)
      setEstimate(p => p ? { ...p, status: 'sent', sent_method: 'email_estimate' } : p)
      showToast('📧 Sent to ' + (json.sentTo || email))
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
      <AppTopBar onBack={() => router.push('/dashboard/estimates')} backLabel="Estimates" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94A3B8', fontSize: 13 }}>
        Loading…
      </div>
    </div>
  )

  // ── NOT FOUND ────────────────────────────────────────
  if (!estimate) return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <AppTopBar onBack={() => router.push('/dashboard/estimates')} backLabel="Estimates" />
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
  const signedDate    = estimate.signed_at
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(estimate.signed_at))
    : null

  const FRAME_LABELS:   Record<string, string> = { none: 'Good condition', repair: 'Needs repair', rotted: 'Rotted frame' }
  const FLOOR_LABELS:   Record<string, string> = { first: 'Ground floor', second: '2nd floor', third: '3rd floor' }
  const INSTALL_LABELS2: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
  const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }
  const GRID_LABELS: Record<string, string> = { none: 'No grid', colonial: 'Colonial grid', prairie: 'Prairie grid', diamond: 'Diamond grid', custom: 'Custom grid' }
  const DIRECTION_LABELS: Record<string, string> = { left: 'Opens left', right: 'Opens right', both: 'Opens both sides' }
  const GLASS_TYPE_LABELS: Record<string, string> = { full: 'Full glass', half: 'Half glass' }
  const CORE_LABELS: Record<string, string> = { hollow: 'Hollow core', solid: 'Solid core' }
  // ── MAIN RENDER ──────────────────────────────────────
  const initials = (estimate.client_name || '').split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || '?'
  const createdDate = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(estimate.created_at))
  const chipBase: React.CSSProperties = { borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }
  const chipBlue:   React.CSSProperties = { ...chipBase, background: '#EEF3FF', color: '#1D4ED8' }
  const chipOrange: React.CSSProperties = { ...chipBase, background: '#FFF7ED', color: '#C2410C' }

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
    <div style={{ minHeight: '100vh', background: '#F4F6FB', fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <AppTopBar
        onBack={() => router.push('/dashboard/estimates')}
        backLabel="Estimates"
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {estimate.status === 'draft' && (
            <button onClick={() => router.push(`/dashboard/estimates/new?edit=${id}`)}
              style={{ border: '1px solid #2045B8', color: '#2045B8', borderRadius: 8, padding: '4px 12px', fontSize: 13, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Edit
            </button>
          )}
          {estimate.opened_at && estimate.status === 'sent' && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: STATUS_COLOR['opened'], background: STATUS_BG['opened'], borderRadius: 6, padding: '4px 10px' }}>OPENED</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: STATUS_COLOR[estimate.status] || '#64748B', background: STATUS_BG[estimate.status] || 'rgba(100,116,139,.1)', borderRadius: 6, padding: '4px 10px' }}>
            {estimate.status === 'signed' ? 'ACCEPTED' : estimate.status.toUpperCase()}
          </span>
        </div>}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>{estimate.estimate_number}</span>
      </AppTopBar>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(160deg, #1a3a7c 0%, #2563EB 100%)', padding: '20px 20px 32px' }}>
        {profile?.company_name && (
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            {profile.company_name}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          {estimate.estimate_number} · {createdDate}
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
          {fmtCAD(estimate.total)}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: estimate.client_name ? 20 : 0 }}>
          inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}
        </div>
        {estimate.client_name && (
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{estimate.client_name}</div>
              {(estimate.client_address || estimate.client_city) && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {[estimate.client_address, estimate.client_city].filter(Boolean).join(', ')}
                </div>
              )}
              {estimate.client_phone && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{estimate.client_phone}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* What's included */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4', marginBottom: 12 }}>
            What's included ({openings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openings.map(op => {
              const typeName = customLabels[op.type] || OPENING_TYPES[op.type]?.name || V2_TYPE_LABELS[op.type] || op.type
              const stLabel  = (op as any).window_subtype ? getSubtypeLabel(op as any) : null
              const sizeStr  = op.width_in && op.height_in ? `${op.width_in}" × ${op.height_in}"` : null
              const subtitle = [stLabel, sizeStr, op.room].filter(Boolean).join(' · ')
              const pills: React.ReactNode[] = []
              if (op.colour && op.colour !== 'white')            pills.push(<span key="col"      style={chipBlue}>Ext: {getColourLabel(op)}</span>)
              if (getInteriorColourLabel(op) && getInteriorColourLabel(op) !== getColourLabel(op)) pills.push(<span key="icol"     style={chipBlue}>Int: {getInteriorColourLabel(op)}</span>)
              const glassLabel = getGlassLabel(op)
              if (glassLabel) {
                glassLabel.split(', ').forEach((g, i) => {
                  pills.push(<span key={`glass-${i}`} style={chipBlue}>{g}</span>)
                })
              }
              if (op.install && op.install !== 'retrofit')        pills.push(<span key="inst"     style={chipBlue}>{INSTALL_LABELS2[op.install] || op.install}</span>)
              if (op.frame && op.frame !== 'none')                pills.push(<span key="frame"    style={chipBlue}>{FRAME_LABELS[op.frame] || op.frame}</span>)
              if (op.floor && op.floor !== 'first')               pills.push(<span key="floor"    style={chipBlue}>{FLOOR_LABELS[op.floor] || op.floor}</span>)
              if (op.material && op.material !== 'vinyl')         pills.push(<span key="mat"      style={chipBlue}>{MATERIAL_LABELS[op.material] || op.material}</span>)
              if (op.grid_pattern && op.grid_pattern !== 'none')  pills.push(<span key="grid"     style={chipBlue}>{GRID_LABELS[op.grid_pattern] || op.grid_pattern}</span>)
              if (op.bay_angle)           pills.push(<span key="angle"   style={chipBlue}>{op.bay_angle}°</span>)
              if (op.opening_direction)   pills.push(<span key="dir"     style={chipBlue}>{DIRECTION_LABELS[op.opening_direction]}</span>)
              if (op.panels_count)        pills.push(<span key="panels"  style={chipBlue}>{op.panels_count} panels</span>)
              if (op.transom_panes)       pills.push(<span key="tpanes"  style={chipBlue}>{op.transom_panes} panes</span>)
              if (op.sidelight_left)      pills.push(<span key="sll"     style={chipBlue}>← SL {op.sidelight_left}"</span>)
              if (op.sidelight_right)     pills.push(<span key="slr"     style={chipBlue}>→ SL {op.sidelight_right}"</span>)
              if (op.transom_above)       pills.push(<span key="ta"      style={chipBlue}>Transom above</span>)
              if (op.glass_type)          pills.push(<span key="gt"      style={chipBlue}>{GLASS_TYPE_LABELS[op.glass_type]}</span>)
              if (op.core_type)           pills.push(<span key="ct"      style={chipBlue}>{CORE_LABELS[op.core_type]}</span>)
              if (op.notes)               pills.push(<span key="notes"   style={chipOrange}>📝 {op.notes}</span>)
              return (
                <div key={op.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex' }}>
                    <div onClick={() => setEnlargedOpening(op)} style={{ width: 140, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'zoom-in', borderRight: '1px solid #F1F5F9', padding: 12 }}>
                      <div style={{ width: 116, height: 130, pointerEvents: 'none', padding: 8, boxSizing: 'border-box' }}>
                        <OpeningDrawing op={op} />
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1220', lineHeight: 1.3 }}>
                          {typeName}{op.qty > 1 ? ` × ${op.qty}` : ''}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#2563EB', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtCAD(op.total_cost)}
                        </div>
                      </div>
                      {subtitle && (
                        <div style={{ fontSize: 12, color: '#475467', marginBottom: pills.length ? 8 : 0 }}>{subtitle}</div>
                      )}
                      {pills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{pills}</div>
                      )}
                    </div>
                  </div>
                  {(op.interior_photo_url || op.exterior_photo_url || op.photo_3_url || op.photo_4_url) && (
                    <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { url: op.interior_photo_url, label: 'Interior',    slug: 'interior'    },
                        { url: op.exterior_photo_url, label: 'Exterior',    slug: 'exterior'    },
                        { url: op.photo_3_url,        label: 'Measurement', slug: 'measurement' },
                        { url: op.photo_4_url,        label: 'Additional',  slug: 'additional'  },
                      ].filter(p => p.url).map(p => {
                        const photoUrl = p.url!
                        const ext = photoUrl.split('/').pop()?.split('.').pop()?.split('?')[0] || 'jpg'
                        const filename = `${op.type}-${p.slug}.${ext}`
                        return (
                          <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ position: 'relative' }}>
                              <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                                <img src={photoUrl} alt={p.label} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid #E5E7EB', display: 'block' }} />
                              </a>
                              <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 3 }}>
                                <a href={photoUrl} download={filename} target="_blank" rel="noopener noreferrer"
                                  style={{ background: 'rgba(0,0,0,0.52)', borderRadius: 5, padding: '7px 8px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                  </svg>
                                </a>
                                <button
                                  onClick={async () => {
                                    const col = p.slug === 'interior' ? 'interior_photo_url' : p.slug === 'exterior' ? 'exterior_photo_url' : p.slug === 'measurement' ? 'photo_3_url' : 'photo_4_url'
                                    await supabase.from('estimate_openings').update({ [col]: null }).eq('id', op.id)
                                    setOpenings(prev => prev.map(o => o.id === op.id ? { ...o, [col]: null } : o))
                                  }}
                                  style={{ background: 'rgba(192,52,26,0.75)', border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500 }}>{p.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {estimate.scope_notes && (
            <div style={{ marginTop: 10, background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4', marginBottom: 8 }}>Scope of Work</div>
              <div style={{ fontSize: 13, color: '#475467', lineHeight: 1.7 }}>{estimate.scope_notes}</div>
            </div>
          )}

          {hasTrim(estimate as any) && (
            <div style={{ marginTop: 10, background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4', marginBottom: 8 }}>Trim &amp; Finishing</div>
              {trimSummaryLines(estimate as any).map(line => (
                <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span style={{ color: '#64748B' }}>{line.label}</span>
                  <span style={{ fontWeight: 600, color: '#0A1628' }}>{line.value}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' }}>Included — no extra charge</div>
            </div>
          )}
        </div>

        {/* Price summary */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4', marginBottom: 12 }}>Price summary</div>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', padding: '4px 16px 16px' }}>
            {estimate.additional_charges?.filter(c => c.label).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 14, color: '#475467' }}>{c.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1220' }}>{fmtCAD(c.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 14, color: '#475467' }}>Subtotal</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1220' }}>{fmtCAD(estimate.subtotal)}</span>
            </div>
            {estimate.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 14, color: '#475467' }}>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F8A4D' }}>−{fmtCAD(estimate.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 14, color: '#475467' }}>{taxLabel}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1220' }}>{fmtCAD(estimate.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0B1220' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.02em' }}>{fmtCAD(estimate.total)}</span>
            </div>
            {depositInvoice && (
              <>
                <div style={{ height: 1, background: '#F1F5F9', margin: '14px 0 10px' }} />
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4', marginBottom: 8 }}>Deposit</div>
                {[
                  { label: 'Deposit amount',    value: fmtCAD(depositInvoice.amount),                   color: '#F59E0B' },
                  { label: 'Remaining balance', value: fmtCAD(estimate.total - depositInvoice.amount),   color: '#0B1220' },
                  { label: 'Status',            value: depositInvoice.status,                            color: depositInvoice.status === 'paid' ? '#0F8A4D' : '#2563EB' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <span style={{ color: '#94A3B8' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color, textTransform: 'capitalize' }}>{row.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── ACTIONS ── */}
      <div style={{ padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Signed / Invoiced banner */}
        {(isSigned || isInvoiced) && (() => {
          const depositPending = depositInvoice?.status === 'pending'
          return (
            <div style={{ background: depositPending ? '#fff' : '#0F8A4D', borderRadius: 16, padding: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', border: depositPending ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: depositPending ? '#94A0B4' : 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                {estimate.status === 'paid' ? 'PAID' : isInvoiced ? 'INVOICED' : 'ACCEPTED'}{signedDate ? ` · ${signedDate}` : ''}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: depositPending ? '#0B1220' : '#fff', marginBottom: 16 }}>
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 0', background: '#fff', color: '#0F8A4D', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Receipt size={14} />
                  {depositInvoice ? `Final invoice — ${fmtCAD(estimate.total - depositInvoice.amount)}` : 'Create invoice'}
                </button>
              )}
            </div>
          )
        })()}

        {/* Send the estimate */}
        {!isSigned && !isInvoiced && !isDeclined && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={20} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Send the estimate</div>
                <div style={{ fontSize: 13, color: '#2563EB' }}>So {estimate.client_name || 'your client'} can review it anytime</div>
              </div>
            </div>
            <div style={{ margin: '0 16px 12px', background: '#F4F6FB', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {editingEmail ? (
                <input
                  value={sendEmail}
                  onChange={e => setSendEmail(e.target.value)}
                  autoFocus
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0B1220', background: 'transparent', fontFamily: 'inherit' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 14, color: '#0B1220' }}>{estimate.client_email || 'No email set'}</span>
              )}
              <button
                onClick={() => { setSendEmail(estimate.client_email || ''); setEditingEmail(v => !v) }}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
                {editingEmail ? 'Done' : 'Change'}
              </button>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={{ width: '100%', padding: 14, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? 0.7 : 1 }}>
                {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                {sending ? 'Sending…' : 'Send now'}
              </button>
            </div>
          </div>
        )}

        {/* Close the deal */}
        {!isSigned && !isInvoiced && !isDeclined && (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4' }}>
              Close the deal
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => router.push(`/dashboard/estimates/${id}/payment-setup?trigger=sign`)}
                style={{ background: '#2563EB', borderRadius: 16, padding: '16px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <FileSignature size={18} color="#fff" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Sign now</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>Together, on this phone</div>
              </button>
              <button
                onClick={() => router.push(`/dashboard/estimates/${id}/payment-setup?trigger=send`)}
                style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', border: '1px solid #E5E7EB', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Mail size={18} color="#2563EB" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1220', marginBottom: 3 }}>Send contract</div>
                <div style={{ fontSize: 11, color: '#94A0B4', lineHeight: 1.4 }}>For them to e-sign</div>
              </button>
            </div>
          </>
        )}

        {/* More actions */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A0B4' }}>
            More actions
          </div>
          {[
            { icon: <FileDown      size={16} color="#475467" />, label: 'Download Estimate PDF', onClick: () => window.open(`/api/estimate-pdf?id=${id}`, '_blank'), danger: false, show: true },
            { icon: <FileSignature size={16} color="#475467" />, label: 'View signed contract',   onClick: () => router.push(`/sign/contract/${contract!.id}`),      danger: false, show: !!contract },
            { icon: <Copy         size={16} color="#475467" />, label: 'Duplicate estimate',     onClick: () => setShowDuplicateModal(true),                          danger: false, show: true },
            { icon: <Trash2       size={16} color="#DC2626" />, label: 'Delete estimate',        onClick: () => setDeleteOpen(true),                                  danger: true,  show: true },
          ].filter(item => item.show).map((item, i, arr) => (
            <button key={item.label} onClick={item.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', fontSize: 14, fontWeight: 500, color: item.danger ? '#DC2626' : '#0B1220', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── TOAST ── */}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      {/* ── DUPLICATE SUCCESS TOAST ── */}
      {dupToast && (
        <div style={{ position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: '#0A1628', color: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>
          <span>Duplicate created — <span style={{ fontFamily: 'ui-monospace, monospace', color: '#93C5FD' }}>{dupToast.num}</span></span>
          <button onClick={() => router.push(`/dashboard/estimates/${dupToast.id}`)}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Open →
          </button>
        </div>
      )}

      {/* ── DUPLICATE MODAL ── */}
      {showDuplicateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
          onClick={() => setShowDuplicateModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Copy size={22} color="#2563EB" strokeWidth={1.7} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', textAlign: 'center', marginBottom: 8 }}>Duplicate estimate?</div>
            <div style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.55, marginBottom: 24 }}>
              A copy will be created as a new Draft estimate. You can edit it before sending.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDuplicateModal(false)}
                style={{ flex: 1, height: 48, borderRadius: 12, background: '#fff', border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={duplicateEstimate} disabled={duplicating}
                style={{ flex: 1, height: 48, borderRadius: 12, background: '#2563EB', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', opacity: duplicating ? 0.7 : 1 }}>
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENLARGE MODAL ── */}
      {enlargedOpening && (
        <div onClick={() => setEnlargedOpening(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
            <div style={{ width: 240, height: 240, margin: '0 auto', padding: 20, boxSizing: 'border-box' }}>
              <OpeningDrawing op={enlargedOpening} />
            </div>
            <button onClick={() => setEnlargedOpening(null)} style={{ padding: '10px 28px', background: '#F1F5F9', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
