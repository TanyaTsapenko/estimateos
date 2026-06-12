'use client'
import { useEffect, useState, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Phone, MessageCircle, Mail, MapPin, Calendar,
  FileText, PenLine, DollarSign, Receipt,
  Star, Plus, Pencil, Users, X,
} from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:          '#F3F4F6',
  card:        '#FFFFFF',
  border:      'rgba(15,23,42,0.08)',
  ink:         '#0B1220',
  inkMid:      '#475467',
  inkSoft:     '#8A94A6',
  blue:        '#2563EB',
  blueDeep:    '#1D4ED8',
  blueSoft:    '#EFF4FF',
  green:       '#16A34A',
  greenDeep:   '#0F8A4D',
  red:         '#C0341A',
  hero:        'linear-gradient(155deg, #2E6BF0 0%, #2152C9 55%, #1B43AE 100%)',
  amberText:   '#9A7B2E',
  amberBg:     '#FFFCF2',
  amberBorder: '#FBF3E0',
}

const PROJECT_STATUS = {
  won:       { color: '#16A34A', bg: '#E7F6EE', text: '#0F8A4D', label: 'Won' },
  lost:      { color: '#C0341A', bg: '#FBE9E4', text: '#C0341A', label: 'Lost' },
  scheduled: { color: '#2563EB', bg: '#EFF4FF', text: '#1D4ED8', label: 'Scheduled' },
} as const

const TONE = {
  blue:    { icon: '#2563EB', bg: 'rgba(37,99,235,0.15)',    line: 'rgba(37,99,235,0.3)' },
  green:   { icon: '#16A34A', bg: 'rgba(22,163,74,0.15)',    line: 'rgba(22,163,74,0.3)' },
  red:     { icon: '#C0341A', bg: 'rgba(192,52,26,0.15)',    line: 'rgba(192,52,26,0.3)' },
  amber:   { icon: '#D97706', bg: 'rgba(217,119,6,0.12)',    line: 'rgba(217,119,6,0.3)' },
  neutral: { icon: '#8A94A6', bg: 'rgba(138,148,166,0.12)',  line: '#E2E8F0' },
} as const

// ── Types ──────────────────────────────────────────────────────────────────────
interface Client {
  id: string; name: string; phone: string | null; email: string | null
  address: string | null; city: string | null; province: string | null
  postal_code: string | null; notes: string | null; created_at: string
}
interface Appointment {
  id: string; appointment_date: string; appointment_time: string | null
  status: string; notes: string | null; estimate_id: string | null
  lead_source: string | null; assigned_to: string | null
}
interface Estimate {
  id: string; estimate_number: string; status: string; total: number; created_at: string
  appointment_id: string | null
}
interface Contract { id: string; estimate_id: string; status: string }
interface Invoice  { id: string; estimate_id: string; amount: number; status: string; invoice_type: string }
interface Project  {
  appointment: Appointment
  estimate: Estimate | null
  contract: Contract | null
  depositInvoice: Invoice | null
  finalInvoice: Invoice | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12h(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00'))
}
function fmtDayDate(d: string) {
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(d + 'T00:00:00'))
}
function getProjectStatus(est: Estimate | null): keyof typeof PROJECT_STATUS {
  if (!est) return 'scheduled'
  if (est.status === 'signed' || est.status === 'invoiced' || est.status === 'paid') return 'won'
  if (est.status === 'declined' || est.status === 'expired') return 'lost'
  return 'scheduled'
}

// ── Step timeline (vertical) ───────────────────────────────────────────────────
function StepTimeline({ project, onCreateEstimate }: { project: Project; onCreateEstimate: () => void }) {
  const { estimate, contract, depositInvoice, finalInvoice } = project
  const status = getProjectStatus(estimate)

  if (!estimate) {
    return (
      <div>
        <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 12 }}>
          Scheduled — no estimate yet.
        </div>
        <button
          onClick={ev => { ev.stopPropagation(); onCreateEstimate() }}
          style={{ background: T.blueSoft, border: '1px solid rgba(37,99,235,0.15)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: T.blueDeep, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
        >
          + Create estimate
        </button>
      </div>
    )
  }

  type ToneKey = keyof typeof TONE
  type Step = { icon: React.ReactNode; label: string; sub: string; tone: ToneKey }

  const contractSigned = contract?.status === 'signed'
  const depositPaid    = depositInvoice?.status === 'paid'
  const finalPaid      = finalInvoice?.status === 'paid'

  const steps: Step[] = status === 'lost'
    ? [
        { icon: <FileText size={13} strokeWidth={1.7} />, label: estimate.estimate_number, sub: fmtCAD(estimate.total || 0), tone: 'blue' },
        { icon: <X size={13} strokeWidth={2} />, label: 'Declined', sub: 'Went with competitor', tone: 'red' },
      ]
    : [
        { icon: <FileText size={13} strokeWidth={1.7} />, label: estimate.estimate_number, sub: fmtCAD(estimate.total || 0), tone: 'blue' },
        { icon: <PenLine size={13} strokeWidth={1.7} />, label: 'Contract signed', sub: contractSigned ? 'Signed' : 'Pending', tone: contractSigned ? 'green' : 'neutral' },
        { icon: <DollarSign size={13} strokeWidth={1.7} />, label: 'Deposit', sub: depositInvoice ? `${fmtCAD(depositInvoice.amount)} · ${depositPaid ? 'Paid' : 'Unpaid'}` : 'Pending', tone: depositPaid ? 'green' : 'neutral' },
        { icon: <Receipt size={13} strokeWidth={1.7} />, label: 'Invoice', sub: finalInvoice ? `${fmtCAD(finalInvoice.amount)} · ${finalPaid ? 'Paid' : 'Unpaid'}` : 'Pending', tone: finalPaid ? 'green' : finalInvoice ? 'amber' : 'neutral' },
      ]

  return (
    <div>
      {steps.map((step, i) => {
        const tc = TONE[step.tone]
        const isLast = i === steps.length - 1
        return (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: tc.bg, color: tc.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {step.icon}
              </div>
              {!isLast && <div style={{ width: 1.5, height: 16, background: tc.line, marginTop: 3, marginBottom: 3 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 6, paddingTop: 4 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{step.label}</div>
              <div style={{ fontSize: 12, color: step.tone === 'neutral' ? T.inkSoft : tc.icon, marginTop: 2 }}>{step.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Project card ───────────────────────────────────────────────────────────────
function ProjectCard({ project, onViewEstimate, onCreateEstimate }: {
  project: Project
  onViewEstimate: (id: string) => void
  onCreateEstimate: (apptId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const a = project.appointment
  const e = project.estimate
  const pStatus = getProjectStatus(e)
  const sc = PROJECT_STATUS[pStatus]
  const workTitle = a.notes?.split('\n')[0]?.trim().slice(0, 60) || fmtDate(a.appointment_date)

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: '0 1px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'stretch', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', WebkitTapHighlightColor: 'transparent', padding: 0 }}
      >
        {/* Status rail */}
        <div style={{ width: 4, alignSelf: 'stretch', background: sc.color, flexShrink: 0 }} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: '13px 14px 13px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workTitle}
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
              {fmtDate(a.appointment_date)}
            </div>
          </div>

          {/* Status pill + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 7, background: sc.bg }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: sc.text, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{sc.label}</span>
            </div>
            <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }}>
              <ChevronDown size={16} color={T.inkSoft} />
            </div>
          </div>
        </div>
      </button>

      {/* Expandable body */}
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.26s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: `1px solid ${T.border}`, padding: 14 }}>
            {a.assigned_to && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Users size={13} color={T.inkMid} strokeWidth={1.7} />
                <span style={{ fontSize: 12.5, color: T.inkMid }}>{a.assigned_to}</span>
              </div>
            )}

            <StepTimeline
              project={project}
              onCreateEstimate={() => onCreateEstimate(a.id)}
            />

            {e && (
              <button
                onClick={ev => { ev.stopPropagation(); onViewEstimate(e.id) }}
                style={{ marginTop: 14, background: T.blueSoft, border: '1px solid rgba(37,99,235,0.12)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: T.blueDeep, cursor: 'pointer', fontFamily: 'inherit', display: 'block', width: '100%', textAlign: 'center' }}
              >
                View estimate →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params)
  const router   = useRouter()
  const supabase = createClient()

  const [client,       setClient]       = useState<Client | null>(null)
  const [projects,     setProjects]     = useState<Project[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [notes,        setNotes]        = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesSaving,  setNotesSaving]  = useState(false)
  const [notesSaved,   setNotesSaved]   = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [editOpen,     setEditOpen]     = useState(false)
  const [deleteOpen,   setDeleteOpen]   = useState(false)
  const [editSaving,   setEditSaving]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [editForm,     setEditForm]     = useState({ name: '', phone: '', email: '', address: '', city: '', province: '', postal_code: '' })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    async function load() {
      // Phase 1: client + appointments in parallel
      const [{ data: cl }, { data: appts }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('appointments')
          .select('id, appointment_date, appointment_time, status, notes, estimate_id, lead_source, assigned_to')
          .eq('client_id', clientId)
          .order('appointment_date', { ascending: false }),
      ])

      if (cl) { setClient(cl); setNotes(cl.notes || '') }
      const apptList = appts || []
      setAppointments(apptList)

      // Phase 2: estimates by appointment_id (estimates.client_id is not reliably set)
      const apptIds = apptList.map(a => a.id)
      const { data: ests } = apptIds.length
        ? await supabase.from('estimates')
            .select('id, estimate_number, status, total, created_at, appointment_id')
            .in('appointment_id', apptIds)
            .order('created_at', { ascending: false })
            .limit(20)
        : { data: [] as Estimate[] }

      const estList = ests || []

      // Phase 3: contracts + invoices by estimate IDs
      const estimateIds = estList.map(e => e.id)
      const [{ data: contracts }, { data: invoices }] = estimateIds.length
        ? await Promise.all([
            supabase.from('contracts').select('id, estimate_id, status').in('estimate_id', estimateIds),
            supabase.from('invoices').select('id, estimate_id, amount, status, invoice_type').in('estimate_id', estimateIds),
          ])
        : [{ data: [] as Contract[] }, { data: [] as Invoice[] }]

      const contractMap = new Map<string, Contract>()
      for (const c of contracts || []) contractMap.set(c.estimate_id, c)

      const invoiceMap = new Map<string, { deposit: Invoice | null; final: Invoice | null }>()
      for (const inv of invoices || []) {
        const cur = invoiceMap.get(inv.estimate_id) ?? { deposit: null, final: null }
        if (inv.invoice_type === 'deposit') cur.deposit = inv
        else cur.final = inv
        invoiceMap.set(inv.estimate_id, cur)
      }

      // Index estimates by appointment_id (primary) and by estimate id (fallback)
      const estByApptId = new Map<string, Estimate>()
      const estById     = new Map<string, Estimate>()
      for (const e of estList) {
        if (e.appointment_id) estByApptId.set(e.appointment_id, e)
        estById.set(e.id, e)
      }

      const built: Project[] = apptList.map(a => {
        const estimate = estByApptId.get(a.id) ?? (a.estimate_id ? estById.get(a.estimate_id) ?? null : null)
        const invs     = estimate ? (invoiceMap.get(estimate.id) ?? { deposit: null, final: null }) : { deposit: null, final: null }
        return {
          appointment: a,
          estimate,
          contract: estimate ? (contractMap.get(estimate.id) ?? null) : null,
          depositInvoice: invs.deposit,
          finalInvoice:   invs.final,
        }
      })
      setProjects(built)
      setLoading(false)
    }
    load()
  }, [clientId])

  const saveClient = useCallback(async () => {
    if (!client) return
    setEditSaving(true)
    await supabase.from('clients').update({
      name:        editForm.name.trim()        || client.name,
      phone:       editForm.phone.trim()       || null,
      email:       editForm.email.trim()       || null,
      address:     editForm.address.trim()     || null,
      city:        editForm.city.trim()        || null,
      province:    editForm.province.trim()    || null,
      postal_code: editForm.postal_code.trim() || null,
    }).eq('id', clientId)
    setClient(prev => prev ? { ...prev, ...editForm, name: editForm.name.trim() || prev.name } : prev)
    setEditSaving(false)
    setEditOpen(false)
  }, [editForm, clientId, client])

  const deleteClient = useCallback(async () => {
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', clientId)
    router.push('/dashboard/clients')
  }, [clientId])

  const saveNotes = useCallback(async () => {
    if (!client) return
    setNotesSaving(true)
    await supabase.from('clients').update({ notes }).eq('id', clientId)
    setNotesSaving(false)
    setNotesSaved(true)
    setEditingNotes(false)
    setTimeout(() => setNotesSaved(false), 2500)
  }, [notes, clientId, client])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkSoft, fontFamily: 'system-ui, sans-serif' }}>
      Loading…
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkSoft, fontFamily: 'system-ui, sans-serif' }}>
      Client not found.
    </div>
  )

  // Computed values
  const initials = client.name.trim().split(/\s+/).filter(Boolean)
    .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0].toUpperCase() : acc, '')
  const isRepeat   = projects.filter(p => ['signed', 'accepted', 'invoiced', 'paid'].includes(p.estimate?.status || '')).length > 1
  const fullAddr   = [client.address, client.city, client.province, client.postal_code].filter(Boolean).join(', ')
  const visits     = appointments.filter(a => a.status !== 'cancelled').length
  const lifetime   = projects.reduce((s, p) => s + (['signed', 'invoiced', 'paid'].includes(p.estimate?.status || '') ? (p.estimate!.total || 0) : 0), 0)
  const totalEsts  = projects.filter(p => p.estimate).length
  const signedEsts = projects.filter(p => ['signed', 'invoiced', 'paid'].includes(p.estimate?.status || '')).length
  const winRate    = totalEsts > 0 ? Math.round(signedEsts / totalEsts * 100) : null

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
  const nextVisit = [...appointments]
    .filter(a => new Date(a.appointment_date + 'T00:00:00') >= todayDate && a.status !== 'cancelled')
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0] ?? null

  const newApptParams = new URLSearchParams({
    prefill_name:      client.name,
    prefill_phone:     client.phone       || '',
    prefill_email:     client.email       || '',
    prefill_address:   client.address     || '',
    prefill_city:      client.city        || '',
    prefill_province:  client.province    || '',
    prefill_postal:    client.postal_code || '',
    prefill_client_id: clientId,
  })

  const hasPhone = !!client.phone
  const hasEmail = !!client.email
  const hasAddr  = !!fullAddr

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ background: T.hero, paddingLeft: 18, paddingRight: 18, paddingBottom: 20, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>

        {/* Top bar */}
        <div style={{ height: 42, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 4px 4px 0', color: '#fff' }}
          >
            <ChevronLeft size={22} color="#fff" strokeWidth={2} />
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', pointerEvents: 'none' }}>
            Client
          </div>
          <div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.75)', padding: '4px 0 4px 8px', letterSpacing: 3, fontFamily: 'inherit' }}
            >
              ···
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(15,23,42,0.18)', border: `1px solid ${T.border}`, overflow: 'hidden', minWidth: 180, zIndex: 50 }}>
                <button
                  onClick={() => { setMenuOpen(false); setEditForm({ name: client.name, phone: client.phone || '', email: client.email || '', address: client.address || '', city: client.city || '', province: client.province || '', postal_code: client.postal_code || '' }); setEditOpen(true) }}
                  style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: T.ink, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}
                >
                  <Pencil size={15} color={T.inkMid} strokeWidth={1.8} />
                  Edit client
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                  style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: T.red, textAlign: 'left' }}
                >
                  <X size={15} color={T.red} strokeWidth={2} />
                  Delete client
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Identity row */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Avatar */}
          <div style={{ width: 58, height: 58, borderRadius: 17, background: 'rgba(255,255,255,0.16)', border: '1.5px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 21, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            {initials || '?'}
          </div>

          {/* Name + badge + address */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', marginBottom: 4, overflow: 'hidden' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {client.name}
              </div>
              {isRepeat && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 8px', borderRadius: 99, background: 'rgba(255,255,255,0.18)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Star size={9} fill="#fff" strokeWidth={0} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>REPEAT CUSTOMER</span>
                </div>
              )}
            </div>
            {fullAddr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'rgba(255,255,255,0.62)' }}>
                <MapPin size={11} color="rgba(255,255,255,0.62)" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullAddr}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.12)', borderRadius: 14, display: 'flex' }}>
          {[
            { label: 'Visits',   value: String(visits) },
            { label: 'Lifetime', value: fmtCAD(lifetime) },
            { label: 'Win rate', value: winRate !== null ? `${winRate}%` : '—' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.16)' : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick comms: Call / Email / Text */}
        {(hasPhone || hasEmail) && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {hasPhone && (
              <a href={`tel:${client.phone}`} style={{ flex: 1, height: 42, borderRadius: 11, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                <Phone size={16} color={T.blueDeep} strokeWidth={1.8} />
                <span style={{ fontSize: 14, fontWeight: 700, color: T.blueDeep }}>Call</span>
              </a>
            )}
            {hasEmail && (
              <a href={`mailto:${client.email}`} style={{ width: 46, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                <Mail size={16} color="#fff" strokeWidth={1.8} />
              </a>
            )}
            {hasPhone && (
              <a href={`sms:${client.phone}`} style={{ flex: 1, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                <MessageCircle size={16} color="#fff" strokeWidth={1.8} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Text</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div>

        {/* Next visit card */}
        {nextVisit && (
          <div
            onClick={() => router.push(`/dashboard/appointments/${nextVisit.id}/edit`)}
            style={{ margin: '14px 16px 0', background: '#fff', border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.blue}`, borderRadius: 14, padding: '13px 14px', boxShadow: '0 4px 14px -10px rgba(15,23,42,0.3)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={19} color={T.blue} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: T.blue, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>NEXT VISIT</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>
                {fmtDayDate(nextVisit.appointment_date)}
                {nextVisit.appointment_time && <span style={{ fontWeight: 500 }}> · {fmt12h(nextVisit.appointment_time)}</span>}
              </div>
              {nextVisit.notes && (
                <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextVisit.notes}
                </div>
              )}
            </div>
            <ChevronRight size={16} color={T.inkSoft} strokeWidth={1.7} />
          </div>
        )}

        {/* Details card */}
        {(hasPhone || hasEmail || hasAddr) && (
          <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            {hasPhone && (
              <a
                href={`tel:${client.phone}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textDecoration: 'none', borderBottom: (hasEmail || hasAddr) ? `1px solid ${T.border}` : 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={16} color={T.blue} strokeWidth={1.7} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>PHONE</div>
                  <div style={{ fontSize: 14.5, color: T.ink }}>{client.phone}</div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.blue, flexShrink: 0 }}>Call</span>
              </a>
            )}
            {hasEmail && (
              <a
                href={`mailto:${client.email}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textDecoration: 'none', borderBottom: hasAddr ? `1px solid ${T.border}` : 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} color={T.inkMid} strokeWidth={1.7} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>EMAIL</div>
                  <div style={{ fontSize: 14.5, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
                </div>
              </a>
            )}
            {hasAddr && (
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddr)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', textDecoration: 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} color={T.inkSoft} strokeWidth={1.7} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>ADDRESS</div>
                  <div style={{ fontSize: 14.5, color: T.ink }}>{fullAddr}</div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Notes card */}
        <div style={{ margin: '12px 16px 0', background: T.amberBg, borderRadius: 16, border: `1px solid ${T.amberBorder}` }}>
          <div style={{ padding: '14px 15px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: T.amberText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>NOTES</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {notesSaved && <span style={{ fontSize: 11, fontWeight: 600, color: T.green }}>Saved</span>}
              {!editingNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  <Pencil size={12} color={T.amberText} strokeWidth={2} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.amberText }}>Edit</span>
                </button>
              ) : (
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={saveNotes}
                  disabled={notesSaving}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: T.amberText, fontFamily: 'inherit', opacity: notesSaving ? 0.6 : 1 }}
                >
                  {notesSaving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
          {editingNotes ? (
            <textarea
              autoFocus
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Gate codes, access info, preferences…"
              style={{ width: '100%', minHeight: 88, border: 'none', outline: 'none', resize: 'none', padding: '0 15px 14px', fontSize: 13.5, color: T.ink, lineHeight: 1.55, fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box' }}
            />
          ) : (
            <div
              onClick={() => setEditingNotes(true)}
              style={{ padding: '0 15px 14px', fontSize: 13.5, color: notes ? T.ink : T.inkSoft, lineHeight: 1.55, minHeight: 44, cursor: 'text' }}
            >
              {notes || 'Add notes about this client…'}
            </div>
          )}
        </div>

        {/* Project history header */}
        <div style={{ padding: '20px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PROJECT HISTORY</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.inkSoft }}>{projects.length}</span>
        </div>

        {/* Project cards */}
        <div style={{ padding: '0 16px 110px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.length === 0 ? (
            <div style={{ background: T.card, borderRadius: 16, padding: '28px 16px', textAlign: 'center', fontSize: 13, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              No projects yet
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard
                key={p.appointment.id}
                project={p}
                onViewEstimate={id => router.push(`/dashboard/estimates/${id}`)}
                onCreateEstimate={apptId => router.push(`/dashboard/estimates/new?appointment_id=${apptId}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        background: 'linear-gradient(to top, #FFFFFF 72%, transparent)',
        padding: '12px 16px 22px',
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push(`/dashboard/appointments/new?${newApptParams}`)}
          style={{
            width: '100%', height: 52, background: T.blue, border: 'none', borderRadius: 14,
            fontSize: 15.5, fontWeight: 700, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 24px -8px rgba(37,99,235,0.6)', fontFamily: 'inherit',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          New Appointment
        </button>
      </div>

      {/* ── EDIT CLIENT MODAL ── */}
      {editOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 540, padding: '20px 20px calc(20px + env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>Edit Client</span>
              <button onClick={() => setEditOpen(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={T.inkMid} />
              </button>
            </div>
            {([
              { key: 'name',        label: 'Name',        placeholder: 'Jane Smith',     type: 'text'  },
              { key: 'phone',       label: 'Phone',       placeholder: '(403) 555-0100', type: 'tel'   },
              { key: 'email',       label: 'Email',       placeholder: 'jane@email.com', type: 'email' },
              { key: 'address',     label: 'Address',     placeholder: '123 Maple St',   type: 'text'  },
              { key: 'city',        label: 'City',        placeholder: 'Calgary',        type: 'text'  },
              { key: 'province',    label: 'Province',    placeholder: 'AB',             type: 'text'  },
              { key: 'postal_code', label: 'Postal Code', placeholder: 'A1A 1A1',        type: 'text'  },
            ] as { key: keyof typeof editForm; label: string; placeholder: string; type: string }[]).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={editForm[f.key]}
                  placeholder={f.placeholder}
                  onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 10, padding: '11px 13px', fontSize: 15, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
            ))}
            <button
              onClick={saveClient}
              disabled={editSaving || !editForm.name.trim()}
              style={{ width: '100%', height: 48, background: T.blue, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: editSaving ? 0.7 : 1, marginTop: 4 }}
            >
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION ── */}
      {deleteOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDeleteOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Delete this client?</div>
            <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.5, marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteOpen(false)}
                style={{ flex: 1, height: 44, background: '#F3F4F6', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={deleteClient}
                disabled={deleting}
                style={{ flex: 1, height: 44, background: T.red, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
